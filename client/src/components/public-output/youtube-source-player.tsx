import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Clock3, ExternalLink, Play, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  createPrivacyEnhancedEmbedUrl,
  createYouTubeWatchUrl,
  formatVideoTimestamp,
  normalizeYouTubeTimestamp,
  parseYouTubeSource,
} from "./youtube-source";

export interface YouTubeSourceMoment {
  id?: string;
  label: string;
  seconds: number;
  description?: string;
  kind?: "chapter" | "review";
}

export interface YouTubeSourcePlayerAppearance {
  /** `auto` follows the visitor's color-scheme preference unless brand colors are supplied. */
  tone?: "auto" | "light" | "dark";
  surfaceColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  accentColor?: string;
  onAccentColor?: string;
  borderColor?: string;
  borderRadius?: number;
}

export interface YouTubeSeekOptions {
  autoplay?: boolean;
  focusPlayer?: boolean;
  scrollIntoView?: boolean;
}

export interface YouTubeTimestampChangeEvent {
  videoId: string;
  seconds: number;
  reason: "imperative" | "moment";
  moment?: YouTubeSourceMoment;
}

export interface YouTubeSourcePlayerHandle {
  /** Reloads the privacy-enhanced player at an exact timestamp. Returns false for invalid input/source. */
  jumpTo: (seconds: number, options?: YouTubeSeekOptions) => boolean;
  focusPlayer: () => void;
  getActiveTimestamp: () => number;
}

export interface YouTubeSourcePlayerProps
  extends Omit<ComponentPropsWithoutRef<"section">, "children" | "title"> {
  /** A strict YouTube URL form or bare 11-character YouTube video ID. */
  source: string | null | undefined;
  /** Descriptive iframe title, for example “Weekly Reset source video”. */
  title: string;
  heading?: string;
  description?: string;
  channelTitle?: string;
  moments?: readonly YouTubeSourceMoment[];
  momentsLabel?: string;
  initialTimestampSeconds?: number | null;
  /** Changing this value reloads the iframe at the supplied timestamp. */
  activeTimestampSeconds?: number | null;
  autoPlayOnSeek?: boolean;
  scrollToPlayerOnSeek?: boolean;
  controls?: boolean;
  appearance?: YouTubeSourcePlayerAppearance;
  invalidSourceFallback?: ReactNode;
  showYouTubeLink?: boolean;
  showPrivacyNote?: boolean;
  onActiveTimestampChange?: (event: YouTubeTimestampChangeEvent) => void;
}

interface SeekState {
  videoId: string | null;
  seconds: number;
  autoplay: boolean;
  revision: number;
}

interface NormalizedMoment extends YouTubeSourceMoment {
  id: string;
}

interface PlayerPalette {
  surface: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  border: string;
  softSurface: string;
  radius: number;
  dark: boolean;
}

function normalizeHexColor(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^#([\dA-Fa-f]{3}|[\dA-Fa-f]{6})$/.exec(value.trim());
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split("").map((character) => character + character).join("")
    : match[1];
  return `#${hex.toUpperCase()}`;
}

function colorChannels(color: string) {
  return [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
}

function relativeLuminance(color: string) {
  const channels = colorChannels(color).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function mostReadableColor(background: string) {
  return contrastRatio("#101419", background) >= contrastRatio("#FFFFFF", background)
    ? "#101419"
    : "#FFFFFF";
}

function mixColors(foreground: string, background: string, foregroundWeight: number) {
  const foregroundChannels = colorChannels(foreground);
  const backgroundChannels = colorChannels(background);
  const mixed = foregroundChannels.map((channel, index) => (
    Math.round((channel * foregroundWeight) + (backgroundChannels[index] * (1 - foregroundWeight)))
  ));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function readableColor(candidate: string | null, background: string, minimumRatio: number) {
  if (candidate && contrastRatio(candidate, background) >= minimumRatio) return candidate;
  return mostReadableColor(background);
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, [query]);

  return matches;
}

function resolvePalette(
  appearance: YouTubeSourcePlayerAppearance | undefined,
  prefersDark: boolean,
): PlayerPalette {
  const tone = appearance?.tone || "auto";
  const useDarkDefaults = tone === "dark" || (tone === "auto" && prefersDark);
  const surface = normalizeHexColor(appearance?.surfaceColor)
    || (useDarkDefaults ? "#101419" : "#FFFFFF");
  const surfaceIsDark = relativeLuminance(surface) < 0.26;
  const defaultText = surfaceIsDark ? "#F8FAFC" : "#101419";
  const text = readableColor(normalizeHexColor(appearance?.textColor) || defaultText, surface, 4.5);
  const requestedAccent = normalizeHexColor(appearance?.accentColor)
    || (surfaceIsDark ? "#79D9C7" : "#3157F6");
  const accent = contrastRatio(requestedAccent, surface) >= 2.4 ? requestedAccent : text;
  const onAccent = readableColor(normalizeHexColor(appearance?.onAccentColor), accent, 4.5);
  const requestedMuted = normalizeHexColor(appearance?.mutedTextColor);
  const mutedFallback = mixColors(text, surface, surfaceIsDark ? 0.78 : 0.72);
  const muted = readableColor(requestedMuted || mutedFallback, surface, 4.5);
  const border = normalizeHexColor(appearance?.borderColor) || mixColors(text, surface, 0.18);
  const radius = Math.max(8, Math.min(32, Math.round(appearance?.borderRadius || 18)));

  return {
    surface,
    text,
    muted,
    accent,
    onAccent,
    border,
    softSurface: mixColors(accent, surface, surfaceIsDark ? 0.14 : 0.08),
    radius,
    dark: surfaceIsDark,
  };
}

function normalizeMoments(moments: readonly YouTubeSourceMoment[]): NormalizedMoment[] {
  return moments.flatMap((moment, index) => {
    const seconds = normalizeYouTubeTimestamp(moment.seconds);
    const label = moment.label.trim();
    if (seconds === null || !label) return [];

    return [{
      ...moment,
      id: moment.id || `youtube-moment-${seconds}-${index}`,
      label,
      description: moment.description?.trim() || undefined,
      seconds,
    }];
  });
}

export const YouTubeSourcePlayer = forwardRef<
  YouTubeSourcePlayerHandle,
  YouTubeSourcePlayerProps
>(function YouTubeSourcePlayer({
  source,
  title,
  heading = "Source video",
  description,
  channelTitle,
  moments = [],
  momentsLabel = "Review key moments",
  initialTimestampSeconds,
  activeTimestampSeconds,
  autoPlayOnSeek = true,
  scrollToPlayerOnSeek = false,
  controls = true,
  appearance,
  invalidSourceFallback,
  showYouTubeLink = true,
  showPrivacyNote = true,
  onActiveTimestampChange,
  className,
  style,
  ...sectionProps
}, ref) {
  const headingId = useId();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerFrameRef = useRef<HTMLDivElement>(null);
  const parsedSource = useMemo(() => parseYouTubeSource(source), [source]);
  const normalizedMoments = useMemo(() => normalizeMoments(moments), [moments]);
  const controlledTimestamp = normalizeYouTubeTimestamp(activeTimestampSeconds);
  const requestedInitialTimestamp = normalizeYouTubeTimestamp(initialTimestampSeconds);
  const preferredStart = controlledTimestamp
    ?? requestedInitialTimestamp
    ?? parsedSource?.startSeconds
    ?? 0;
  const [seekState, setSeekState] = useState<SeekState>(() => ({
    videoId: parsedSource?.videoId || null,
    seconds: preferredStart,
    autoplay: false,
    revision: 0,
  }));
  const [showPoster, setShowPoster] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const palette = useMemo(
    () => resolvePalette(appearance, prefersDark),
    [appearance, prefersDark],
  );
  const sourceSignature = parsedSource
    ? `${parsedSource.videoId}:${parsedSource.startSeconds ?? ""}`
    : null;
  const lastSourceSignature = useRef(sourceSignature);
  const lastControlledTimestamp = useRef(controlledTimestamp);

  useEffect(() => {
    if (lastSourceSignature.current === sourceSignature) return;
    lastSourceSignature.current = sourceSignature;
    lastControlledTimestamp.current = controlledTimestamp;
    setSeekState((current) => ({
      videoId: parsedSource?.videoId || null,
      seconds: preferredStart,
      autoplay: false,
      revision: current.revision + 1,
    }));
    setShowPoster(true);
    setAnnouncement("");
  }, [controlledTimestamp, parsedSource?.videoId, preferredStart, sourceSignature]);

  useEffect(() => {
    if (!parsedSource) return;
    if (controlledTimestamp === null) {
      lastControlledTimestamp.current = null;
      return;
    }
    if (lastControlledTimestamp.current === controlledTimestamp) return;

    lastControlledTimestamp.current = controlledTimestamp;
    setShowPoster(false);
    setSeekState((current) => (
      current.videoId === parsedSource.videoId && current.seconds === controlledTimestamp
        ? current
        : {
            videoId: parsedSource.videoId,
            seconds: controlledTimestamp,
            autoplay: autoPlayOnSeek,
            revision: current.revision + 1,
          }
    ));
    setAnnouncement(`Video moved to ${formatVideoTimestamp(controlledTimestamp)}.`);
  }, [autoPlayOnSeek, controlledTimestamp, parsedSource]);

  const activeState = seekState.videoId === parsedSource?.videoId
    ? seekState
    : {
        videoId: parsedSource?.videoId || null,
        seconds: preferredStart,
        autoplay: false,
        revision: seekState.revision,
      };

  const requestSeek = useCallback((
    seconds: number,
    reason: YouTubeTimestampChangeEvent["reason"],
    options?: YouTubeSeekOptions,
    moment?: NormalizedMoment,
  ) => {
    const normalizedSeconds = normalizeYouTubeTimestamp(seconds);
    if (!parsedSource || normalizedSeconds === null) return false;

    setShowPoster(false);
    setSeekState((current) => ({
      videoId: parsedSource.videoId,
      seconds: normalizedSeconds,
      autoplay: options?.autoplay ?? autoPlayOnSeek,
      revision: current.revision + 1,
    }));
    setAnnouncement(
      `Video moved to ${formatVideoTimestamp(normalizedSeconds)}${moment ? `, ${moment.label}` : ""}.`,
    );
    onActiveTimestampChange?.({
      videoId: parsedSource.videoId,
      seconds: normalizedSeconds,
      reason,
      moment,
    });

    const shouldScroll = options?.scrollIntoView ?? scrollToPlayerOnSeek;
    if (shouldScroll || options?.focusPlayer) {
      window.requestAnimationFrame(() => {
        if (shouldScroll) {
          playerFrameRef.current?.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center",
          });
        }
        if (options?.focusPlayer) iframeRef.current?.focus();
      });
    }

    return true;
  }, [
    autoPlayOnSeek,
    onActiveTimestampChange,
    parsedSource,
    prefersReducedMotion,
    scrollToPlayerOnSeek,
  ]);

  useImperativeHandle(ref, () => ({
    jumpTo: (seconds, options) => requestSeek(seconds, "imperative", options),
    focusPlayer: () => iframeRef.current?.focus(),
    getActiveTimestamp: () => activeState.seconds,
  }), [activeState.seconds, requestSeek]);

  const embedUrl = parsedSource
    ? createPrivacyEnhancedEmbedUrl(parsedSource.videoId, {
        autoplay: activeState.autoplay,
        controls,
        startSeconds: activeState.seconds,
      })
    : null;
  const watchUrl = parsedSource
    ? createYouTubeWatchUrl(parsedSource.videoId, activeState.seconds)
    : null;
  const posterUrl = parsedSource
    ? `https://i.ytimg.com/vi/${parsedSource.videoId}/hqdefault.jpg`
    : null;
  const rootStyle = {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: `${palette.radius}px`,
    color: palette.text,
    ...style,
  } as CSSProperties;
  const focusStyle = { outlineColor: palette.accent };

  return (
    <section
      {...sectionProps}
      className={cn("border p-4 shadow-sm sm:p-5", className)}
      style={rootStyle}
      aria-labelledby={headingId}
      data-youtube-video-id={parsedSource?.videoId}
      data-color-tone={palette.dark ? "dark" : "light"}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{ backgroundColor: palette.softSurface, color: palette.accent }}
              aria-hidden="true"
            >
              <Play className="h-4 w-4 fill-current" />
            </span>
            <div className="min-w-0">
              <h2 id={headingId} className="text-base font-bold leading-6">
                {heading}
              </h2>
              {channelTitle ? (
                <p className="truncate text-xs font-medium" style={{ color: palette.muted }}>
                  {channelTitle}
                </p>
              ) : null}
            </div>
          </div>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: palette.muted }}>
              {description}
            </p>
          ) : null}
        </div>

        {showYouTubeLink && watchUrl ? (
          <a
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              !prefersReducedMotion && "transition-colors duration-200",
            )}
            style={{
              ...focusStyle,
              borderColor: palette.border,
              color: palette.text,
            }}
            aria-label={`Open ${title} on YouTube at ${formatVideoTimestamp(activeState.seconds)}`}
          >
            Open on YouTube
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {parsedSource && embedUrl ? (
        <>
          <div
            ref={playerFrameRef}
            className="relative mt-4 aspect-video overflow-hidden bg-black shadow-inner"
            style={{ borderRadius: `${Math.max(8, palette.radius - 4)}px` }}
          >
            <iframe
              ref={iframeRef}
              className="absolute inset-0 h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={focusStyle}
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
            {showPoster && posterUrl ? (
              <button
                type="button"
                className="group absolute inset-0 overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px]"
                style={focusStyle}
                onClick={() => {
                  setShowPoster(false);
                  window.requestAnimationFrame(() => iframeRef.current?.focus());
                }}
                aria-label={`Play ${title}`}
              >
                <img
                  src={posterUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" aria-hidden="true" />
                <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
                  <span className="grid h-16 w-16 place-items-center rounded-full border border-white/40 bg-white/95 text-slate-950 shadow-2xl transition-transform group-hover:scale-105">
                    <Play className="ml-1 h-6 w-6 fill-current" />
                  </span>
                </span>
                <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 text-white">
                  <span>
                    <span className="block text-[10px] font-bold uppercase tracking-[.14em] text-white/70">Source video</span>
                    <span className="mt-1 block text-sm font-semibold leading-5 sm:text-base">Watch the lesson, then jump back to any coached moment.</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-black/65 px-2 py-1 font-mono text-xs">
                    {formatVideoTimestamp(activeState.seconds)}
                  </span>
                </span>
              </button>
            ) : null}
          </div>

          {showPrivacyNote ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: palette.muted }}>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Privacy-enhanced YouTube player
            </p>
          ) : null}

          {normalizedMoments.length > 0 ? (
            <nav className="mt-5" aria-label={momentsLabel}>
              <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: palette.muted }}>
                {momentsLabel}
              </p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {normalizedMoments.map((moment) => {
                  const isActive = activeState.seconds === moment.seconds;
                  const timestamp = formatVideoTimestamp(moment.seconds);
                  return (
                    <li key={moment.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex min-h-14 w-full items-start gap-3 border p-3 text-left",
                          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                          !prefersReducedMotion && "transition-colors duration-200",
                        )}
                        style={{
                          ...focusStyle,
                          backgroundColor: isActive ? palette.accent : palette.softSurface,
                          borderColor: isActive ? palette.accent : palette.border,
                          borderRadius: `${Math.max(8, palette.radius - 6)}px`,
                          color: isActive ? palette.onAccent : palette.text,
                        }}
                        aria-pressed={isActive}
                        aria-label={`Jump to ${moment.kind === "review" ? "review moment " : ""}${moment.label} at ${timestamp}`}
                        onClick={() => requestSeek(moment.seconds, "moment", undefined, moment)}
                      >
                        <span
                          className="mt-0.5 inline-flex shrink-0 items-center gap-1 font-mono text-xs font-bold"
                          aria-hidden="true"
                        >
                          <Clock3 className="h-3.5 w-3.5" />
                          {timestamp}
                        </span>
                        <span className="min-w-0">
                          {moment.kind ? (
                            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] opacity-75">
                              {moment.kind === "review" ? "Review moment" : "Chapter"}
                            </span>
                          ) : null}
                          <span className="block text-sm font-semibold leading-5">{moment.label}</span>
                          {moment.description ? (
                            <span className="mt-1 block text-xs leading-5 opacity-80">
                              {moment.description}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : null}
        </>
      ) : (
        <div
          className="mt-4 border px-4 py-8 text-center text-sm leading-6"
          style={{
            backgroundColor: palette.softSurface,
            borderColor: palette.border,
            borderRadius: `${Math.max(8, palette.radius - 4)}px`,
            color: palette.muted,
          }}
          role="status"
          data-youtube-source-invalid="true"
        >
          {invalidSourceFallback || "This source video is not available."}
        </div>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </section>
  );
});
