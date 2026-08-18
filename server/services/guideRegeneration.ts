import {
  guideContentV2Schema,
  guideCreationBriefSchema,
  type GuideCreationBrief,
} from "@shared/guideContent";
import {
  normalizePresentationProfile,
  youtubeSourceFromStoredFields,
  type PresentationProfile,
  type YouTubeSource,
} from "@shared/presentation";

export interface StoredGuideRegenerationInput {
  id: number;
  title: string;
  description?: string | null;
  transcript: string;
  youtubeUrl?: string | null;
  youtubeVideoId?: string | null;
  channelTitle?: string | null;
  category?: string | null;
  tags?: string[] | null;
  content?: unknown;
  presentationProfile?: unknown;
}

export interface GuideRegenerationContext {
  sourceContent: string;
  sourceVideo: YouTubeSource | null;
  creationBrief: GuideCreationBrief;
  presentationProfile: PresentationProfile;
  libraryQuery: {
    title: string;
    sourceContent: string;
    audience?: string;
    objective?: string;
    category?: string;
    tags?: string[];
  };
}

/**
 * Reconstructs every durable generation input available on a stored Guide.
 * The original request brief was not historically persisted, so the existing
 * V2 format, promise, quick start, brand audience, and source metadata are the
 * authoritative fallbacks. The source transcript is never replaced by a prior
 * AI summary during regeneration.
 */
export function buildGuideRegenerationContext(input: {
  guide: StoredGuideRegenerationInput;
  targetAudience?: string | null;
  customInstructions?: string;
}): GuideRegenerationContext {
  const { guide } = input;
  const existingContent = guideContentV2Schema.safeParse(guide.content);
  const existing = existingContent.success ? existingContent.data : undefined;
  const focus = existing?.promise || guide.description || undefined;
  const desiredOutcome = existing?.quickStart?.desiredOutcome || existing?.promise || undefined;
  const creationBrief = guideCreationBriefSchema.parse({
    format: existing?.format || "report",
    audience: input.targetAudience || undefined,
    focus,
    desiredOutcome,
    availableTime: existing?.quickStart?.timeRequired,
    customInstructions: input.customInstructions,
  });

  return {
    sourceContent: guide.transcript,
    sourceVideo: youtubeSourceFromStoredFields(
      guide.youtubeUrl,
      guide.youtubeVideoId,
      guide.channelTitle,
    ),
    creationBrief,
    presentationProfile: normalizePresentationProfile(guide.presentationProfile),
    libraryQuery: {
      title: guide.title,
      sourceContent: guide.transcript.slice(0, 12_000),
      audience: creationBrief.audience,
      objective: creationBrief.desiredOutcome || creationBrief.focus,
      category: guide.category || undefined,
      tags: guide.tags || undefined,
    },
  };
}
