import assert from "node:assert/strict";
import test from "node:test";

import {
  QuizSourceResolutionError,
  normalizeQuizSourceSegments,
  resolveQuizSource,
  type QuizSourceDependencies,
} from "./services/quizSource";

const transcript = "The coach teaches a balanced setup, a controlled first move, and a clear finish checkpoint before changing another variable.";

function youtubeDependencies(
  transcribe: QuizSourceDependencies["transcribe"],
): QuizSourceDependencies {
  return {
    getVideoData: async () => ({
      videoId: "WvUSs6yTltE",
      title: "Build a repeatable shooting base",
      description: "",
      thumbnailUrl: "https://i.ytimg.com/vi/WvUSs6yTltE/hqdefault.jpg",
      duration: "PT3M",
      channelTitle: "ILB Elite",
      publishedAt: "",
      viewCount: 0,
      likeCount: 0,
    }),
    transcribe,
  };
}

test("manual quiz source remains compatible and does not call YouTube", async () => {
  let called = false;
  const dependencies: QuizSourceDependencies = {
    getVideoData: async () => {
      called = true;
      throw new Error("unexpected metadata call");
    },
    transcribe: async () => {
      called = true;
      throw new Error("unexpected transcription call");
    },
  };

  const resolved = await resolveQuizSource({ sourceContent: `  ${transcript}  ` }, dependencies);

  assert.equal(called, false);
  assert.equal(resolved.sourceContent, transcript);
  assert.equal(resolved.sourceVideo, null);
  assert.deepEqual(resolved.sourceSegments, []);
});

test("YouTube quiz source resolves metadata, transcribes, and keeps only grounded timed rows", async () => {
  let metadataUrl = "";
  let transcribedVideoId = "";
  const dependencies = youtubeDependencies(async (videoId) => {
    transcribedVideoId = videoId;
    return {
      text: transcript,
      method: "youtube_transcript",
      segments: [
        { start: 12.5, end: 16, text: "The coach teaches a balanced setup" },
        { start: 20, end: 24, text: "words that are not in the transcript" },
        { start: -1, end: 2, text: "a controlled first move" },
      ],
    };
  });
  const originalMetadata = dependencies.getVideoData;
  dependencies.getVideoData = async (url) => {
    metadataUrl = url;
    return originalMetadata(url);
  };

  const resolved = await resolveQuizSource({
    youtubeUrl: "https://youtu.be/WvUSs6yTltE?t=12",
  }, dependencies);

  assert.equal(metadataUrl, "https://www.youtube.com/watch?v=WvUSs6yTltE");
  assert.equal(transcribedVideoId, "WvUSs6yTltE");
  assert.equal(resolved.sourceContent, transcript);
  assert.equal(resolved.videoTitle, "Build a repeatable shooting base");
  assert.deepEqual(resolved.sourceVideo, {
    provider: "youtube",
    videoId: "WvUSs6yTltE",
    canonicalUrl: "https://www.youtube.com/watch?v=WvUSs6yTltE",
    channelTitle: "ILB Elite",
  });
  assert.deepEqual(resolved.sourceSegments, [
    { start: 12.5, end: 16, text: "The coach teaches a balanced setup" },
  ]);
});

test("timing normalization rejects malformed and transcript-unmatched evidence", () => {
  assert.deepEqual(normalizeQuizSourceSegments(transcript, [
    { start: 2, end: 4, text: "a controlled first move" },
    { start: Number.NaN, end: 8, text: "a clear finish checkpoint" },
    { start: 10, end: 9, text: "a clear finish checkpoint" },
    { start: 12, end: 14, text: "unsupported advice" },
  ]), [
    { start: 2, end: 4, text: "a controlled first move" },
  ]);
});

test("YouTube transcription failures return an actionable source error", async () => {
  await assert.rejects(
    () => resolveQuizSource({
      youtubeUrl: "https://www.youtube.com/watch?v=WvUSs6yTltE",
    }, youtubeDependencies(async () => {
      throw new Error("NO_CAPTIONS_AVAILABLE: captions disabled");
    })),
    (error: unknown) => {
      assert.ok(error instanceof QuizSourceResolutionError);
      assert.match(error.message, /could not get a usable transcript/i);
      assert.match(error.message, /paste the source content instead/i);
      return true;
    },
  );
});
