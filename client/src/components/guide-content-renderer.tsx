import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  Gauge,
  Lightbulb,
  ListChecks,
  Milestone,
  PenLine,
  PlayCircle,
  Printer,
  Table2,
  Target,
  Wrench,
} from "lucide-react";
import {
  normalizeGuideContent,
  type GuideBlock,
  type GuideContentV2,
} from "@shared/guideContent";
import { formatSourceTime, type ResolvedPresentationPreset } from "@shared/presentation";
import {
  YouTubeSourcePlayer,
  type YouTubeSourcePlayerHandle,
} from "@/components/public-output";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface GuideContentRendererProps {
  content: unknown;
  youtubeUrl?: string | null;
  youtubeChannelTitle?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headingFontFamily?: string;
  fontFamily?: string;
  surfaceColor?: string;
  textColor?: string;
  borderRadius?: string;
  className?: string;
  presentationPreset?: ResolvedPresentationPreset;
}

type StoredGuideProgress = {
  version: 1;
  completedItems: string[];
  worksheetValues: Record<string, string>;
};

const EMPTY_PROGRESS: StoredGuideProgress = {
  version: 1,
  completedItems: [],
  worksheetValues: {},
};

function contentFingerprint(content: GuideContentV2 | null) {
  if (!content) return "invalid";
  const value = JSON.stringify(content);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function progressStorageKey(content: GuideContentV2 | null) {
  return `vidmagnet:guide-progress:v1:${contentFingerprint(content)}`;
}

function readStoredProgress(storageKey: string): StoredGuideProgress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return EMPTY_PROGRESS;
    const value = JSON.parse(raw) as Partial<StoredGuideProgress>;
    if (value.version !== 1) return EMPTY_PROGRESS;
    const completedItems = Array.isArray(value.completedItems)
      ? value.completedItems.filter((item): item is string => typeof item === "string" && item.length <= 240).slice(0, 500)
      : [];
    const worksheetValues = value.worksheetValues && typeof value.worksheetValues === "object"
      ? Object.fromEntries(
          Object.entries(value.worksheetValues)
            .filter(([key, answer]) => key.length <= 240 && typeof answer === "string")
            .slice(0, 200)
            .map(([key, answer]) => [key, answer.slice(0, 20_000)]),
        )
      : {};
    return { version: 1, completedItems, worksheetValues };
  } catch {
    return EMPTY_PROGRESS;
  }
}

type BlockContext = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  borderRadius: string;
  completedItems: Set<string>;
  toggleChecklistItem: (id: string) => void;
  worksheetValues: Record<string, string>;
  setWorksheetValue: (id: string, value: string) => void;
  copiedTemplateId: string | null;
  copyTemplate: (id: string, body: string) => void;
  sourceAvailable: boolean;
  reviewSourceAt: (seconds: number) => void;
  presentationPreset: ResolvedPresentationPreset;
};

type GuideSourceRef = NonNullable<GuideContentV2["sections"][number]["sourceRefs"]>[number];
type GuideSection = GuideContentV2["sections"][number];
type GuideDrillBreakdown = NonNullable<GuideSection["drillBreakdown"]>;

function comparableText(value: string | undefined) {
  return (value || "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function meaningfullyDistinct(value: string | undefined, candidates: Array<string | undefined>) {
  const comparable = comparableText(value);
  if (!comparable) return false;
  return !candidates.some((candidate) => {
    const comparison = comparableText(candidate);
    if (!comparison) return false;
    if (comparable === comparison) return true;
    return comparable.length > 80 && comparison.length > 80 && (
      comparable.includes(comparison) || comparison.includes(comparable)
    );
  });
}

function distinctStrings(values: Array<string | undefined>) {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const trimmed = value?.trim();
    if (!trimmed) return [];
    const comparable = comparableText(trimmed);
    if (seen.has(comparable)) return [];
    seen.add(comparable);
    return [trimmed];
  });
}

function sourceRefsForBlock(block: GuideBlock): GuideSourceRef[] {
  if (block.type === "steps") return block.items.flatMap((item) => item.sourceRefs || []);
  if (block.type === "checklist") return block.items.flatMap((item) => item.sourceRefs || []);
  return [];
}

function sectionHasDrillMaterial(section: GuideSection) {
  return section.type === "drill"
    || Boolean(section.drillBreakdown)
    || section.blocks.some((block) => block.type === "steps");
}

function sectionContentIsDistinct(section: GuideSection) {
  const blockText = section.blocks.flatMap((block) => {
    if (block.type === "rich_text") return [block.text];
    if (block.type === "steps") return block.items.flatMap((item) => [item.title, item.instruction]);
    if (block.type === "callout") return [block.title, block.text];
    return [];
  });
  const breakdownText = section.drillBreakdown ? [
    section.drillBreakdown.painPoint,
    section.drillBreakdown.technique,
    section.drillBreakdown.keyFocus,
    section.drillBreakdown.focus,
    ...(section.drillBreakdown.tips || []),
    ...(section.drillBreakdown.verbalSteps || []),
  ] : [];
  return meaningfullyDistinct(section.content, [section.objective, ...breakdownText, ...blockText]);
}

function tint(hex: string, alpha: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex + alpha : "rgba(15, 23, 42, 0.06)";
}

function readableTextColor(background: string) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(background);
  if (!match) return "#FFFFFF";
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.05;
  return darkContrast >= whiteContrast ? "#0F172A" : "#FFFFFF";
}

function sectionIcon(type: GuideContentV2["sections"][number]["type"]) {
  switch (type) {
    case "drill":
      return Target;
    case "technique":
      return BookOpenCheck;
    case "equipment":
      return ClipboardCheck;
    default:
      return Lightbulb;
  }
}

function formatLabel(format: GuideContentV2["format"]) {
  return format.replace(/_/g, " ");
}

const DISPLAY_ACRONYMS: Record<string, string> = {
  ai: "AI",
  cta: "CTA",
  nba: "NBA",
  pdf: "PDF",
  sop: "SOP",
  usa: "USA",
};

function readableDisplayHeading(value: string, preset: ResolvedPresentationPreset): string {
  if (preset !== "basketball" && preset !== "performance") return value;
  const letters = value.match(/[A-Za-z]/g) || [];
  if (letters.length < 4) return value;
  const uppercaseShare = letters.filter((letter) => letter === letter.toUpperCase()).length / letters.length;
  if (uppercaseShare < 0.9) return value;

  const sentenceCase = value.toLocaleLowerCase().replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_match, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase()}`,
  );
  return sentenceCase.replace(
    /\b(ai|cta|nba|pdf|sop|usa)\b/gi,
    (token) => DISPLAY_ACRONYMS[token.toLocaleLowerCase()] || token,
  );
}

const PUBLIC_FONT_FAMILIES: Record<string, { stack: string; googleFamily?: string }> = {
  "Barlow Condensed": { stack: '"Barlow Condensed", Arial, sans-serif', googleFamily: "Barlow+Condensed:wght@400;500;600;700;800;900" },
  Inter: { stack: '"Inter", Arial, sans-serif', googleFamily: "Inter:wght@400;500;600;700;800" },
  Roboto: { stack: '"Roboto", Arial, sans-serif', googleFamily: "Roboto:wght@400;500;700;900" },
  "Open Sans": { stack: '"Open Sans", Arial, sans-serif', googleFamily: "Open+Sans:wght@400;500;600;700;800" },
  Montserrat: { stack: '"Montserrat", Arial, sans-serif', googleFamily: "Montserrat:wght@400;500;600;700;800" },
  Lato: { stack: '"Lato", Arial, sans-serif', googleFamily: "Lato:wght@400;700;900" },
  Poppins: { stack: '"Poppins", Arial, sans-serif', googleFamily: "Poppins:wght@400;500;600;700;800" },
  "DM Sans": { stack: '"DM Sans", Arial, sans-serif', googleFamily: "DM+Sans:wght@400;500;600;700;800" },
};

function publicFontStack(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (PUBLIC_FONT_FAMILIES[trimmed]) return PUBLIC_FONT_FAMILIES[trimmed].stack;
  if (trimmed.includes(",")) return trimmed;
  return `"${trimmed.replace(/["']/g, "")}", Arial, sans-serif`;
}

function publicFontStylesheet(fonts: Array<string | undefined>) {
  const families = Array.from(new Set(
    ["IBM+Plex+Mono:wght@500;600;700", ...fonts
      .map((font) => font?.trim())
      .filter((font): font is string => Boolean(font))
      .map((font) => PUBLIC_FONT_FAMILIES[font]?.googleFamily)
      .filter((family): family is string => Boolean(family))],
  ));
  return families.length
    ? `https://fonts.googleapis.com/css2?${families.map((family) => `family=${family}`).join("&")}&display=swap`
    : null;
}

function compactDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

type ReusableArtifactCopy = {
  sectionTitle: string;
  sectionDescription?: string;
  singularLabel: string;
  downloadLabel?: string;
  filenameSuffix?: string;
};

const reusableArtifactCopy: Record<ResolvedPresentationPreset, ReusableArtifactCopy> = {
  editorial: {
    sectionTitle: "Copy-ready templates",
    singularLabel: "template",
  },
  basketball: {
    sectionTitle: "Downloadable workout sheets",
    sectionDescription: "Bring the drill order, makes and reps, checkpoints, and session notes onto the court.",
    singularLabel: "workout sheet",
    downloadLabel: "Download workout sheet",
    filenameSuffix: "workout-sheet",
  },
  golf: {
    sectionTitle: "Downloadable practice sheets",
    sectionDescription: "Keep the session plan, targets, and results close while you practice.",
    singularLabel: "practice sheet",
    downloadLabel: "Download practice sheet",
    filenameSuffix: "practice-sheet",
  },
  performance: {
    sectionTitle: "Downloadable training sheets",
    sectionDescription: "Use the plan, checkpoints, and tracking fields during your next training session.",
    singularLabel: "training sheet",
    downloadLabel: "Download training sheet",
    filenameSuffix: "training-sheet",
  },
};

function safeDownloadName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 72) || "vidmagnet";
}

function downloadTextArtifact({
  title,
  purpose,
  body,
  example,
  filenameSuffix,
}: {
  title: string;
  purpose: string;
  body: string;
  example?: string;
  filenameSuffix: string;
}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const divider = "-".repeat(Math.min(Math.max(title.length, 16), 72));
  const contents = [
    title,
    divider,
    purpose.trim() ? `Purpose: ${purpose.trim()}` : "",
    body.trim(),
    example?.trim() ? `Example\n${example.trim()}` : "",
  ].filter(Boolean).join("\n\n");
  const blob = new Blob([`${contents}\n`], { type: "text/plain;charset=utf-8" });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const titleSlug = safeDownloadName(title);
  link.href = objectUrl;
  link.download = titleSlug.includes(filenameSuffix)
    ? `${titleSlug}.txt`
    : `${titleSlug}-${filenameSuffix}.txt`;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
}

function SourceReviewButtons({ refs, context }: { refs?: GuideSourceRef[]; context: BlockContext }) {
  if (!context.sourceAvailable || !refs?.length) return null;
  const reviewable = refs.filter((ref) => ref.startSeconds !== undefined);
  if (!reviewable.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2 print:hidden">
      {reviewable.map((ref) => (
        <button
          key={`${ref.label}-${ref.startSeconds}`}
          type="button"
          onClick={() => context.reviewSourceAt(ref.startSeconds as number)}
          className="guide-source-button inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ borderColor: tint(context.primaryColor, "35"), color: context.primaryColor }}
        >
          <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {ref.label}
          <span className="font-mono opacity-70">{formatSourceTime(ref.startSeconds as number)}</span>
        </button>
      ))}
    </div>
  );
}

function CoachBreakdown({
  breakdown,
  context,
}: {
  breakdown: GuideDrillBreakdown;
  context: BlockContext;
}) {
  const focusPoints = distinctStrings([breakdown.keyFocus, breakdown.focus]);
  const details = [
    breakdown.painPoint ? { label: "Problem this solves", text: breakdown.painPoint } : null,
    breakdown.technique ? { label: "Technique", text: breakdown.technique } : null,
    ...focusPoints.map((text) => ({ label: "Key focus", text })),
  ].filter((item): item is { label: string; text: string } => Boolean(item));
  const sessionDetails = [
    breakdown.repetitions ? { label: "Reps", value: breakdown.repetitions } : null,
    breakdown.duration ? { label: "Duration", value: breakdown.duration } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const verbalSteps = distinctStrings(breakdown.verbalSteps || []);
  const tips = distinctStrings(breakdown.tips || []);

  if (!details.length && !sessionDetails.length && !verbalSteps.length && !tips.length) return null;

  return (
    <section
      className="guide-coach-breakdown overflow-hidden border"
      style={{ borderColor: tint(context.primaryColor, "2D"), borderRadius: context.borderRadius }}
      aria-label="Coach's breakdown"
    >
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"
        style={{ borderColor: tint(context.primaryColor, "20"), backgroundColor: tint(context.primaryColor, "0C") }}
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4" style={{ color: context.primaryColor }} aria-hidden="true" />
          <h4 className="guide-block-heading text-lg font-semibold text-slate-900">Coach&apos;s breakdown</h4>
        </div>
        {sessionDetails.length ? (
          <dl className="flex flex-wrap gap-x-5 gap-y-2">
            {sessionDetails.map((item) => (
              <div key={item.label} className="flex items-baseline gap-2 text-xs">
                <dt className="guide-kicker font-bold text-slate-500">{item.label}</dt>
                <dd className="guide-mono font-semibold text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </header>

      {details.length ? (
        <div className="grid gap-px sm:grid-cols-3" style={{ backgroundColor: tint(context.primaryColor, "20") }}>
          {details.map((item, index) => (
            <article key={`${item.label}-${index}`} className="bg-white px-5 py-5">
              <p className="guide-kicker text-[10px] font-bold" style={{ color: context.primaryColor }}>{item.label}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{item.text}</p>
            </article>
          ))}
        </div>
      ) : null}

      {verbalSteps.length ? (
        <div className="border-t px-5 py-5" style={{ borderColor: tint(context.primaryColor, "20") }}>
          <p className="guide-kicker text-[10px] font-bold text-slate-500">Run it in this order</p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {verbalSteps.map((step, index) => (
              <li key={`${step}-${index}`} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 text-sm leading-6 text-slate-700">
                <span className="guide-mono font-bold" style={{ color: context.primaryColor }}>{String(index + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {tips.length ? (
        <div className="border-t px-5 py-5" style={{ borderColor: tint(context.primaryColor, "20"), backgroundColor: tint(context.secondaryColor, "0D") }}>
          <p className="guide-kicker text-[10px] font-bold text-slate-500">Coaching cues</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" style={{ color: context.secondaryColor }} aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function BlockRenderer({ block, blockKey, context }: {
  block: GuideBlock;
  blockKey: string;
  context: BlockContext;
}) {
  if (block.type === "rich_text") {
    return <p className="max-w-[68ch] whitespace-pre-line text-base leading-8 text-slate-700">{block.text}</p>;
  }

  if (block.type === "steps") {
    const blockTitle = block.title || (context.presentationPreset === "editorial" ? null : "Drill breakdown");
    return (
      <div className="guide-drill-sheet">
        {blockTitle ? (
          <div className="flex items-center gap-3">
            <span className="h-px w-8" style={{ backgroundColor: context.primaryColor }} aria-hidden="true" />
            <h4 className="guide-block-heading text-lg font-semibold text-slate-900">{blockTitle}</h4>
          </div>
        ) : null}
        <div
          className={`${blockTitle ? "mt-4" : ""} overflow-hidden border bg-white`}
          style={{ borderColor: tint(context.primaryColor, "28"), borderRadius: context.borderRadius }}
        >
          {block.items.map((step, index) => (
          <article
            key={step.id}
            className="guide-step-row grid gap-3 border-b p-5 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-5 sm:p-6"
            style={{ borderColor: tint(context.primaryColor, "1C") }}
          >
            <span className="guide-mono text-xl font-bold leading-none" style={{ color: context.primaryColor }}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h5 className="text-base font-semibold leading-6 text-slate-900">{step.title}</h5>
                {step.duration ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {step.duration}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 max-w-[66ch] whitespace-pre-line text-sm leading-6 text-slate-700">{step.instruction}</p>
              {step.why || step.successCriteria ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {step.why ? (
                    <div className="border-l-2 pl-3" style={{ borderColor: context.accentColor }}>
                      <p className="guide-kicker text-[11px] font-bold text-slate-500">Coaching cue</p>
                      <p className="mt-1 text-sm leading-5 text-slate-700">{step.why}</p>
                    </div>
                  ) : null}
                  {step.successCriteria ? (
                    <div className="border-l-2 pl-3" style={{ borderColor: context.secondaryColor }}>
                      <p className="guide-kicker text-[11px] font-bold text-slate-500">Rep counts when</p>
                      <p className="mt-1 text-sm leading-5 text-slate-700">{step.successCriteria}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {step.commonMistake || step.fix ? (
                <div
                  className="guide-diagnostic-inline mt-5 grid gap-px overflow-hidden border sm:grid-cols-2"
                  style={{ borderColor: tint(context.accentColor, "38"), backgroundColor: tint(context.accentColor, "38") }}
                >
                  {step.commonMistake ? (
                    <div className="bg-white p-3.5">
                      <p className="guide-kicker text-[10px] font-bold text-slate-500">Watch for</p>
                      <p className="mt-1.5 text-sm leading-6 text-slate-700">{step.commonMistake}</p>
                    </div>
                  ) : null}
                  {step.fix ? (
                    <div className="p-3.5" style={{ backgroundColor: tint(context.accentColor, "0D") }}>
                      <p className="guide-kicker text-[10px] font-bold" style={{ color: context.accentColor }}>Correction</p>
                      <p className="mt-1.5 text-sm leading-6 text-slate-700">{step.fix}</p>
                    </div>
                  ) : null}
                  </div>
              ) : null}
              <SourceReviewButtons refs={step.sourceRefs} context={context} />
            </div>
          </article>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "checklist") {
    if (context.presentationPreset !== "editorial") {
      return (
        <section
          className="guide-best-practices guide-dark-panel overflow-hidden border p-5 shadow-[0_20px_55px_rgba(9,11,16,.14)] sm:p-6"
          style={{ borderColor: "rgba(255,255,255,.12)", borderRadius: context.borderRadius, backgroundColor: "#101010" }}
          aria-label="Best practices"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" style={{ color: context.secondaryColor }} aria-hidden="true" />
                <h4 className="guide-block-heading text-xl font-semibold text-slate-900">Best practices</h4>
              </div>
              {block.title ? <p className="mt-1.5 text-sm text-slate-500">{block.title}</p> : null}
            </div>
            <span className="guide-kicker text-[10px] font-bold" style={{ color: context.primaryColor }}>Keep these cues</span>
          </div>
          <div className="mt-5 grid gap-px overflow-hidden border sm:grid-cols-2" style={{ borderColor: "rgba(255,255,255,.12)", backgroundColor: "rgba(255,255,255,.12)" }}>
            {block.items.map((item, index) => (
              <article key={item.id} className="guide-cue-row bg-[#101010] p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="guide-kicker mt-0.5 shrink-0 text-[10px] font-bold"
                    style={{ color: context.secondaryColor }}
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-6 text-slate-800">
                      {item.text}
                      {item.required ? <span className="ml-1" style={{ color: context.primaryColor }} aria-label="essential cue">•</span> : null}
                    </p>
                    {item.why ? <p className="mt-1 text-xs leading-5 text-slate-500">{item.why}</p> : null}
                    {item.evidence ? (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        <strong style={{ color: context.secondaryColor }}>Look for:</strong> {item.evidence}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="pl-8">
                  <SourceReviewButtons refs={item.sourceRefs} context={context} />
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section
        className="guide-dark-panel overflow-hidden border p-5 shadow-[0_20px_55px_rgba(9,11,16,.14)] sm:p-6"
        style={{ borderColor: "rgba(255,255,255,.12)", borderRadius: context.borderRadius, backgroundColor: "#101419" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" style={{ color: context.secondaryColor }} />
            <h4 className="guide-block-heading text-xl font-semibold text-slate-900">
              {block.title || (context.presentationPreset === "editorial" ? "Implementation checklist" : "Best practices")}
            </h4>
          </div>
          <span className="text-xs leading-5 text-slate-500">Save any cue you want to revisit.</span>
        </div>
        <div className="mt-5 grid gap-px overflow-hidden border sm:grid-cols-2" style={{ borderColor: "rgba(255,255,255,.12)", backgroundColor: "rgba(255,255,255,.12)" }}>
          {block.items.map((item) => {
            const itemKey = blockKey + ":" + item.id;
            const checked = context.completedItems.has(itemKey);
            return (
              <div key={item.id} className="guide-cue-row bg-[#101419] p-4">
              <button
                type="button"
                onClick={() => context.toggleChecklistItem(itemKey)}
                className="flex w-full items-start gap-3 text-left transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ outlineColor: context.primaryColor }}
                aria-pressed={checked}
              >
                <span
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border"
                  style={checked
                    ? { backgroundColor: context.secondaryColor, borderColor: context.secondaryColor, color: "white" }
                    : { borderColor: tint(context.primaryColor, "45") }}
                >
                  {checked ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className="min-w-0">
                  <span className={checked ? "text-sm font-medium text-slate-500 line-through" : "text-sm font-medium text-slate-800"}>
                    {item.text}
                    {item.required ? <span className="ml-1 text-rose-600" aria-label="required">*</span> : null}
                  </span>
                  {item.why ? <span className="mt-1 block text-xs leading-5 text-slate-500">{item.why}</span> : null}
                  {item.evidence ? <span className="mt-1 block text-xs leading-5 text-slate-500"><strong>Proof:</strong> {item.evidence}</span> : null}
                </span>
              </button>
              <div className="pl-8">
                <SourceReviewButtons refs={item.sourceRefs} context={context} />
              </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (block.type === "worksheet") {
    return (
      <div
        className="guide-paper border p-5 shadow-[0_18px_50px_rgba(9,11,16,.08)] sm:p-6"
        style={{ borderRadius: context.borderRadius, borderColor: tint(context.primaryColor, "24") }}
      >
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5" style={{ color: context.primaryColor }} />
          <h4 className="text-lg font-semibold text-slate-900">{block.title}</h4>
        </div>
        {block.instructions ? <p className="mt-2 text-sm leading-6 text-slate-600">{block.instructions}</p> : null}
        <div className="mt-5 space-y-5">
          {block.prompts.map((prompt) => {
            const promptKey = blockKey + ":" + prompt.id;
            const value = context.worksheetValues[promptKey] || "";
            return (
              <label key={prompt.id} className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">{prompt.prompt}</span>
                {prompt.responseType === "long_text" ? (
                  <Textarea
                    value={value}
                    onChange={(event) => context.setWorksheetValue(promptKey, event.target.value)}
                    placeholder={prompt.placeholder}
                    rows={4}
                  />
                ) : prompt.responseType === "choice" ? (
                  <select
                    value={value}
                    onChange={(event) => context.setWorksheetValue(promptKey, event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Choose an answer</option>
                    {(prompt.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : prompt.responseType === "rating" ? (
                  <span className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => context.setWorksheetValue(promptKey, rating.toString())}
                        aria-pressed={value === rating.toString()}
                        className="grid h-10 w-10 place-items-center rounded-lg border text-sm font-semibold"
                        style={value === rating.toString()
                          ? { backgroundColor: context.primaryColor, borderColor: context.primaryColor, color: "white" }
                          : { borderColor: tint(context.primaryColor, "35") }}
                      >
                        {rating}
                      </button>
                    ))}
                  </span>
                ) : (
                  <Input
                    type={prompt.responseType === "number" ? "number" : "text"}
                    value={value}
                    onChange={(event) => context.setWorksheetValue(promptKey, event.target.value)}
                    placeholder={prompt.placeholder}
                  />
                )}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "scorecard") {
    return (
      <div className="border-y py-5" style={{ borderColor: tint(context.primaryColor, "26") }}>
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5" style={{ color: context.secondaryColor }} />
          <h4 className="text-lg font-semibold text-slate-900">{block.title}</h4>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 sm:grid-cols-3">
          {block.metrics.map((metric) => (
            <article key={metric.id} className="border-t-2 pt-3" style={{ borderColor: context.primaryColor }}>
              {metric.target ? <p className="guide-mono text-xl font-bold text-slate-900">{metric.target}</p> : null}
              <p className={metric.target ? "mt-2 text-sm font-semibold text-slate-900" : "text-sm font-semibold text-slate-900"}>{metric.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{metric.measurement}</p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "example") {
    return (
      <div className="grid gap-x-6 gap-y-5 border-y py-5 sm:grid-cols-2" style={{ borderColor: tint(context.primaryColor, "26") }}>
        <div className="sm:col-span-2">
          <p className="guide-kicker text-xs font-bold text-slate-500">Scenario</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{block.scenario}</p>
        </div>
        <div className="border-l-2 pl-4" style={{ borderColor: context.secondaryColor }}>
          <p className="guide-kicker text-xs font-bold text-slate-500">Use this</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{block.good}</p>
        </div>
        {block.avoid ? (
          <div className="border-l-2 pl-4" style={{ borderColor: context.accentColor }}>
            <p className="guide-kicker text-xs font-bold text-slate-500">Avoid this</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{block.avoid}</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (block.type === "troubleshooting") {
    return (
      <section className="guide-diagnostic-matrix border-y py-5" style={{ borderColor: tint(context.primaryColor, "26") }}>
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5" style={{ color: context.accentColor }} />
          <h4 className="text-lg font-semibold text-slate-900">Common mistakes + fixes</h4>
        </div>
        <div className="mt-5 overflow-hidden border" style={{ borderColor: tint(context.primaryColor, "28") }}>
          <div className="guide-diagnostic-head hidden grid-cols-3 gap-px px-4 py-3 text-[10px] font-bold uppercase tracking-[.09em] sm:grid" style={{ backgroundColor: tint(context.primaryColor, "0D") }}>
            <span>Observation</span>
            <span>Likely cause</span>
            <span>Correction</span>
          </div>
          {block.items.map((item, index) => (
            <article
              key={item.problem + index}
              className="grid gap-3 border-t p-4 text-sm leading-6 first:border-t-0 sm:grid-cols-3 sm:gap-6"
              style={{ borderColor: tint(context.primaryColor, "1C") }}
            >
              <div>
                <p className="guide-kicker text-[10px] font-bold text-slate-500 sm:hidden">Observation</p>
                <p className="mt-1 font-semibold text-slate-900 sm:mt-0">{item.problem}</p>
              </div>
              <div>
                <p className="guide-kicker text-[10px] font-bold text-slate-500 sm:hidden">Likely cause</p>
                <p className="mt-1 text-slate-600 sm:mt-0">{item.cause || "—"}</p>
              </div>
              <div>
                <p className="guide-kicker text-[10px] font-bold sm:hidden" style={{ color: context.accentColor }}>Correction</p>
                <p className="mt-1 font-medium text-slate-700 sm:mt-0">{item.fix}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "table") {
    return (
      <div className="overflow-hidden border-y" style={{ borderColor: tint(context.primaryColor, "26") }}>
        {block.title ? (
          <div className="flex items-center gap-2 border-b px-1 py-4" style={{ borderColor: tint(context.primaryColor, "1C") }}>
            <Table2 className="h-5 w-5" style={{ color: context.primaryColor }} />
            <h4 className="font-semibold text-slate-900">{block.title}</h4>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead style={{ backgroundColor: tint(context.primaryColor, "0D") }}>
              <tr>{block.columns.map((column) => <th key={column} className="guide-kicker px-4 py-3 font-semibold text-slate-800">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 align-top text-slate-600">{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const calloutColor = block.tone === "warning"
    ? context.accentColor
    : block.tone === "insight"
      ? context.primaryColor
      : context.secondaryColor;
  const CalloutIcon = block.tone === "warning" ? AlertTriangle : Lightbulb;
  return (
    <div
      className="guide-cue-strip flex items-start gap-3 border-l-4 p-4 sm:p-5"
      style={{ borderColor: calloutColor, backgroundColor: tint(calloutColor, "0D") }}
    >
      <CalloutIcon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: calloutColor }} />
      <div>
        {block.title ? <h4 className="font-semibold text-slate-900">{block.title}</h4> : null}
        <p className={block.title ? "mt-1 whitespace-pre-line text-sm leading-6 text-slate-700" : "whitespace-pre-line text-sm leading-6 text-slate-700"}>{block.text}</p>
      </div>
    </div>
  );
}

export default function GuideContentRenderer({
  content,
  youtubeUrl,
  youtubeChannelTitle,
  primaryColor: requestedPrimaryColor = "#2563EB",
  secondaryColor: requestedSecondaryColor = "#10B981",
  accentColor: requestedAccentColor = "#F59E0B",
  headingFontFamily,
  fontFamily,
  surfaceColor: requestedSurfaceColor = "#FFFFFF",
  textColor: requestedTextColor = "#0F172A",
  borderRadius: requestedBorderRadius = "16px",
  className = "",
  presentationPreset = "editorial",
}: GuideContentRendererProps) {
  const isBasketball = presentationPreset === "basketball";
  const primaryColor = requestedPrimaryColor;
  const secondaryColor = requestedSecondaryColor;
  const accentColor = requestedAccentColor;
  const surfaceColor = isBasketball ? "#FFFAF0" : requestedSurfaceColor;
  const pageSurfaceColor = isBasketball ? "#F7F0E4" : requestedSurfaceColor;
  const textColor = isBasketball ? "#101010" : requestedTextColor;
  const borderRadius = isBasketball ? "18px" : requestedBorderRadius;
  const normalized = useMemo(() => {
    try {
      return normalizeGuideContent(content);
    } catch (error) {
      console.error("Could not render guide content", error);
      return null;
    }
  }, [content]);
  const storageKey = useMemo(() => progressStorageKey(normalized), [normalized]);
  const [completedItems, setCompletedItems] = useState<Set<string>>(
    () => new Set(readStoredProgress(storageKey).completedItems),
  );
  const [worksheetValues, setWorksheetValues] = useState<Record<string, string>>(
    () => readStoredProgress(storageKey).worksheetValues,
  );
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const sourcePlayerRef = useRef<YouTubeSourcePlayerHandle>(null);
  const loadedStorageKey = useRef(storageKey);
  const skipNextSave = useRef(false);
  const allSourceMoments = useMemo(() => {
    if (!normalized) return [];
    const moments = normalized.sections.flatMap((section) => {
      const sectionMoment = section.timestampSeconds === undefined ? [] : [{
        id: `${section.id}-${section.timestampSeconds}`,
        label: section.title,
        seconds: section.timestampSeconds,
        kind: "chapter" as const,
      }];
      const refs = [
        ...(section.sourceRefs || []),
        ...section.blocks.flatMap(sourceRefsForBlock),
      ].flatMap((ref, index) => ref.startSeconds === undefined ? [] : [{
        id: `${section.id}-review-${ref.startSeconds}-${index}`,
        label: ref.label,
        seconds: ref.startSeconds,
        kind: "review" as const,
      }]);
      return [...sectionMoment, ...refs];
    });
    const seen = new Set<number>();
    return moments.sort((first, second) => first.seconds - second.seconds).filter((moment) => {
      const key = Math.floor(moment.seconds);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [normalized]);
  const sourceMoments = allSourceMoments.slice(0, 8);

  const resolvedBodyFont = useMemo(
    () => publicFontStack(fontFamily, '"DM Sans", Arial, sans-serif'),
    [fontFamily],
  );
  const resolvedHeadingFont = useMemo(
    () => publicFontStack(headingFontFamily || fontFamily, resolvedBodyFont),
    [fontFamily, headingFontFamily, resolvedBodyFont],
  );
  const fontStylesheet = useMemo(
    () => publicFontStylesheet([fontFamily, headingFontFamily]),
    [fontFamily, headingFontFamily],
  );

  useEffect(() => {
    if (!fontStylesheet || typeof document === "undefined") return;
    const existing = document.querySelector<HTMLLinkElement>(`link[data-vidmagnet-guide-fonts="${fontStylesheet}"]`);
    if (existing) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontStylesheet;
    link.dataset.vidmagnetGuideFonts = fontStylesheet;
    document.head.appendChild(link);
  }, [fontStylesheet]);

  useEffect(() => {
    if (loadedStorageKey.current === storageKey) return;
    const stored = readStoredProgress(storageKey);
    skipNextSave.current = true;
    loadedStorageKey.current = storageKey;
    setCompletedItems(new Set(stored.completedItems));
    setWorksheetValues(stored.worksheetValues);
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    try {
      const stored: StoredGuideProgress = {
        version: 1,
        completedItems: Array.from(completedItems).slice(0, 500),
        worksheetValues: Object.fromEntries(
          Object.entries(worksheetValues)
            .slice(0, 200)
            .map(([key, answer]) => [key, answer.slice(0, 20_000)]),
        ),
      };
      window.localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch {
      // Storage can be unavailable in private browsing; the in-memory workbook still works.
    }
  }, [completedItems, storageKey, worksheetValues]);

  if (!normalized) {
    return (
      <div className={"rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 " + className}>
        This guide needs to be regenerated before its content can be displayed safely.
      </div>
    );
  }

  const artifactCopy = reusableArtifactCopy[presentationPreset];
  const artifactDownloadLabel = artifactCopy.downloadLabel;
  const artifactFilenameSuffix = artifactCopy.filenameSuffix;
  const artifactButtonTextColor = readableTextColor(primaryColor);
  const drillCount = normalized.sections.filter(sectionHasDrillMaterial).length;
  const diagnosticItems = normalized.sections.flatMap((section) => {
    const sourceSeconds = section.timestampSeconds
      ?? section.sourceRefs?.find((ref) => ref.startSeconds !== undefined)?.startSeconds;
    return section.blocks.flatMap((block) => block.type === "troubleshooting"
      ? block.items.map((item) => ({ ...item, sectionTitle: section.title, sourceSeconds }))
      : []);
  });
  const takeawayItems = normalized.sections.flatMap((section) => {
    const detail = section.objective || (sectionContentIsDistinct(section) ? section.content : undefined);
    return detail ? [{ title: section.title, detail }] : [];
  }).slice(0, 4);
  const valueProof = [
    drillCount > 0 ? {
      value: drillCount.toString(),
      label: drillCount === 1 ? "Drill breakdown" : "Drill breakdowns",
    } : null,
    youtubeUrl && allSourceMoments.length > 0 ? {
      value: allSourceMoments.length.toString(),
      label: allSourceMoments.length === 1 ? "Coached moment" : "Coached moments",
    } : null,
    normalized.templates?.length ? {
      value: normalized.templates.length.toString(),
      label: normalized.templates.length === 1 ? artifactCopy.singularLabel : artifactCopy.sectionTitle,
    } : null,
  ].filter((item): item is { value: string; label: string } => Boolean(item));

  const context: BlockContext = {
    primaryColor,
    secondaryColor,
    accentColor,
    borderRadius,
    completedItems,
    toggleChecklistItem: (id) => {
      setCompletedItems((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    worksheetValues,
    setWorksheetValue: (id, value) => setWorksheetValues((current) => ({ ...current, [id]: value })),
    copiedTemplateId,
    copyTemplate: async (id, body) => {
      try {
        await navigator.clipboard.writeText(body);
        setCopiedTemplateId(id);
        window.setTimeout(() => setCopiedTemplateId((current) => current === id ? null : current), 1800);
      } catch {
        setCopiedTemplateId(null);
      }
    },
    sourceAvailable: Boolean(youtubeUrl),
    reviewSourceAt: (seconds) => {
      const shouldScroll = typeof window === "undefined"
        ? true
        : !window.matchMedia("(min-width: 1024px)").matches;
      sourcePlayerRef.current?.jumpTo(seconds, {
        autoplay: true,
        scrollIntoView: shouldScroll,
        focusPlayer: true,
      });
    },
    presentationPreset,
  };

  const firstSectionHref = normalized.sections[0]
    ? `#guide-section-${normalized.sections[0].id}`
    : "#guide-session";
  const totalSectionSeconds = normalized.sections.reduce(
    (total, section) => total + (section.durationSeconds || 0),
    0,
  );
  const sessionTime = normalized.quickStart?.timeRequired
    || compactDuration(totalSectionSeconds)
    || "Self-paced";
  const heroProof = valueProof.length ? valueProof : [{ value: sessionTime, label: "Guide time" }];
  const sourceUsesDarkSurface = presentationPreset === "basketball" || presentationPreset === "performance";
  const sourcePanelSurface = isBasketball ? "#101010" : sourceUsesDarkSurface ? "#0B1018" : surfaceColor;
  const sourcePanelText = isBasketball ? "#FFFAF0" : sourceUsesDarkSurface ? "#F8FAFC" : textColor;
  const experienceLabel = presentationPreset === "basketball"
    ? "Court session"
    : presentationPreset === "golf"
      ? "Practice session"
      : presentationPreset === "performance"
        ? "Training session"
        : "Implementation guide";
  const sourceHeading = presentationPreset === "basketball"
    ? "Film room"
    : presentationPreset === "golf"
      ? "Lesson review"
      : presentationPreset === "performance"
        ? "Training review"
        : "Source lesson";

  return (
    <article
      className={"vidmagnet-guide-content " + className}
      data-presentation={presentationPreset}
      style={{
        fontFamily: resolvedBodyFont,
        color: textColor,
        backgroundColor: pageSurfaceColor,
        "--guide-text": /^#[0-9a-fA-F]{6}$/.test(textColor) ? textColor : "#0F172A",
        "--guide-muted": tint(textColor, "B3"),
        "--guide-subtle": tint(textColor, "8F"),
        "--guide-border": tint(textColor, "22"),
        "--guide-soft": tint(textColor, "0D"),
        "--guide-surface": surfaceColor,
        "--guide-paper": pageSurfaceColor,
        "--guide-chalk": isBasketball ? "#FFFAF0" : surfaceColor,
        "--guide-blacktop": isBasketball ? "#050505" : textColor,
        "--guide-primary": primaryColor,
        "--guide-on-primary": artifactButtonTextColor,
        "--guide-secondary": secondaryColor,
        "--guide-accent": accentColor,
        "--guide-heading-font": resolvedHeadingFont,
        "--guide-body-font": resolvedBodyFont,
      } as CSSProperties}
    >
      <style>{`
        .vidmagnet-guide-content {
          font-family: var(--guide-body-font);
          color: var(--guide-text);
        }
        .vidmagnet-guide-content .text-slate-950,
        .vidmagnet-guide-content .text-slate-900,
        .vidmagnet-guide-content .text-slate-800,
        .vidmagnet-guide-content .text-slate-700 { color: var(--guide-text) !important; }
        .vidmagnet-guide-content .text-slate-600 { color: var(--guide-muted) !important; }
        .vidmagnet-guide-content .text-slate-500 { color: var(--guide-subtle) !important; }
        .vidmagnet-guide-content .border-slate-200 { border-color: var(--guide-border) !important; }
        .vidmagnet-guide-content .bg-slate-50,
        .vidmagnet-guide-content .bg-slate-100 { background-color: var(--guide-soft) !important; }
        .vidmagnet-guide-content .guide-paper,
        .vidmagnet-guide-content .guide-paper .bg-white {
          --guide-text: #0f172a;
          --guide-muted: #475569;
          --guide-subtle: #64748b;
          --guide-border: #e2e8f0;
          --guide-soft: #f8fafc;
          background-color: #fff;
          color: #0f172a;
        }
        .vidmagnet-guide-content .guide-paper input,
        .vidmagnet-guide-content .guide-paper textarea,
        .vidmagnet-guide-content .guide-paper select {
          background: #fff;
          color: #0f172a;
        }
        .vidmagnet-guide-content .guide-display,
        .vidmagnet-guide-content .guide-block-heading {
          font-family: var(--guide-heading-font);
          letter-spacing: -.035em;
          text-wrap: balance;
        }
        .vidmagnet-guide-content .guide-mono {
          font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-variant-numeric: tabular-nums;
        }
        .vidmagnet-guide-content .guide-kicker {
          letter-spacing: .09em;
          text-transform: uppercase;
        }
        .vidmagnet-guide-content details > summary::-webkit-details-marker { display: none; }
        .vidmagnet-guide-content .guide-workbench {
          display: grid;
          grid-template-areas: "hero" "source" "body";
          column-gap: clamp(2rem, 4vw, 4.5rem);
          row-gap: clamp(2.5rem, 5vw, 4.5rem);
        }
        .vidmagnet-guide-content .guide-workbench-hero { grid-area: hero; }
        .vidmagnet-guide-content .guide-source-dock { grid-area: source; min-width: 0; }
        .vidmagnet-guide-content .guide-workbench-body { grid-area: body; min-width: 0; }
        .vidmagnet-guide-content .guide-source-button {
          border-radius: 999px;
          letter-spacing: 0;
          text-transform: none;
        }
        .vidmagnet-guide-content .guide-dark-panel .text-slate-950,
        .vidmagnet-guide-content .guide-dark-panel .text-slate-900,
        .vidmagnet-guide-content .guide-dark-panel .text-slate-800,
        .vidmagnet-guide-content .guide-dark-panel .text-slate-700 { color: #f8fafc !important; }
        .vidmagnet-guide-content .guide-dark-panel .text-slate-600,
        .vidmagnet-guide-content .guide-dark-panel .text-slate-500 { color: #cbd5e1 !important; }
        .vidmagnet-guide-content .guide-dark-panel .guide-source-button { color: #f8fafc !important; }
        .vidmagnet-guide-content .guide-major-heading {
          display: grid;
          grid-template-columns: auto minmax(2rem, 1fr);
          align-items: center;
          gap: 1rem;
        }
        .vidmagnet-guide-content .guide-major-heading::after {
          content: "";
          height: 1px;
          background: var(--guide-text);
          opacity: .72;
        }
        .vidmagnet-guide-content .guide-principle-sequence {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr));
        }
        .vidmagnet-guide-content .guide-section-layout {
          display: grid;
          gap: 1.75rem;
        }
        .vidmagnet-guide-content .guide-section--paper {
          border: 1px solid var(--guide-border);
          border-radius: 20px;
          background: var(--guide-soft);
          padding: clamp(1.25rem, 3vw, 2.5rem);
        }
        .vidmagnet-guide-content .guide-cue-strip { border-radius: 0 14px 14px 0; }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero,
        .vidmagnet-guide-content[data-presentation="performance"] .guide-workbench-hero {
          position: relative;
          isolation: isolate;
          overflow: hidden;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] {
          --guide-text: #101010 !important;
          --guide-muted: #5e574d !important;
          --guide-subtle: #756d62 !important;
          --guide-border: rgba(16,16,16,.18) !important;
          --guide-soft: #fffaf0 !important;
          background: var(--guide-paper);
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-display,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-block-heading {
          font-weight: 800;
          letter-spacing: -.025em;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-kicker {
          font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          letter-spacing: .105em;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench {
          column-gap: clamp(.75rem, 1.5vw, 1.25rem);
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero {
          min-height: 100%;
          padding: clamp(1.5rem, 3vw, 2.75rem) !important;
          border: 1px solid color-mix(in srgb, var(--guide-primary) 36%, transparent) !important;
          border-radius: 22px;
          background:
            linear-gradient(138deg, color-mix(in srgb, var(--guide-primary) 10%, transparent), transparent 45%),
            var(--guide-blacktop);
          box-shadow: 0 24px 70px rgba(5,5,5,.22);
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero > * {
          position: relative;
          z-index: 1;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero::before {
          content: "";
          position: absolute;
          z-index: 0;
          top: 0;
          right: clamp(1.5rem, 4vw, 4rem);
          width: 4rem;
          height: .32rem;
          background: linear-gradient(90deg, var(--guide-primary) 0 62%, var(--guide-accent) 62% 78%, var(--guide-secondary) 78%);
          transform: skewX(-28deg);
          transform-origin: top;
          pointer-events: none;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero::after {
          content: "";
          position: absolute;
          z-index: 0;
          width: 300px;
          height: 300px;
          right: -190px;
          bottom: -130px;
          border: 1px solid color-mix(in srgb, var(--guide-secondary) 34%, transparent);
          border-radius: 50%;
          box-shadow: 0 0 0 32px color-mix(in srgb, var(--guide-primary) 5%, transparent);
          pointer-events: none;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero h1 {
          max-width: 11ch !important;
          font-size: clamp(3.1rem, 5.5vw, 5.5rem) !important;
          line-height: .9 !important;
          color: var(--guide-chalk) !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-950,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-900,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-800,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-700 {
          color: var(--guide-chalk) !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-600,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-500 {
          color: rgba(255,250,240,.7) !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .guide-proof-strip {
          border-color: rgba(255,250,240,.2) !important;
          background: rgba(255,250,240,.035);
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .guide-proof-strip > div {
          border-left-color: rgba(255,250,240,.16) !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .guide-proof-strip dt {
          color: rgba(255,250,240,.62) !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .guide-proof-strip dd {
          color: var(--guide-secondary) !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-source-inner {
          border-color: color-mix(in srgb, var(--guide-primary) 42%, transparent) !important;
          box-shadow: 0 24px 70px rgba(5,5,5,.24) !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-source-inner > section > nav ol button[aria-pressed="true"] {
          background: var(--guide-primary) !important;
          border-color: var(--guide-primary) !important;
          color: #050505 !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-major-heading::after {
          height: 2px;
          background: var(--guide-primary);
          opacity: 1;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-major-heading h2 {
          font-size: clamp(2.5rem, 4.5vw, 3.6rem) !important;
          line-height: .95 !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-technique-path,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-technique-path li,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-section--paper,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-step-row,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-milestone,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-coach-breakdown article,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-paper,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-paper .bg-white {
          background: var(--guide-chalk) !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-technique-path {
          border-color: color-mix(in srgb, var(--guide-primary) 30%, transparent) !important;
          box-shadow: 8px 8px 0 color-mix(in srgb, var(--guide-primary) 10%, transparent);
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-section--paper {
          border-color: color-mix(in srgb, var(--guide-primary) 46%, transparent) !important;
          box-shadow: 9px 9px 0 color-mix(in srgb, var(--guide-primary) 8%, transparent);
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-coach-breakdown,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-drill-sheet > div:last-child,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workout > div:last-child {
          border-color: color-mix(in srgb, var(--guide-primary) 34%, transparent) !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-coach-breakdown > header {
          background: color-mix(in srgb, var(--guide-primary) 12%, var(--guide-chalk)) !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-best-practices {
          background: #101010 !important;
          border-color: color-mix(in srgb, var(--guide-secondary) 34%, transparent) !important;
          box-shadow: 9px 9px 0 color-mix(in srgb, var(--guide-accent) 16%, transparent);
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-best-practices .guide-cue-row {
          background: #101010 !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-dark-panel {
          background: #101010 !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-workout .guide-milestone {
          border-top: 4px solid var(--guide-primary);
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-artifact .guide-paper {
          border-color: color-mix(in srgb, var(--guide-primary) 56%, transparent) !important;
          box-shadow: 10px 10px 0 color-mix(in srgb, var(--guide-secondary) 20%, transparent) !important;
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-playbook-footer {
          border: 0 !important;
          border-left: 6px solid var(--guide-primary) !important;
          border-radius: 0 18px 18px 0;
          background: #101010 !important;
          box-shadow: 9px 9px 0 color-mix(in srgb, var(--guide-secondary) 18%, transparent);
        }
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-playbook-footer .text-slate-950,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-playbook-footer .text-slate-900,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-playbook-footer .text-slate-800,
        .vidmagnet-guide-content[data-presentation="basketball"] .guide-playbook-footer .text-slate-700 {
          color: var(--guide-chalk) !important;
        }
        .vidmagnet-guide-content[data-presentation="golf"] .guide-display {
          letter-spacing: -.025em;
        }
        @media (min-width: 1024px) {
          .vidmagnet-guide-content .guide-workbench {
            grid-template-columns: minmax(310px, .72fr) minmax(0, 1.28fr);
            grid-template-areas: "hero source" "body body";
            align-items: start;
          }
          .vidmagnet-guide-content .guide-workbench--solo {
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas: "hero" "body";
          }
          .vidmagnet-guide-content .guide-source-inner > section {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas: "source-head" "source-video" "source-privacy" "source-moments";
            align-items: start;
          }
          .vidmagnet-guide-content .guide-source-inner > section > div:first-of-type { grid-area: source-head; }
          .vidmagnet-guide-content .guide-source-inner > section > div:nth-of-type(2) { grid-area: source-video; }
          .vidmagnet-guide-content .guide-source-inner > section > p:not(.sr-only) { grid-area: source-privacy; }
          .vidmagnet-guide-content .guide-source-inner > section > nav {
            grid-area: source-moments;
            margin-top: 1.25rem !important;
            padding-top: 1rem;
            border-top: 1px solid color-mix(in srgb, var(--guide-primary) 34%, transparent);
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav > p {
            display: flex;
            align-items: center;
            gap: .75rem;
            font-family: var(--guide-heading-font);
            font-size: 1.05rem !important;
            font-weight: 700 !important;
            letter-spacing: -.01em !important;
            line-height: 1.2;
            text-transform: none !important;
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav > p::after {
            content: "";
            height: 1px;
            flex: 1;
            background: color-mix(in srgb, var(--guide-primary) 44%, transparent);
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: .65rem !important;
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol button {
            display: grid !important;
            grid-template-columns: 2rem minmax(0, 1fr);
            grid-template-areas: "moment-play moment-time" "moment-play moment-label";
            min-height: 4.65rem !important;
            column-gap: .65rem !important;
            row-gap: .15rem;
            align-items: center !important;
            border-width: 1px !important;
            border-color: color-mix(in srgb, var(--guide-primary) 34%, transparent) !important;
            border-radius: 12px !important;
            background: color-mix(in srgb, var(--guide-primary) 7%, transparent) !important;
            padding: .75rem !important;
            cursor: pointer;
            transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease !important;
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol button::before {
            content: "▶";
            grid-area: moment-play;
            display: grid;
            width: 2rem;
            height: 2rem;
            place-items: center;
            border-radius: 999px;
            background: var(--guide-primary);
            color: var(--guide-on-primary);
            font-size: .66rem;
            line-height: 1;
            padding-left: .08rem;
            box-shadow: 0 6px 18px color-mix(in srgb, var(--guide-primary) 22%, transparent);
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol button > span:first-child {
            grid-area: moment-time;
            margin-top: 0 !important;
            color: var(--guide-primary);
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol button > span:last-child {
            grid-area: moment-label;
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol button:hover {
            transform: translateY(-2px);
            border-color: var(--guide-primary) !important;
            background: color-mix(in srgb, var(--guide-primary) 13%, transparent) !important;
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol button[aria-pressed="true"]::before {
            background: var(--guide-blacktop);
            color: var(--guide-chalk);
          }
          .vidmagnet-guide-content .guide-section-layout {
            grid-template-columns: minmax(230px, .72fr) minmax(0, 1.55fr);
            gap: clamp(2.25rem, 5vw, 5rem);
          }
        }
        @media (max-width: 639px) {
          .vidmagnet-guide-content .guide-workbench { row-gap: 2.5rem; }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: .45rem;
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol > li:nth-child(n+5) {
            display: none;
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol button {
            min-height: 0;
            height: 100%;
            gap: .45rem;
            padding: .6rem;
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol button > span:first-child {
            gap: .2rem;
            font-size: .65rem;
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol button > span:last-child > span:first-child {
            display: none;
          }
          .vidmagnet-guide-content .guide-source-inner > section > nav ol button > span:last-child > span:nth-child(2) {
            font-size: .72rem;
            line-height: 1rem;
          }
          .vidmagnet-guide-content .guide-mobile-source-note { display: block; }
        }
        @media print {
          .vidmagnet-guide-content {
            background: #fff !important;
            color: #101419 !important;
            --guide-text: #101419 !important;
            --guide-muted: #475569 !important;
            --guide-subtle: #64748b !important;
            --guide-border: #d7dce2 !important;
          }
          .vidmagnet-guide-content .guide-workbench { display: block !important; }
          .vidmagnet-guide-content .guide-source-dock,
          .vidmagnet-guide-content .guide-print-hide { display: none !important; }
          .vidmagnet-guide-content .guide-section,
          .vidmagnet-guide-content .guide-paper,
          .vidmagnet-guide-content .guide-coach-breakdown,
          .vidmagnet-guide-content .guide-diagnostic-matrix,
          .vidmagnet-guide-content .guide-milestone { break-inside: avoid; }
          .vidmagnet-guide-content .guide-paper { box-shadow: none !important; }
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-dark-panel,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-best-practices,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-best-practices .guide-cue-row,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-playbook-footer {
            background: #fff !important;
            color: #101419 !important;
            box-shadow: none !important;
            border-color: #d7dce2 !important;
          }
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero::before,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero::after { display: none !important; }
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-950,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-900,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-800,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-700,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-dark-panel .text-slate-950,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-dark-panel .text-slate-900,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-dark-panel .text-slate-800,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-dark-panel .text-slate-700,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-playbook-footer .text-slate-950,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-playbook-footer .text-slate-900,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-playbook-footer .text-slate-800,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-playbook-footer .text-slate-700 {
            color: #101419 !important;
          }
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-600,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .text-slate-500,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-dark-panel .text-slate-600,
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-dark-panel .text-slate-500 {
            color: #475569 !important;
          }
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .guide-proof-strip dt {
            color: #475569 !important;
          }
          .vidmagnet-guide-content[data-presentation="basketball"] .guide-workbench-hero .guide-proof-strip dd {
            color: #101419 !important;
          }
        }
      `}</style>
      <div className={`guide-workbench ${youtubeUrl ? "" : "guide-workbench--solo"}`}>
        <header className="guide-workbench-hero border-b pb-8 sm:pb-10" style={{ borderColor: tint(primaryColor, "28") }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="guide-kicker text-xs font-bold" style={{ color: primaryColor }}>{experienceLabel}</span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-medium capitalize text-slate-500">{formatLabel(normalized.format)}</span>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="guide-print-hide inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold text-slate-600 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2"
              style={{ borderColor: tint(primaryColor, "35"), outlineColor: primaryColor }}
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Print or save PDF
            </button>
          </div>

          <h1 className="guide-display mt-6 max-w-[14ch] text-[2.35rem] font-bold leading-[1.03] text-slate-950 sm:text-[3.15rem]">
            {readableDisplayHeading(normalized.title, presentationPreset)}
          </h1>
          <p className="mt-5 max-w-[40rem] text-lg leading-8 text-slate-600">{normalized.promise}</p>

          {normalized.quickStart ? (
            <div className="mt-7 border-l-2 pl-4 sm:pl-5" style={{ borderColor: primaryColor }}>
              <p className="guide-kicker text-[11px] font-bold" style={{ color: primaryColor }}>Start here</p>
              <p className="mt-2 max-w-[38rem] text-base font-semibold leading-7 text-slate-900">
                {normalized.quickStart.firstAction}
              </p>
              <div className="guide-print-hide mt-4 flex flex-wrap gap-2.5">
                <a
                  href={firstSectionHref}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ backgroundColor: primaryColor, color: artifactButtonTextColor, outlineColor: primaryColor }}
                >
                  Open first breakdown
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                {normalized.templates?.length ? (
                  <a
                    href="#guide-artifact"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold text-slate-700 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2"
                    style={{ borderColor: tint(primaryColor, "38"), outlineColor: primaryColor }}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    View {artifactCopy.singularLabel}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          <dl
            className="guide-proof-strip mt-8 grid border-y"
            style={{ borderColor: tint(primaryColor, "24"), gridTemplateColumns: `repeat(${heroProof.length}, minmax(0, 1fr))` }}
            aria-label="What this guide includes"
          >
            {heroProof.map((item, index) => (
              <div
                key={item.label}
                className="px-3 py-4 first:pl-0 last:pr-0"
                style={index > 0 ? { borderLeft: `1px solid ${tint(primaryColor, "24")}` } : undefined}
              >
                <dt className="text-xs font-semibold leading-4 text-slate-500">{item.label}</dt>
                <dd className="guide-mono mt-1 text-xl font-bold text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </header>

        {youtubeUrl ? (
          <aside className="guide-source-dock guide-print-hide" aria-label="Source video and timestamps">
            <div
              className="guide-source-inner overflow-hidden border p-4 shadow-[0_24px_80px_rgba(9,11,16,.18)] sm:p-5"
              style={{
                backgroundColor: sourcePanelSurface,
                borderColor: sourceUsesDarkSurface ? "rgba(255,255,255,.12)" : tint(primaryColor, "26"),
                borderRadius: presentationPreset === "basketball" || presentationPreset === "performance" ? "18px" : "26px",
              }}
            >
              <YouTubeSourcePlayer
                ref={sourcePlayerRef}
                source={youtubeUrl}
                title={`${normalized.title} source video`}
                heading={sourceHeading}
                description="One source video. Use the timestamps in each block to review the exact demonstration."
                channelTitle={youtubeChannelTitle || undefined}
                moments={sourceMoments}
                momentsLabel="Jump to a moment"
                showYouTubeLink={false}
                appearance={{
                  tone: sourceUsesDarkSurface ? "dark" : "light",
                  surfaceColor: sourcePanelSurface,
                  textColor: sourcePanelText,
                  accentColor: primaryColor,
                  borderRadius: presentationPreset === "basketball" || presentationPreset === "performance" ? 14 : 20,
                }}
                className="border-0 p-0 shadow-none"
              />
              {sourceMoments.length > 4 ? (
                <p className="guide-mobile-source-note mt-3 hidden text-xs leading-5" style={{ color: sourcePanelText, opacity: .72 }}>
                  More timestamps are attached to the drill breakdowns below.
                </p>
              ) : null}
            </div>
          </aside>
        ) : null}

        <div id="guide-session" className="guide-workbench-body">
          <section id="guide-deep-dive" className="scroll-mt-24">
            <div className="guide-major-heading">
              <h2 className="guide-display text-3xl font-bold leading-tight text-slate-950">Deep dive</h2>
            </div>
            <div className="mt-7 grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-12">
              <div>
                <p className="max-w-[68ch] whitespace-pre-line text-base leading-8 text-slate-700">{normalized.introduction}</p>
                <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="border-l-2 pl-4" style={{ borderColor: primaryColor }}>
                    <p className="guide-kicker text-[10px] font-bold text-slate-500">Outcome</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{normalized.quickStart?.desiredOutcome || normalized.promise}</p>
                  </div>
                  {normalized.quickStart?.prerequisites.length ? (
                    <div>
                      <p className="guide-kicker text-[10px] font-bold text-slate-500">Bring with you</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                        {normalized.quickStart.prerequisites.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: secondaryColor }} aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="guide-technique-path border p-5 sm:p-6" style={{ borderColor: tint(primaryColor, "28"), backgroundColor: tint(primaryColor, "08"), borderRadius }}>
                <p className="guide-kicker text-[10px] font-bold text-slate-500">Technique path</p>
                <ol className="guide-principle-sequence mt-4 gap-px" style={{ backgroundColor: tint(primaryColor, "28") }}>
                  {normalized.sections.map((section, index) => (
                    <li key={section.id} className="bg-white p-4">
                      <a href={`#guide-section-${section.id}`} className="group block focus-visible:outline-none focus-visible:ring-2" style={{ outlineColor: primaryColor }}>
                        <span className="guide-mono text-xs font-bold" style={{ color: primaryColor }}>{String(index + 1).padStart(2, "0")}</span>
                        <span className="mt-2 block text-sm font-semibold leading-5 text-slate-900 group-hover:underline">{readableDisplayHeading(section.title, presentationPreset)}</span>
                        {section.objective ? <span className="mt-2 block text-xs leading-5 text-slate-600">{section.objective}</span> : null}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section className="pt-14 sm:pt-20" aria-labelledby="guide-breakdowns-heading">
            <div className="guide-major-heading">
              <h2 id="guide-breakdowns-heading" className="guide-display text-3xl font-bold leading-tight text-slate-950">
                {presentationPreset === "editorial" ? "Guide breakdowns" : "Drill breakdowns"}
              </h2>
            </div>
            <div className="mt-8 space-y-10 sm:space-y-14">
              {normalized.sections.map((section, sectionIndex) => {
                const Icon = sectionIcon(section.type);
                const visibleBlocks = section.blocks
                  .map((block, blockIndex) => ({ block, blockIndex }))
                  .filter(({ block }) => block.type !== "troubleshooting");
                const showSectionContent = sectionContentIsDistinct(section);
                return (
                  <section
                    key={section.id}
                    id={`guide-section-${section.id}`}
                    className={`guide-section scroll-mt-24 ${sectionIndex % 2 === 0 ? "guide-section--paper" : "border-y py-9 sm:py-11"}`}
                    style={{ borderColor: sectionIndex === 0 ? primaryColor : tint(primaryColor, "38"), ...(sectionIndex % 2 === 0 ? { backgroundColor: tint(primaryColor, "08") } : {}) }}
                  >
                    <div className="guide-section-layout">
                      <header className="min-w-0">
                        <span className="guide-mono text-3xl font-bold leading-none" style={{ color: primaryColor }}>
                          {String(sectionIndex + 1).padStart(2, "0")}
                        </span>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="capitalize">{section.type}</span>
                          {section.durationSeconds ? <span>· {compactDuration(section.durationSeconds)}</span> : null}
                        </div>
                        <h3 className="guide-display mt-2 text-[1.8rem] font-bold leading-[1.08] text-slate-950 sm:text-[2.1rem]">
                          {readableDisplayHeading(section.title, presentationPreset)}
                        </h3>
                        {section.objective ? <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{section.objective}</p> : null}
                        {youtubeUrl && section.timestampSeconds !== undefined ? (
                          <button
                            type="button"
                            onClick={() => context.reviewSourceAt(section.timestampSeconds as number)}
                            className="guide-print-hide mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2"
                            style={{ borderColor: tint(primaryColor, "42"), color: primaryColor, outlineColor: primaryColor }}
                          >
                            <PlayCircle className="h-4 w-4" aria-hidden="true" />
                            Watch at {section.timestamp || formatSourceTime(section.timestampSeconds)}
                          </button>
                        ) : null}
                        <SourceReviewButtons refs={section.sourceRefs} context={context} />
                      </header>

                      <div className="min-w-0 space-y-7">
                        {showSectionContent ? (
                          <p className="border-l-2 pl-4 text-base leading-8 text-slate-700" style={{ borderColor: secondaryColor }}>{section.content}</p>
                        ) : null}
                        {section.drillBreakdown ? <CoachBreakdown breakdown={section.drillBreakdown} context={context} /> : null}
                        {visibleBlocks.map(({ block, blockIndex }) => (
                          <BlockRenderer key={`${section.id}-block-${blockIndex}`} block={block} blockKey={`${section.id}-block-${blockIndex}`} context={context} />
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </section>

          <section className="mt-16 grid gap-8 sm:mt-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-12" aria-labelledby="guide-takeaways-heading">
            <div
              className="guide-dark-panel border p-6 shadow-[0_20px_55px_rgba(9,11,16,.14)] sm:p-8"
              style={{ backgroundColor: "#101419", borderColor: "rgba(255,255,255,.12)", borderRadius }}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" style={{ color: accentColor }} aria-hidden="true" />
                <p className="guide-kicker text-[10px] font-bold text-slate-500">Coach&apos;s note</p>
              </div>
              <p className="mt-5 whitespace-pre-line text-lg font-medium leading-8 text-slate-900">{normalized.conclusion}</p>
            </div>
            <div>
              <div className="guide-major-heading">
                <h2 id="guide-takeaways-heading" className="guide-display text-3xl font-bold leading-tight text-slate-950">Key takeaways</h2>
              </div>
              <ol className="mt-6 space-y-6">
                {takeawayItems.map((item, index) => (
                  <li key={`${item.title}-${index}`} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                    <span className="guide-mono text-2xl font-bold leading-none" style={{ color: tint(primaryColor, "70") }}>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{readableDisplayHeading(item.title, presentationPreset)}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {diagnosticItems.length ? (
            <section className="guide-diagnostic-matrix mt-16 sm:mt-20" aria-labelledby="guide-diagnostic-heading">
              <div className="guide-major-heading">
                <h2 id="guide-diagnostic-heading" className="guide-display text-3xl font-bold leading-tight text-slate-950">Mistakes + fixes</h2>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">Use the source-supported correction that matches what you observe.</p>
              <div className="mt-7 overflow-hidden border-y" style={{ borderColor: textColor }}>
                <div className="hidden grid-cols-3 gap-6 px-4 py-3 text-[10px] font-bold uppercase tracking-[.09em] sm:grid" style={{ backgroundColor: tint(primaryColor, "0D") }}>
                  <span>Observation</span>
                  <span>Likely cause</span>
                  <span>Correction</span>
                </div>
                {diagnosticItems.map((item, index) => (
                  <article key={`${item.sectionTitle}-${item.problem}-${index}`} className="grid gap-3 border-t p-4 text-sm leading-6 first:border-t-0 sm:grid-cols-3 sm:gap-6" style={{ borderColor: tint(primaryColor, "22") }}>
                    <div>
                      <p className="guide-kicker text-[10px] font-bold text-slate-500 sm:hidden">Observation</p>
                      <p className="mt-1 font-semibold text-slate-900 sm:mt-0">{item.problem}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{readableDisplayHeading(item.sectionTitle, presentationPreset)}</p>
                    </div>
                    <div>
                      <p className="guide-kicker text-[10px] font-bold text-slate-500 sm:hidden">Likely cause</p>
                      <p className="mt-1 text-slate-600 sm:mt-0">{item.cause || "—"}</p>
                    </div>
                    <div>
                      <p className="guide-kicker text-[10px] font-bold sm:hidden" style={{ color: accentColor }}>Correction</p>
                      <p className="mt-1 font-medium text-slate-700 sm:mt-0">{item.fix}</p>
                      {youtubeUrl && item.sourceSeconds !== undefined ? (
                        <button
                          type="button"
                          onClick={() => context.reviewSourceAt(item.sourceSeconds as number)}
                          className="guide-print-hide mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold"
                          style={{ borderColor: tint(primaryColor, "38"), color: primaryColor }}
                        >
                          <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Review {formatSourceTime(item.sourceSeconds)}
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {normalized.actionPlan ? (
            <section className="guide-workout mt-16 sm:mt-20" aria-labelledby="guide-workout-heading">
              <div className="guide-major-heading">
                <h2 id="guide-workout-heading" className="guide-display text-3xl font-bold leading-tight text-slate-950">Workout</h2>
              </div>
              <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Milestone className="h-5 w-5" style={{ color: primaryColor }} aria-hidden="true" />
                    <h3 className="guide-display text-2xl font-bold text-slate-950">{normalized.actionPlan.title}</h3>
                  </div>
                  <p className="mt-3 max-w-[52rem] text-sm leading-6 text-slate-600">{normalized.actionPlan.cadence}</p>
                </div>
                <span className="guide-mono text-xs font-semibold text-slate-500">{normalized.actionPlan.duration}</span>
              </div>
              <div className="mt-7 grid gap-px border" style={{ borderColor: tint(primaryColor, "28"), backgroundColor: tint(primaryColor, "28"), gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
                {normalized.actionPlan.milestones.map((milestone, index) => (
                  <article key={milestone.id} className="guide-milestone bg-white p-5 sm:p-6">
                    <span className="guide-mono text-2xl font-bold" style={{ color: primaryColor }}>{String(index + 1).padStart(2, "0")}</span>
                    <p className="mt-2 text-sm font-bold text-slate-900">{milestone.period}</p>
                    <div className="mt-5">
                      <p className="guide-kicker text-[10px] font-bold text-slate-500">Actions</p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                        {milestone.actions.map((action) => <li key={action} className="flex gap-2"><Circle className="mt-1.5 h-3 w-3 shrink-0" aria-hidden="true" />{action}</li>)}
                      </ul>
                    </div>
                    <div className="mt-5 border-t pt-4" style={{ borderColor: tint(primaryColor, "20") }}>
                      <p className="guide-kicker text-[10px] font-bold text-slate-500">Complete when</p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                        {milestone.completionCriteria.map((criterion) => <li key={criterion} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" style={{ color: secondaryColor }} aria-hidden="true" />{criterion}</li>)}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {normalized.templates?.length ? (
        <section id="guide-artifact" className="guide-artifact mt-16 scroll-mt-24 sm:mt-20">
          <div className="guide-major-heading">
            <h2 className="guide-display text-3xl font-bold leading-tight text-slate-950">{artifactCopy.sectionTitle}</h2>
          </div>
          <div className="mt-4 max-w-2xl">
            <p className="guide-kicker text-[10px] font-bold" style={{ color: primaryColor }}>Take it with you</p>
            {artifactCopy.sectionDescription ? <p className="mt-2 text-sm leading-6 text-slate-600">{artifactCopy.sectionDescription}</p> : null}
          </div>
          <div className="mt-8 space-y-12 sm:mt-10">
            {normalized.templates.map((template) => (
              <article key={template.id} className="grid items-start gap-7 lg:grid-cols-[.65fr_1.35fr] lg:gap-12">
                <div>
                  <h3 className="guide-display text-2xl font-bold text-slate-900">{template.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{template.purpose}</p>
                  <div className="guide-print-hide mt-5 flex flex-wrap gap-2.5">
                    {artifactDownloadLabel && artifactFilenameSuffix ? (
                      <button
                        type="button"
                        onClick={() => downloadTextArtifact({ title: template.title, purpose: template.purpose, body: template.body, example: template.example, filenameSuffix: artifactFilenameSuffix })}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        style={{ backgroundColor: primaryColor, color: artifactButtonTextColor, outlineColor: primaryColor }}
                        aria-label={`${artifactDownloadLabel}: ${template.title}`}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        {artifactDownloadLabel}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => context.copyTemplate(template.id, template.body)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold text-slate-700 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2"
                      style={{ borderColor: tint(primaryColor, "35"), outlineColor: primaryColor }}
                      aria-label={`Copy ${template.title} ${artifactCopy.singularLabel}`}
                    >
                      {copiedTemplateId === template.id ? <Check className="h-4 w-4" style={{ color: secondaryColor }} aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                      {copiedTemplateId === template.id ? "Copied" : artifactDownloadLabel ? "Copy sheet text" : "Copy template"}
                    </button>
                  </div>
                </div>
                <div className="guide-paper overflow-hidden border-2 border-dashed shadow-[0_24px_80px_rgba(9,11,16,.12)]" style={{ borderRadius: presentationPreset === "basketball" || presentationPreset === "performance" ? "14px" : "24px", borderColor: tint(primaryColor, "55") }}>
                  <div className="flex items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: tint(primaryColor, "24") }}>
                    <span className="guide-kicker text-[10px] font-bold" style={{ color: primaryColor }}>{artifactCopy.singularLabel}</span>
                    <span className="guide-mono text-[10px] text-slate-500">Print ready</span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap p-5 font-mono text-[13px] leading-6 text-slate-700 sm:p-7">{template.body}</pre>
                  {template.example ? (
                    <div className="border-t px-5 py-4 sm:px-7" style={{ borderColor: tint(primaryColor, "24") }}>
                      <p className="guide-kicker text-[10px] font-bold text-slate-500">Example entry</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{template.example}</p>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="guide-playbook-footer mt-16 border-y px-5 py-8 sm:mt-20 sm:px-8 sm:py-10" style={{ borderColor: tint(primaryColor, "32"), backgroundColor: tint(primaryColor, "08") }}>
        <div className="grid items-start gap-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
          <div>
            <p className="guide-kicker text-[10px] font-bold" style={{ color: primaryColor }}>Next step</p>
            <h2 className="guide-display mt-2 text-2xl font-bold text-slate-950">Put it into practice</h2>
          </div>
          <p className="whitespace-pre-line text-base font-semibold leading-7 text-slate-800">{normalized.callToAction}</p>
        </div>
      </footer>
    </article>
  );
}
