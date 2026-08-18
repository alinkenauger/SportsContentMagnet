import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  Gift,
  Printer,
  RotateCcw,
  Target,
} from "lucide-react";

import {
  YouTubeSourcePlayer,
  type YouTubeSourcePlayerHandle,
} from "@/components/public-output";
import { PublicLibraryLink } from "@/components/public-library-link";
import { Button } from "@/components/ui/button";
import type { LibraryContext } from "@shared/library";
import {
  formatSourceTime,
  type ResolvedPresentationPreset,
} from "@shared/presentation";

interface SourceReference {
  label: string;
  startSeconds: number;
  endSeconds?: number;
}

interface ResultAction {
  title?: string;
  benefitSummary?: string;
  summary?: string;
  description?: string;
  url?: string;
  buttonLabel?: string;
  label?: string;
}

interface PrescriptionStep {
  title: string;
  action: string;
  why: string;
  timeframe: string;
  successCriteria: string;
  sourceRefs?: SourceReference[];
}

interface ImplementationAsset {
  type: "script" | "template" | "checklist" | "worksheet";
  title: string;
  description: string;
  instructions: string;
  content: string;
}

interface OutcomePrescription {
  strengths: string[];
  bottleneck: string;
  opportunity: string;
  watchout: string;
  quickWin: PrescriptionStep;
  nextSteps: PrescriptionStep[];
  mistakes: Array<{ mistake: string; correction: string }>;
  implementationAsset?: ImplementationAsset;
}

interface DiagnosticDimension {
  title: string;
  description: string;
  normalizedScore: number;
  direction: "low" | "balanced" | "high";
  label: string;
}

export interface EditorialQuizResultData {
  attemptId: string;
  outcome: {
    id: string;
    title: string;
    summary: string;
    description: string;
    recommendations: string[];
    prescription?: OutcomePrescription;
  };
  diagnostic?: {
    responsePattern: string;
    strongestSignal: DiagnosticDimension | null;
    dimensions: DiagnosticDimension[];
    answerEvidence: Array<{
      question: string;
      answer: string;
      answerInsight?: string;
      evidence?: string;
      sourceRefs?: SourceReference[];
    }>;
  };
  gift?: ResultAction | null;
  cta?: ResultAction | null;
}

interface EditorialQuizResultProps {
  result: EditorialQuizResultData;
  quizTitle: string;
  firstName?: string;
  brandName: string;
  brandTagline?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  onPrimaryColor: string;
  headingFontFamily?: string;
  bodyFontFamily?: string;
  headingRef: RefObject<HTMLHeadingElement>;
  implementationAssetCopied: boolean;
  onCopyImplementationAsset: () => void;
  onTrackAction: (kind: "gift" | "cta") => void;
  onPrint: () => void;
  onRetake: () => void;
  presentationPreset?: ResolvedPresentationPreset;
  library?: LibraryContext | null;
  sourceVideo?: {
    provider: "youtube";
    videoId: string;
    canonicalUrl: string;
    channelTitle?: string;
  } | null;
}

const SUPPORTED_GOOGLE_FONTS = new Set([
  "Inter",
  "Barlow Condensed",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Lato",
  "Poppins",
  "DM Sans",
]);

const SHOUTING_DISPLAY_FONT = /arial black|impact|haettenschweiler|blackoak/i;

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function withAlpha(color: string, alpha: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alpha}` : fallback;
}

function relativeLuminance(color: string) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (!match) return null;
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  if (foregroundLuminance === null || backgroundLuminance === null) return 0;
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function readableTextColor(background: string) {
  return contrastRatio("#000000", background) >= contrastRatio("#FFFFFF", background)
    ? "#000000"
    : "#FFFFFF";
}

function readableFont(font: string | undefined, fallback: string) {
  if (!font || SHOUTING_DISPLAY_FONT.test(font)) return fallback;
  return font;
}

function actionSummary(action: ResultAction | null | undefined) {
  return action?.benefitSummary || action?.summary || action?.description || "";
}

function conciseText(value: string, maximumLength = 260) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximumLength) return normalized;

  const sentences = normalized.match(/[^.!?]+[.!?]+/g) || [];
  const selected: string[] = [];
  for (const sentence of sentences) {
    const next = [...selected, sentence.trim()].join(" ");
    if (next.length > maximumLength) break;
    selected.push(sentence.trim());
    if (selected.length === 2) break;
  }
  if (selected.length) return selected.join(" ");

  const clipped = normalized.slice(0, maximumLength);
  return `${clipped.slice(0, Math.max(0, clipped.lastIndexOf(" ")))}…`;
}

function slugifyDownloadName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "training-resource";
}

function downloadImplementationAsset(
  asset: ImplementationAsset,
  filenameSuffix: string,
) {
  if (
    typeof document === "undefined"
    || typeof URL === "undefined"
    || typeof URL.createObjectURL !== "function"
  ) return;

  const downloadText = [
    asset.title.trim(),
    asset.description.trim() ? `WHY THIS HELPS\n${asset.description.trim()}` : "",
    asset.instructions.trim() ? `HOW TO USE IT\n${asset.instructions.trim()}` : "",
    asset.content.trim(),
  ].filter(Boolean).join("\n\n");
  const titleSlug = slugifyDownloadName(asset.title);
  const suffixSlug = slugifyDownloadName(filenameSuffix);
  const filename = titleSlug.includes(suffixSlug)
    ? `${titleSlug}.txt`
    : `${titleSlug}-${suffixSlug}.txt`;
  const objectUrl = URL.createObjectURL(new Blob([`\uFEFF${downloadText}\n`], {
    type: "text/plain;charset=utf-8",
  }));
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.hidden = true;
  link.setAttribute("aria-hidden", "true");

  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

function loadResultFonts(headingFontFamily?: string, bodyFontFamily?: string) {
  const families = new Set(["DM Sans", "IBM Plex Mono"]);
  [headingFontFamily, bodyFontFamily].forEach((font) => {
    if (font && SUPPORTED_GOOGLE_FONTS.has(font)) families.add(font);
  });
  const id = `vidmagnet-result-fonts-${Array.from(families).join("-").replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;

  const familyQuery = Array.from(families).map((font) => {
    const encoded = encodeURIComponent(font).replace(/%20/g, "+");
    if (font === "IBM Plex Mono") return `family=${encoded}:wght@500;600`;
    return `family=${encoded}:wght@400;500;600;700`;
  }).join("&");
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${familyQuery}&display=swap`;
  document.head.appendChild(link);
}

function SignalBar({
  score,
  color,
  label,
  trackColor,
}: {
  score: number;
  color: string;
  label: string;
  trackColor: string;
}) {
  const clamped = clampScore(score);
  return (
    <div
      className="mt-3 h-2 overflow-hidden rounded-full"
      style={{ backgroundColor: trackColor }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <span
        className="block h-full rounded-full"
        style={{ width: `${clamped}%`, backgroundColor: color }}
        aria-hidden="true"
      />
    </div>
  );
}

function DiagnosticRadar({
  dimensions,
  accentColor,
  textColor,
}: {
  dimensions: DiagnosticDimension[];
  accentColor: string;
  textColor: string;
}) {
  const displayed = dimensions.slice(0, 5);

  if (displayed.length < 3) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-label="Diagnostic profile">
        {displayed.map((dimension) => (
          <div key={dimension.title} className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-medium text-white/70">{dimension.title}</p>
            <p className="mt-2 text-4xl font-semibold text-white">
              {clampScore(dimension.normalizedScore)}
            </p>
            <p className="mt-1 text-xs text-white/55">{dimension.label}</p>
          </div>
        ))}
      </div>
    );
  }

  const centerX = 150;
  const centerY = 132;
  const radius = 82;
  const pointAt = (index: number, magnitude: number) => {
    const angle = ((Math.PI * 2 * index) / displayed.length) - (Math.PI / 2);
    return {
      x: centerX + Math.cos(angle) * radius * magnitude,
      y: centerY + Math.sin(angle) * radius * magnitude,
    };
  };
  const ringPoints = (magnitude: number) => displayed
    .map((_, index) => {
      const point = pointAt(index, magnitude);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  const scorePoints = displayed
    .map((dimension, index) => {
      const point = pointAt(index, clampScore(dimension.normalizedScore) / 100);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  const description = displayed
    .map((dimension) => `${dimension.title}: ${clampScore(dimension.normalizedScore)} out of 100`)
    .join(". ");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 sm:block">
      <svg
        viewBox="0 0 300 280"
        className="mx-auto w-full max-w-[220px] sm:max-w-[340px]"
        role="img"
        aria-labelledby="diagnostic-radar-title diagnostic-radar-description"
      >
        <title id="diagnostic-radar-title">Your diagnostic profile</title>
        <desc id="diagnostic-radar-description">{description}</desc>
        {[0.25, 0.5, 0.75, 1].map((magnitude) => (
          <polygon
            key={magnitude}
            points={ringPoints(magnitude)}
            fill="none"
            stroke="rgba(255,255,255,.16)"
            strokeWidth="1"
          />
        ))}
        {displayed.map((_, index) => {
          const point = pointAt(index, 1);
          return (
            <line
              key={index}
              x1={centerX}
              y1={centerY}
              x2={point.x}
              y2={point.y}
              stroke="rgba(255,255,255,.13)"
              strokeWidth="1"
            />
          );
        })}
        <polygon
          points={scorePoints}
          fill={withAlpha(accentColor, "52", "rgba(255,90,48,.32)")}
          stroke={accentColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {displayed.map((dimension, index) => {
          const point = pointAt(index, clampScore(dimension.normalizedScore) / 100);
          return (
            <circle
              key={dimension.title}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={textColor}
              stroke={accentColor}
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className="grid gap-y-3 sm:mt-1 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-2">
        {displayed.map((dimension) => (
          <div key={dimension.title} className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
            <span className="leading-4 text-white/65">{dimension.title}</span>
            <span className="font-semibold text-white">
              {clampScore(dimension.normalizedScore)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EditorialQuizResult({
  result,
  quizTitle,
  firstName,
  brandName,
  brandTagline,
  logoUrl,
  primaryColor,
  secondaryColor,
  accentColor,
  backgroundColor,
  surfaceColor,
  textColor,
  onPrimaryColor,
  headingFontFamily,
  bodyFontFamily,
  headingRef,
  implementationAssetCopied,
  onCopyImplementationAsset,
  onTrackAction,
  onPrint,
  onRetake,
  presentationPreset = "editorial",
  library,
  sourceVideo,
}: EditorialQuizResultProps) {
  const sourcePlayerRef = useRef<YouTubeSourcePlayerHandle>(null);
  const prescription = result.outcome.prescription;
  const diagnostic = result.diagnostic;
  const basketballMode = presentationPreset === "basketball";
  const performanceMode = presentationPreset === "performance";
  const arenaMode = basketballMode || performanceMode;
  const golfMode = presentationPreset === "golf";
  const implementationAssetExperience = basketballMode
    ? {
        eyebrow: "Court-ready workout sheet",
        downloadLabel: "Download workout sheet",
        filenameSuffix: "workout-sheet",
        copyLabel: "Copy sheet",
      }
    : golfMode
      ? {
          eyebrow: "Practice sheet",
          downloadLabel: "Download practice sheet",
          filenameSuffix: "practice-sheet",
          copyLabel: "Copy sheet",
        }
      : performanceMode
        ? {
            eyebrow: "Training sheet",
            downloadLabel: "Download training sheet",
            filenameSuffix: "training-sheet",
            copyLabel: "Copy sheet",
          }
        : null;

  const pageBackground = arenaMode ? "#F6F4EE" : backgroundColor;
  const pageSurface = arenaMode ? "#FFFFFF" : surfaceColor;
  const pageText = contrastRatio(textColor, pageBackground) >= 4.5
    ? textColor
    : readableTextColor(pageBackground);
  const surfaceText = contrastRatio(textColor, pageSurface) >= 4.5
    ? textColor
    : readableTextColor(pageSurface);
  const darkPanel = arenaMode ? "#090B10" : "#11151B";
  const darkPanelText = readableTextColor(darkPanel);
  const headingFont = readableFont(
    headingFontFamily,
    '"DM Sans", Inter, ui-sans-serif, sans-serif',
  );
  const bodyFont = readableFont(
    bodyFontFamily,
    '"DM Sans", Inter, ui-sans-serif, sans-serif',
  );
  const monoFont = '"IBM Plex Mono", ui-monospace, monospace';
  const safeOnPrimaryColor = contrastRatio(onPrimaryColor, primaryColor) >= 4.5
    ? onPrimaryColor
    : readableTextColor(primaryColor);
  const accentTextColor = contrastRatio(primaryColor, pageBackground) >= 4.5
    ? primaryColor
    : pageText;
  const darkAccentColor = contrastRatio(primaryColor, darkPanel) >= 3
    ? primaryColor
    : darkPanelText;
  const ruleColor = withAlpha(pageText, "24", "rgba(15,23,42,.14)");
  const softRuleColor = withAlpha(pageText, "14", "rgba(15,23,42,.08)");
  const trackColor = withAlpha(pageText, "18", "rgba(15,23,42,.1)");
  const resourceBandColor = darkPanel;
  const resourceBandTextColor = darkPanelText;
  const resourceAccentTextColor = darkAccentColor;
  const reportReference = result.attemptId.replace(/-/g, "").slice(0, 8).toUpperCase();

  useEffect(() => {
    loadResultFonts(headingFontFamily, bodyFontFamily);
  }, [bodyFontFamily, headingFontFamily]);

  const reportStyle = {
    "--report-paper": pageBackground,
    "--report-surface": pageSurface,
    "--report-ink": pageText,
    "--report-accent": primaryColor,
    "--report-secondary": secondaryColor,
    "--report-warm": accentColor,
    "--report-on-accent": safeOnPrimaryColor,
    "--report-heading-font": headingFont,
    "--report-body-font": bodyFont,
    "--report-mono-font": monoFont,
    backgroundColor: pageBackground,
    color: pageText,
    fontFamily: bodyFont,
  } as CSSProperties;

  const sourceMoments = useMemo(() => {
    const references = [
      ...(diagnostic?.answerEvidence.flatMap((item) => item.sourceRefs || []) || []),
      ...(prescription?.quickWin.sourceRefs || []),
      ...(prescription?.nextSteps.flatMap((step) => step.sourceRefs || []) || []),
    ];
    const seen = new Set<string>();
    return references.filter((reference) => {
      const key = `${Math.floor(reference.startSeconds)}:${reference.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((reference, index) => ({
      id: `result-source-${index}-${Math.floor(reference.startSeconds)}`,
      label: reference.label,
      seconds: reference.startSeconds,
      kind: "review" as const,
    })).slice(0, 6);
  }, [diagnostic?.answerEvidence, prescription]);

  const reviewSource = (reference: SourceReference) => {
    sourcePlayerRef.current?.jumpTo(reference.startSeconds, {
      autoplay: true,
      scrollIntoView: true,
      focusPlayer: true,
    });
  };

  const experienceCopy = basketballMode
    ? {
        result: "Your player profile",
        status: "Workout ready",
        source: "Film room review",
        prescription: "Your development plan",
      }
    : golfMode
      ? {
          result: "Your performance profile",
          status: "Practice plan ready",
          source: "Lesson review",
          prescription: "Your practice plan",
        }
      : {
          result: "Your result",
          status: "Plan ready",
          source: "Source lesson",
          prescription: "Your action plan",
        };

  const renderSourceActions = (refs?: SourceReference[]) => {
    if (!sourceVideo || !refs?.length) return null;
    return (
      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        {refs.map((reference) => (
          <button
            key={`${reference.label}-${reference.startSeconds}`}
            type="button"
            onClick={() => reviewSource(reference)}
            className="source-review-action inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors hover:bg-black/[.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              borderColor: ruleColor,
              color: accentTextColor,
              outlineColor: primaryColor,
            }}
          >
            <span aria-hidden="true">▶</span>
            Review at {formatSourceTime(reference.startSeconds)}
          </button>
        ))}
      </div>
    );
  };

  return (
    <main
      className="quiz-editorial-report min-h-screen"
      data-presentation={presentationPreset}
      style={reportStyle}
    >
      <style>{`
        .quiz-editorial-report .editorial-heading {
          font-family: var(--report-heading-font);
          overflow-wrap: anywhere;
          letter-spacing: -.035em;
        }
        .quiz-editorial-report .report-mono { font-family: var(--report-mono-font); }
        .quiz-editorial-report details > summary::-webkit-details-marker { display: none; }
        .quiz-editorial-report .result-hero { position: relative; isolation: isolate; }
        .quiz-editorial-report .result-hero::after {
          content: "";
          position: absolute;
          z-index: -1;
          inset: 0 0 0 auto;
          width: min(46%, 470px);
          opacity: .09;
          pointer-events: none;
          background:
            linear-gradient(90deg, transparent 49.5%, white 50%, transparent 50.5%),
            radial-gradient(circle at 112% 55%, transparent 0 38%, white 38.25% 38.75%, transparent 39%);
        }
        .quiz-editorial-report[data-presentation="golf"] .result-hero::after {
          border-radius: 50%;
          background:
            repeating-radial-gradient(ellipse at 100% 20%, transparent 0 31px, white 32px 33px);
        }
        .quiz-editorial-report[data-presentation="editorial"] .result-hero::after {
          background: radial-gradient(circle at 100% 0%, white 0 1px, transparent 1.5px);
          background-size: 22px 22px;
        }
        @media print {
          @page { margin: 0.55in; }
          .quiz-editorial-report { background: #fff !important; color: #101419 !important; }
          .quiz-editorial-report .report-shell { max-width: none !important; padding: 0 !important; }
          .quiz-editorial-report .report-sticky { position: static !important; }
          .quiz-editorial-report .report-dark,
          .quiz-editorial-report .result-hero {
            background: #fff !important;
            color: #101419 !important;
            border: 1px solid #d7d7d2 !important;
          }
          .quiz-editorial-report .report-dark *,
          .quiz-editorial-report .result-hero * { color: #101419 !important; }
          .quiz-editorial-report details > div { display: block !important; }
          .quiz-editorial-report section, .quiz-editorial-report li { break-inside: avoid; }
        }
      `}</style>

      <header
        className="report-sticky sticky top-0 z-40 border-b print:relative"
        style={{
          backgroundColor: withAlpha(pageSurface, "F2", pageSurface),
          borderColor: ruleColor,
          color: surfaceText,
          backdropFilter: "blur(14px)",
        }}
      >
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-3.5 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${brandName} logo`}
                className="h-7 max-w-[150px] object-contain"
              />
            ) : (
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: primaryColor }}
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{brandName}</p>
              {brandTagline ? (
                <p className="hidden truncate text-xs opacity-[.55] sm:block">{brandTagline}</p>
              ) : null}
            </div>
          </div>
          <div className="print:hidden flex items-center gap-1 sm:gap-3">
            <PublicLibraryLink
              library={library}
              className="h-11 rounded-full border px-3 text-xs"
              style={{ borderColor: ruleColor, color: surfaceText }}
            />
            <button
              type="button"
              onClick={onRetake}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors hover:bg-black/[.04] focus-visible:outline-none focus-visible:ring-2"
              style={{ outlineColor: primaryColor }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Retake</span>
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors hover:bg-black/[.04] focus-visible:outline-none focus-visible:ring-2"
              style={{ outlineColor: primaryColor }}
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </header>

      <div className="report-shell mx-auto max-w-[1120px] px-4 py-5 sm:px-7 sm:py-8 lg:py-10">
        <section
          id="verdict"
          className="result-hero scroll-mt-24 overflow-hidden rounded-[28px] px-5 py-7 text-white shadow-[0_20px_60px_rgba(9,11,16,.18)] sm:rounded-[34px] sm:px-9 sm:py-10 lg:px-12"
          style={{ backgroundColor: darkPanel, color: darkPanelText }}
          aria-labelledby="result-heading"
        >
          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.12fr_.88fr] lg:gap-12">
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span
                  className="inline-flex items-center gap-2 font-semibold"
                  style={{ color: darkAccentColor }}
                >
                  <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                  {experienceCopy.result}
                </span>
                <span className="text-white/35" aria-hidden="true">•</span>
                <span className="text-white/55">
                  {firstName?.trim() ? `Prepared for ${firstName.trim()}` : experienceCopy.status}
                </span>
              </div>
              <h1
                ref={headingRef}
                id="result-heading"
                tabIndex={-1}
                className="editorial-heading mt-5 max-w-[14ch] text-balance text-[2.25rem] font-semibold leading-[1.04] outline-none sm:text-[3rem]"
              >
                {result.outcome.title}
              </h1>
              <p className="mt-5 max-w-[36rem] text-balance text-lg font-medium leading-7 text-white/85 sm:text-xl sm:leading-8">
                {result.outcome.summary}
              </p>
              {result.outcome.description.trim() ? (
                <details className="group mt-4 max-w-[38rem] text-sm text-white/65">
                  <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 font-semibold text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                    Read the full result
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 whitespace-pre-line leading-6">{result.outcome.description}</p>
                </details>
              ) : null}
            </div>

            {diagnostic?.dimensions.length ? (
              <div className="lg:pl-4">
                <p className="text-center text-sm font-semibold text-white/72">Your diagnostic profile</p>
                <DiagnosticRadar
                  dimensions={diagnostic.dimensions}
                  accentColor={primaryColor}
                  textColor={darkPanelText}
                />
              </div>
            ) : (
              <div className="hidden items-center justify-center lg:flex" aria-hidden="true">
                <Target className="h-32 w-32 text-white/10" strokeWidth={1} />
              </div>
            )}
          </div>

          {prescription ? (
            <div className="relative z-10 mt-7 grid gap-5 rounded-[22px] bg-white p-5 text-[#14171B] sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <p className="text-sm font-semibold" style={{ color: primaryColor }}>Do this first</p>
                <h2 className="editorial-heading mt-1 text-2xl font-semibold leading-tight sm:text-[1.75rem]">
                  {prescription.quickWin.title}
                </h2>
                <p className="mt-2 max-w-[48rem] text-sm leading-6 text-[#14171B]/70">
                  {conciseText(prescription.quickWin.action, 190)}
                </p>
                <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#14171B]/55">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {prescription.quickWin.timeframe}
                </p>
              </div>
              <a
                href="#action"
                className="print:hidden inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  backgroundColor: primaryColor,
                  color: safeOnPrimaryColor,
                  outlineColor: primaryColor,
                }}
              >
                View my plan
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          ) : null}
        </section>

        {sourceVideo ? (
          <section className="py-12 sm:py-16" aria-label={experienceCopy.source}>
            <div className="mb-6 max-w-2xl">
              <p className="text-sm font-semibold" style={{ color: accentTextColor }}>{experienceCopy.source}</p>
              <h2 className="editorial-heading mt-2 text-3xl font-semibold sm:text-[2.1rem]">
                See the coaching behind your result
              </h2>
              <p className="mt-3 text-base leading-7 opacity-[.65]">
                Jump back to the exact moments that explain your diagnosis and drills.
              </p>
            </div>
            <YouTubeSourcePlayer
              id="source-video"
              ref={sourcePlayerRef}
              source={sourceVideo.canonicalUrl || sourceVideo.videoId}
              title={`${quizTitle} source video`}
              heading="Watch the source video"
              description="Choose a referenced moment or play the full lesson."
              channelTitle={sourceVideo.channelTitle}
              moments={sourceMoments}
              momentsLabel={basketballMode ? "Film moments" : golfMode ? "Lesson moments" : "Referenced moments"}
              scrollToPlayerOnSeek
              appearance={{
                tone: "light",
                surfaceColor: pageSurface,
                textColor: surfaceText,
                accentColor: primaryColor,
                onAccentColor: safeOnPrimaryColor,
                borderColor: ruleColor,
                borderRadius: 24,
              }}
              className="scroll-mt-24 border-0 p-0 shadow-none"
            />
          </section>
        ) : null}

        {diagnostic ? (
          <section
            id="signals"
            className="scroll-mt-24 border-t py-12 sm:py-16"
            style={{ borderColor: ruleColor }}
            aria-labelledby="signals-heading"
          >
            <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:gap-14">
              <div>
                <p className="text-sm font-semibold" style={{ color: accentTextColor }}>Your signals</p>
                <h2 id="signals-heading" className="editorial-heading mt-2 text-3xl font-semibold leading-tight sm:text-[2.1rem]">
                  What your answers revealed
                </h2>
                <p className="mt-4 max-w-[34rem] text-base leading-7 opacity-[.68]">
                  {diagnostic.responsePattern}
                </p>
                {diagnostic.strongestSignal ? (
                  <div className="mt-7 border-l-2 pl-4" style={{ borderColor: primaryColor }}>
                    <p className="text-sm font-semibold">Strongest signal</p>
                    <p className="mt-1 text-base font-semibold">{diagnostic.strongestSignal.title}</p>
                    <p className="mt-1 text-sm leading-6 opacity-[.65]">
                      {diagnostic.strongestSignal.label}. {diagnostic.strongestSignal.description}
                    </p>
                  </div>
                ) : null}
              </div>

              {diagnostic.dimensions.length > 0 ? (
                <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2">
                  {diagnostic.dimensions.map((dimension) => (
                    <article key={dimension.title} className="border-t pt-4" style={{ borderColor: ruleColor }}>
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="text-base font-semibold">{dimension.title}</h3>
                        <span className="report-mono text-sm font-semibold" style={{ color: accentTextColor }}>
                          {clampScore(dimension.normalizedScore)}
                        </span>
                      </div>
                      <SignalBar
                        score={dimension.normalizedScore}
                        color={primaryColor}
                        label={dimension.title}
                        trackColor={trackColor}
                      />
                      <p className="mt-3 text-sm font-semibold">{dimension.label}</p>
                      <p className="mt-1 text-sm leading-6 opacity-[.58]">{dimension.description}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <p className="mt-7 text-xs leading-5 opacity-[.45]">
              These are relative signals from your answers, not a clinical score, benchmark, or guarantee.
            </p>

            {diagnostic.answerEvidence.length > 0 ? (
              <div className="mt-9">
                <h3 className="editorial-heading text-xl font-semibold">Why this is your result</h3>
                <div className="mt-4 border-y" style={{ borderColor: ruleColor }}>
                  {diagnostic.answerEvidence.map((item, index) => (
                    <details
                      key={`${item.question}-${index}`}
                      className="quiz-answer-evidence group border-b last:border-b-0"
                      style={{ borderColor: softRuleColor }}
                    >
                      <summary
                        className="grid min-h-14 cursor-pointer list-none grid-cols-[26px_1fr_auto] items-center gap-3 py-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        style={{ outlineColor: primaryColor }}
                      >
                        <span className="report-mono text-xs opacity-[.38]">{index + 1}</span>
                        <span>{item.question}</span>
                        <ChevronDown className="h-4 w-4 opacity-[.45] transition-transform group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <div className="grid gap-3 pb-5 pl-[38px] text-sm leading-6 sm:grid-cols-2">
                        <p className="font-semibold">Your answer: {item.answer}</p>
                        <div>
                          {item.answerInsight ? <p>{item.answerInsight}</p> : null}
                          {item.evidence ? (
                            <p className="mt-2 text-xs leading-5 opacity-[.58]">
                              <strong>Why it matters:</strong> {item.evidence}
                            </p>
                          ) : null}
                          {renderSourceActions(item.sourceRefs)}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {prescription ? (
          <section
            id="action"
            className="scroll-mt-24 border-t py-12 sm:py-16"
            style={{ borderColor: ruleColor }}
            aria-labelledby="action-heading"
          >
            <div className="max-w-2xl">
              <p className="text-sm font-semibold" style={{ color: accentTextColor }}>{experienceCopy.prescription}</p>
              <h2 id="action-heading" className="editorial-heading mt-2 text-3xl font-semibold sm:text-[2.1rem]">
                Turn the result into your next workout
              </h2>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="border-t-2 pt-4" style={{ borderColor: secondaryColor }}>
                <h3 className="text-sm font-semibold">Strengths to use</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6">
                  {prescription.strengths.map((strength) => (
                    <li key={strength} className="flex gap-2.5">
                      <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: secondaryColor }} aria-hidden="true" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t-2 pt-4" style={{ borderColor: accentColor }}>
                <h3 className="text-sm font-semibold">Primary bottleneck</h3>
                <p className="mt-3 text-sm leading-6">{prescription.bottleneck}</p>
                <p className="mt-2 text-sm leading-6 opacity-[.62]">
                  <strong>Opportunity:</strong> {prescription.opportunity}
                </p>
              </div>
            </div>

            <div
              className="mt-10 overflow-hidden rounded-[24px] border"
              style={{ borderColor: ruleColor, backgroundColor: pageSurface, color: surfaceText }}
            >
              <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[.9fr_1.1fr] lg:gap-10">
                <div>
                  <p className="text-sm font-semibold" style={{ color: primaryColor }}>Do this first</p>
                  <h3 className="editorial-heading mt-2 text-2xl font-semibold leading-tight sm:text-[1.75rem]">
                    {prescription.quickWin.title}
                  </h3>
                  <p className="mt-4 text-sm leading-6">{prescription.quickWin.action}</p>
                  <div className="mt-5 flex flex-wrap gap-4 text-xs">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {prescription.quickWin.timeframe}
                    </span>
                    <span className="inline-flex items-center gap-2 opacity-[.65]">
                      <Target className="h-3.5 w-3.5" aria-hidden="true" />
                      {prescription.quickWin.successCriteria}
                    </span>
                  </div>
                  <p className="mt-4 border-l-2 pl-4 text-xs leading-5 opacity-[.64]" style={{ borderColor: primaryColor }}>
                    <strong>Why it works:</strong> {prescription.quickWin.why}
                  </p>
                  {renderSourceActions(prescription.quickWin.sourceRefs)}
                </div>

                <div className="border-t pt-6 lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0" style={{ borderColor: ruleColor }}>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="editorial-heading text-xl font-semibold">Your ordered action plan</h3>
                    <span className="text-xs opacity-[.45]">{prescription.nextSteps.length} steps</span>
                  </div>
                  <ol className="relative mt-5 space-y-0 before:absolute before:bottom-4 before:left-3 before:top-4 before:w-px before:bg-black/[.12]">
                    {prescription.nextSteps.map((step, index) => (
                      <li key={`${step.title}-${index}`} className="relative grid grid-cols-[26px_1fr] gap-3 pb-6 last:pb-0">
                        <span
                          className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: index === 0
                              ? withAlpha(primaryColor, "24", "rgba(255,85,0,.14)")
                              : "#ECECEA",
                            color: index === 0 ? primaryColor : "#555B62",
                          }}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h4 className="text-sm font-semibold">{step.title}</h4>
                            <span className="text-xs opacity-[.48]">{step.timeframe}</span>
                          </div>
                          <p className="mt-1 text-sm leading-6 opacity-[.72]">{step.action}</p>
                          <p className="mt-2 text-xs leading-5 opacity-[.55]">
                            <strong>Finish line:</strong> {step.successCriteria}
                          </p>
                          {renderSourceActions(step.sourceRefs)}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            {(prescription.watchout || prescription.mistakes.length > 0) ? (
              <details className="group mt-7 border-y" style={{ borderColor: ruleColor }}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" style={{ outlineColor: primaryColor }}>
                  What to watch for
                  <ChevronDown className="h-4 w-4 opacity-[.45] transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="pb-6">
                  {prescription.watchout ? <p className="max-w-3xl text-sm leading-6">{prescription.watchout}</p> : null}
                  {prescription.mistakes.length > 0 ? (
                    <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                      {prescription.mistakes.map((item) => (
                        <div key={item.mistake} className="text-sm leading-6">
                          <p><strong>Avoid:</strong> {item.mistake}</p>
                          <p className="mt-1 opacity-[.62]"><strong>Instead:</strong> {item.correction}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}
          </section>
        ) : result.outcome.recommendations?.length > 0 ? (
          <section id="action" className="border-t py-12" style={{ borderColor: ruleColor }}>
            <h2 className="editorial-heading text-3xl font-semibold">Your next steps</h2>
            <ol className="mt-6 space-y-4">
              {result.outcome.recommendations.map((recommendation, index) => (
                <li key={`${recommendation}-${index}`} className="grid grid-cols-[28px_1fr] gap-3 text-sm leading-6">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[.06] text-xs font-semibold">{index + 1}</span>
                  <p>{recommendation}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {prescription?.implementationAsset ? (
          <section
            id="tool"
            className="scroll-mt-24 border-t py-12 sm:py-16"
            style={{ borderColor: ruleColor }}
            aria-labelledby="tool-heading"
          >
            <div className="grid min-w-0 gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-12">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: accentTextColor }}>
                  {implementationAssetExperience
                    ? implementationAssetExperience.eyebrow
                    : "Ready-to-use tool"}
                </p>
                <h2 id="tool-heading" className="editorial-heading mt-2 text-3xl font-semibold leading-tight sm:text-[2.1rem]">
                  {prescription.implementationAsset.title}
                </h2>
                <p className="mt-4 text-sm leading-6 opacity-[.65]">
                  {prescription.implementationAsset.description}
                </p>
                <p className="mt-5 border-l-2 pl-4 text-sm leading-6" style={{ borderColor: primaryColor }}>
                  <strong>How to use it:</strong> {prescription.implementationAsset.instructions}
                </p>
                <div className="print:hidden mt-6 flex flex-col gap-2 sm:flex-row">
                  {implementationAssetExperience ? (
                    <Button
                      type="button"
                      onClick={() => downloadImplementationAsset(
                        prescription.implementationAsset!,
                        implementationAssetExperience.filenameSuffix,
                      )}
                      className="h-11 w-full rounded-full px-5 text-xs transition-opacity hover:opacity-85 sm:w-auto"
                      style={{ backgroundColor: primaryColor, color: safeOnPrimaryColor }}
                      aria-label={`${implementationAssetExperience.downloadLabel}: ${prescription.implementationAsset.title}`}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      {implementationAssetExperience.downloadLabel}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCopyImplementationAsset}
                    className="h-11 w-full rounded-full bg-transparent px-5 text-xs sm:w-auto"
                    aria-label={`Copy ${prescription.implementationAsset.title}`}
                  >
                    {implementationAssetCopied
                      ? <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    {implementationAssetCopied ? "Copied" : implementationAssetExperience?.copyLabel || "Copy tool"}
                  </Button>
                </div>
              </div>

              <div
                className="relative min-w-0 max-w-full overflow-hidden rounded-[22px] border bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,.06)] sm:p-7"
                style={{ borderColor: ruleColor }}
              >
                <div className="mb-4 flex items-center justify-between border-b pb-3 text-[#101419]" style={{ borderColor: "rgba(16,20,25,.1)" }}>
                  <span className="text-xs font-semibold">Your take-to-practice sheet</span>
                  <span className="report-mono text-[10px] opacity-[.42]">{reportReference}</span>
                </div>
                <pre className="report-mono max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-[#101419]">
                  {prescription.implementationAsset.content}
                </pre>
              </div>
            </div>
          </section>
        ) : null}

        {(result.gift || result.cta) ? (
          <section
            id="next-step"
            className="report-dark my-10 overflow-hidden rounded-[26px] px-5 py-8 sm:px-8 sm:py-9"
            style={{ backgroundColor: resourceBandColor, color: resourceBandTextColor }}
            aria-label="Matched next step"
          >
            <div className="grid gap-8 md:grid-cols-2 md:gap-0">
              {result.gift ? (
                <div className={result.cta ? "md:border-r md:pr-8" : ""} style={{ borderColor: "rgba(255,255,255,.14)" }}>
                  <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: resourceAccentTextColor }}>
                    <Gift className="h-4 w-4" aria-hidden="true" /> Matched free resource
                  </p>
                  <h2 className="editorial-heading mt-3 text-2xl font-semibold">
                    {result.gift.title || "A resource selected for you"}
                  </h2>
                  {actionSummary(result.gift) ? (
                    <p className="mt-3 text-sm leading-6 text-white/65">{actionSummary(result.gift)}</p>
                  ) : null}
                  {prescription ? (
                    <p className="mt-3 text-xs leading-5 text-white/55">
                      <strong className="text-white/75">Why it fits:</strong> {prescription.opportunity}
                    </p>
                  ) : null}
                  {result.gift.url ? (
                    <>
                      <a
                        href={result.gift.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onTrackAction("gift")}
                        className="print:hidden mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-3 text-xs font-semibold transition-opacity hover:opacity-85"
                        style={{ backgroundColor: primaryColor, color: safeOnPrimaryColor }}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {result.gift.buttonLabel || result.gift.label || "Get the free gift"}
                      </a>
                      <p className="report-mono mt-4 hidden break-all text-[9px] leading-4 print:block">Resource: {result.gift.url}</p>
                    </>
                  ) : null}
                </div>
              ) : null}

              {result.cta ? (
                <div className={result.gift ? "md:pl-8" : ""}>
                  <p className="text-sm font-semibold text-white/58">Your next move</p>
                  <h2 className="editorial-heading mt-3 text-2xl font-semibold">
                    {result.cta.title || "Take your next step"}
                  </h2>
                  {actionSummary(result.cta) ? (
                    <p className="mt-3 text-sm leading-6 text-white/65">{actionSummary(result.cta)}</p>
                  ) : null}
                  {prescription ? (
                    <p className="mt-3 text-xs leading-5 text-white/55">
                      <strong className="text-white/75">Why now:</strong> This is matched to the primary bottleneck in your result.
                    </p>
                  ) : null}
                  {result.cta.url ? (
                    <>
                      <a
                        href={result.cta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onTrackAction("cta")}
                        className="print:hidden mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 px-5 py-3 text-xs font-semibold transition-colors hover:bg-white hover:text-[#101419]"
                      >
                        {result.cta.buttonLabel || result.cta.label || "Take the next step"}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                      <p className="report-mono mt-4 hidden break-all text-[9px] leading-4 print:block">Next step: {result.cta.url}</p>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <footer className="flex flex-col gap-5 border-t py-8 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: ruleColor }}>
          <div>
            <p className="editorial-heading text-xl font-semibold">Keep the plan. Start with one move.</p>
            <p className="mt-1 max-w-xl text-xs leading-5 opacity-[.5]">
              Your answers created this result. Retaking the Interactive Quiz may produce a different plan.
            </p>
          </div>
          <div className="print:hidden flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={onPrint} className="h-11 rounded-full bg-transparent">
              <Printer className="h-4 w-4" /> Print or save PDF
            </Button>
            <Button variant="ghost" onClick={onRetake} className="h-11 rounded-full opacity-[.65] hover:bg-transparent hover:opacity-100">
              <RotateCcw className="h-4 w-4" /> Take it again
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}
