import {
  createPrivacyEnhancedYouTubeEmbedUrl,
  createYouTubeWatchUrl,
  formatSourceTime,
  isYouTubeVideoId,
  normalizeSourceTime,
  parseSourceTime,
  parseYouTubeSource as parseCanonicalYouTubeSource,
} from "@shared/presentation";

export type YouTubeSourceKind =
  | "video-id"
  | "watch"
  | "short-link"
  | "shorts"
  | "live"
  | "embed";

export interface ParsedYouTubeSource {
  videoId: string;
  kind: YouTubeSourceKind;
  canonicalUrl: string;
  startSeconds: number | null;
}

export interface PrivacyEnhancedEmbedOptions {
  autoplay?: boolean;
  controls?: boolean;
  startSeconds?: number | null;
}

function sourceUrl(value: string): URL | null {
  try {
    return new URL(
      /^[A-Za-z][A-Za-z\d+.-]*:/.test(value) ? value : `https://${value}`,
    );
  } catch {
    return null;
  }
}

function startFromUrl(url: URL | null) {
  if (!url) return null;
  const query = parseSourceTime(url.searchParams.get("start") || url.searchParams.get("t"));
  if (query !== null) return query;
  return parseSourceTime(url.hash.startsWith("#t=") ? url.hash.slice(3) : null);
}

function sourceKind(value: string, url: URL | null): YouTubeSourceKind {
  if (isYouTubeVideoId(value)) return "video-id";
  const host = url?.hostname.toLowerCase();
  const first = url?.pathname.split("/").filter(Boolean)[0];
  if (host === "youtu.be" || host === "www.youtu.be") return "short-link";
  if (first === "shorts") return "shorts";
  if (first === "live") return "live";
  if (first === "embed") return "embed";
  return "watch";
}

/** Browser adapter around the single shared YouTube trust boundary. */
export function parseYouTubeSource(
  source: string | null | undefined,
): ParsedYouTubeSource | null {
  const value = source?.trim();
  if (!value) return null;
  const parsed = parseCanonicalYouTubeSource(value);
  if (!parsed) return null;
  const url = isYouTubeVideoId(value) ? null : sourceUrl(value);
  const startSeconds = startFromUrl(url);
  return {
    videoId: parsed.videoId,
    kind: sourceKind(value, url),
    canonicalUrl: createYouTubeWatchUrl(parsed.videoId, startSeconds) as string,
    startSeconds,
  };
}

export function createPrivacyEnhancedEmbedUrl(
  videoId: string,
  options: PrivacyEnhancedEmbedOptions = {},
) {
  return createPrivacyEnhancedYouTubeEmbedUrl(videoId, options);
}

export { createYouTubeWatchUrl, isYouTubeVideoId };
export const normalizeYouTubeTimestamp = normalizeSourceTime;
export const parseYouTubeTimestamp = parseSourceTime;
export const formatVideoTimestamp = formatSourceTime;
