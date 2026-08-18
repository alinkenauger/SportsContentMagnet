import type { GenerateQuizRequest } from "@shared/quiz";
import { parseYouTubeSource, type YouTubeSource } from "@shared/presentation";
import {
  getYouTubeVideoData,
  transcribeVideo,
  type YouTubeTimedTranscript,
  type YouTubeTranscriptSegment,
  type YouTubeVideoData,
} from "./youtube";

const MAX_SOURCE_CONTENT_LENGTH = 100_000;
const MAX_TIMED_SEGMENTS = 500;
const MAX_TIMING_EVIDENCE_CHARACTERS = 30_000;

export interface ResolvedQuizSource {
  sourceContent: string;
  sourceVideo: YouTubeSource | null;
  sourceSegments: YouTubeTranscriptSegment[];
  videoTitle?: string;
}

export interface QuizSourceDependencies {
  getVideoData: (url: string) => Promise<YouTubeVideoData>;
  transcribe: (videoId: string) => Promise<string | YouTubeTimedTranscript>;
}

export class QuizSourceResolutionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "QuizSourceResolutionError";
  }
}

function normalizeForEvidenceMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Keeps only provider-timed rows that can be matched back to the real
 * transcript. This lets the generator cite supplied moments without treating
 * model-estimated or malformed times as evidence.
 */
export function normalizeQuizSourceSegments(
  sourceContent: string,
  segments: readonly YouTubeTranscriptSegment[],
): YouTubeTranscriptSegment[] {
  const normalizedTranscript = normalizeForEvidenceMatch(sourceContent);
  const normalized: YouTubeTranscriptSegment[] = [];
  let characterCount = 0;

  for (const segment of segments) {
    const text = typeof segment?.text === "string"
      ? segment.text.replace(/\s+/g, " ").trim()
      : "";
    const start = Number(segment?.start);
    const end = Number(segment?.end);
    const matchText = normalizeForEvidenceMatch(text);

    if (
      !text
      || !matchText
      || !Number.isFinite(start)
      || !Number.isFinite(end)
      || start < 0
      || end < start
      || !normalizedTranscript.includes(matchText)
    ) {
      continue;
    }

    if (
      normalized.length >= MAX_TIMED_SEGMENTS
      || characterCount + text.length > MAX_TIMING_EVIDENCE_CHARACTERS
    ) {
      break;
    }

    normalized.push({ start, end, text });
    characterCount += text.length;
  }

  return normalized;
}

function youtubeSourceErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("PRIVATE_VIDEO")) {
    return "That YouTube video is private. Choose a public video or paste the source content instead.";
  }
  if (message.includes("AGE_RESTRICTED")) {
    return "That YouTube video requires age verification. Choose another video or paste the source content instead.";
  }
  if (message.includes("VIDEO_UNAVAILABLE")) {
    return "That YouTube video is unavailable. Check the URL or paste the source content instead.";
  }
  if (message.includes("NO_CAPTIONS_AVAILABLE") || message.includes("TRANSCRIPTION_FAILED")) {
    return "VidMagnet could not get a usable transcript from that video. Try another public video or paste the source content instead.";
  }
  return "VidMagnet could not process that YouTube video. Check the URL, try another public video, or paste the source content instead.";
}

export async function resolveQuizSource(
  input: Pick<GenerateQuizRequest, "sourceContent" | "youtubeUrl">,
  dependencies: QuizSourceDependencies = {
    getVideoData: getYouTubeVideoData,
    transcribe: transcribeVideo,
  },
): Promise<ResolvedQuizSource> {
  const pastedSource = input.sourceContent?.trim();
  const parsedVideo = parseYouTubeSource(input.youtubeUrl);

  if (pastedSource && parsedVideo) {
    throw new QuizSourceResolutionError("Choose either a YouTube video or pasted source content.");
  }

  if (pastedSource) {
    if (pastedSource.length < 50) {
      throw new QuizSourceResolutionError("Paste at least 50 characters of source content.");
    }
    return {
      sourceContent: pastedSource.slice(0, MAX_SOURCE_CONTENT_LENGTH),
      sourceVideo: null,
      sourceSegments: [],
    };
  }

  if (!parsedVideo) {
    throw new QuizSourceResolutionError("Enter a valid YouTube video URL or paste source content.");
  }

  try {
    const videoData = await dependencies.getVideoData(parsedVideo.canonicalUrl);
    const transcription = await dependencies.transcribe(parsedVideo.videoId);
    const sourceContent = (typeof transcription === "string"
      ? transcription
      : transcription.text)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_SOURCE_CONTENT_LENGTH);

    if (sourceContent.length < 50) {
      throw new Error("NO_CAPTIONS_AVAILABLE: transcript was too short");
    }

    const sourceSegments = typeof transcription === "string"
      ? []
      : normalizeQuizSourceSegments(sourceContent, transcription.segments || []);
    const sourceVideo = parseYouTubeSource(
      parsedVideo.canonicalUrl,
      videoData.channelTitle,
    ) || parsedVideo;

    return {
      sourceContent,
      sourceVideo,
      sourceSegments,
      videoTitle: videoData.title,
    };
  } catch (error) {
    throw new QuizSourceResolutionError(youtubeSourceErrorMessage(error), error);
  }
}
