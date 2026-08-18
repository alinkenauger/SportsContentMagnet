import { z } from "zod";

export const presentationPresetSchema = z.enum([
  "auto",
  "editorial",
  "basketball",
  "golf",
  "performance",
]);

export const resolvedPresentationPresetSchema = presentationPresetSchema.exclude(["auto"]);

export const presentationProfileSchema = z.object({
  version: z.literal(1),
  mode: z.enum(["auto", "manual"]),
  preset: resolvedPresentationPresetSchema,
}).strict();

export const presentationSelectionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("auto") }).strict(),
  z.object({
    mode: z.literal("manual"),
    preset: resolvedPresentationPresetSchema,
  }).strict(),
]);

export const DEFAULT_PRESENTATION_PROFILE = {
  version: 1,
  mode: "auto",
  preset: "editorial",
} as const;

export const sourceMomentSchema = z.object({
  label: z.string().trim().min(1).max(300),
  startSeconds: z.number().finite().nonnegative(),
  endSeconds: z.number().finite().nonnegative().optional(),
}).strict().superRefine((value, context) => {
  if (value.endSeconds !== undefined && value.endSeconds < value.startSeconds) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endSeconds"],
      message: "End time must not precede start time",
    });
  }
});

export const youtubeSourceSchema = z.object({
  provider: z.literal("youtube"),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  canonicalUrl: z.string().url().max(2048),
  channelTitle: z.string().trim().min(1).max(300).optional(),
}).strict();

export type PresentationPreset = z.infer<typeof presentationPresetSchema>;
export type ResolvedPresentationPreset = z.infer<typeof resolvedPresentationPresetSchema>;
export type PresentationProfile = z.infer<typeof presentationProfileSchema>;
export type PresentationSelection = z.infer<typeof presentationSelectionSchema>;
export type SourceMoment = z.infer<typeof sourceMomentSchema>;
export type YouTubeSource = z.infer<typeof youtubeSourceSchema>;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);
const YOUTUBE_SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);
const YOUTUBE_PRIVACY_HOSTS = new Set([
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const MAX_SOURCE_TIME_SECONDS = 60 * 60 * 24 * 7;

function validVideoId(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value);
}

export function isYouTubeVideoId(value: unknown): value is string {
  return typeof value === "string" && validVideoId(value);
}

/**
 * Converts supported public YouTube URLs into one safe, provider-owned source.
 * Arbitrary hosts, credentials, ports, fragments, and path traversal are rejected.
 */
export function parseYouTubeSource(
  value: unknown,
  channelTitle?: string | null,
): YouTubeSource | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (validVideoId(trimmed)) {
    return youtubeSourceSchema.parse({
      provider: "youtube",
      videoId: trimmed,
      canonicalUrl: `https://www.youtube.com/watch?v=${trimmed}`,
      ...(channelTitle?.trim() ? { channelTitle: channelTitle.trim() } : {}),
    });
  }

  try {
    const url = new URL(
      /^[A-Za-z][A-Za-z\d+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || url.port) return null;

    const hostname = url.hostname.toLowerCase();
    let videoId: string | null = null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (YOUTUBE_SHORT_HOSTS.has(hostname)) {
      if (parts.length !== 1) return null;
      videoId = parts[0] || null;
    } else if (YOUTUBE_PRIVACY_HOSTS.has(hostname)) {
      if (parts.length !== 2 || parts[0] !== "embed") return null;
      videoId = parts[1] || null;
    } else if (YOUTUBE_HOSTS.has(hostname)) {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      } else {
        if (parts.length === 2 && ["embed", "shorts", "live"].includes(parts[0])) {
          videoId = parts[1] || null;
        }
      }
    }

    if (!validVideoId(videoId)) return null;
    return youtubeSourceSchema.parse({
      provider: "youtube",
      videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      ...(channelTitle?.trim() ? { channelTitle: channelTitle.trim() } : {}),
    });
  } catch {
    return null;
  }
}

export function normalizeSourceTime(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.min(MAX_SOURCE_TIME_SECONDS, Math.floor(value));
}

export function parseSourceTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = value.trim().toLowerCase();
  if (/^\d+$/.test(timestamp)) return normalizeSourceTime(Number(timestamp));
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(timestamp);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  return normalizeSourceTime(
    (Number(match[1] || 0) * 3600)
    + (Number(match[2] || 0) * 60)
    + Number(match[3] || 0),
  );
}

export function createYouTubeWatchUrl(videoId: string, startSeconds?: number | null): string | null {
  if (!validVideoId(videoId)) return null;
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", videoId);
  const start = normalizeSourceTime(startSeconds);
  if (start !== null && start > 0) url.searchParams.set("t", `${start}s`);
  return url.toString();
}

export function createPrivacyEnhancedYouTubeEmbedUrl(
  videoId: string,
  options: { autoplay?: boolean; controls?: boolean; startSeconds?: number | null } = {},
): string | null {
  if (!validVideoId(videoId)) return null;
  const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  url.searchParams.set("rel", "0");
  url.searchParams.set("playsinline", "1");
  const start = normalizeSourceTime(options.startSeconds);
  if (start !== null && start > 0) url.searchParams.set("start", String(start));
  if (options.autoplay) url.searchParams.set("autoplay", "1");
  if (options.controls === false) url.searchParams.set("controls", "0");
  return url.toString();
}

export function youtubeSourceFromStoredFields(
  youtubeUrl?: string | null,
  youtubeVideoId?: string | null,
  channelTitle?: string | null,
): YouTubeSource | null {
  const fromUrl = parseYouTubeSource(youtubeUrl, channelTitle);
  if (fromUrl) return fromUrl;
  if (!validVideoId(youtubeVideoId)) return null;
  return youtubeSourceSchema.parse({
    provider: "youtube",
    videoId: youtubeVideoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
    ...(channelTitle?.trim() ? { channelTitle: channelTitle.trim() } : {}),
  });
}

export function formatSourceTime(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = value % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`
    : `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

const BASKETBALL_TERMS = [
  "basketball", "hoops", "dribble", "dribbling", "layup", "jump shot",
  "free throw", "three-pointer", "ball handling", "point guard", "rebound",
  "pick-and-roll",
];

const GOLF_TERMS = [
  "golf", "golfer", "putting", "putter", "fairway", "short game", "backswing",
  "downswing", "handicap", "clubface", "wedge", "iron shot", "tee shot",
  "ball striking",
];

const PERFORMANCE_TERMS = [
  "training", "workout", "athlete", "fitness", "speed", "strength", "soccer",
  "football", "baseball", "tennis", "volleyball", "lacrosse", "sport",
];

function matchedTermCount(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term)).length;
}

function subjectFromText(text: string, minimumMatches: number): ResolvedPresentationPreset | null {
  const normalized = text.toLowerCase();
  const basketball = matchedTermCount(normalized, BASKETBALL_TERMS) >= minimumMatches;
  const golf = matchedTermCount(normalized, GOLF_TERMS) >= minimumMatches;
  if (basketball && golf) return "editorial";
  if (basketball) return "basketball";
  if (golf) return "golf";
  if (matchedTermCount(normalized, PERFORMANCE_TERMS) >= minimumMatches) return "performance";
  return null;
}

/**
 * Resolves a small, trusted presentation vocabulary. The model/content can
 * influence the selected preset, but can never emit CSS, class names, or URLs.
 */
export function resolvePresentationPreset(input: {
  preferred?: PresentationPreset | null;
  category?: string | null;
  title?: string | null;
  description?: string | null;
  audience?: string | null;
  tags?: string[] | null;
  sourceExcerpt?: string | null;
}): ResolvedPresentationPreset {
  if (input.preferred && input.preferred !== "auto") return input.preferred;

  const explicitSignals = [input.audience, input.title, input.category, input.description];
  for (const signal of explicitSignals) {
    if (!signal) continue;
    const subject = subjectFromText(signal, 1);
    if (subject) return subject;
  }

  const tagSubject = subjectFromText((input.tags || []).join(" "), 1);
  if (tagSubject) return tagSubject;

  const sourceSubject = subjectFromText(input.sourceExcerpt?.slice(0, 25_000) || "", 2);
  if (sourceSubject) return sourceSubject;
  return "editorial";
}

export function normalizePresentationProfile(value: unknown): PresentationProfile {
  const parsed = presentationProfileSchema.safeParse(value);
  return parsed.success ? parsed.data : { ...DEFAULT_PRESENTATION_PROFILE };
}

export function createPresentationProfile(
  selection: PresentationSelection | undefined,
  inference: Omit<Parameters<typeof resolvePresentationPreset>[0], "preferred">,
): PresentationProfile {
  if (selection?.mode === "manual") {
    return { version: 1, mode: "manual", preset: selection.preset };
  }
  return {
    version: 1,
    mode: "auto",
    preset: resolvePresentationPreset(inference),
  };
}
