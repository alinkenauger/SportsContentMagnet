import assert from "node:assert/strict";
import test from "node:test";
import type { GuideContentV2 } from "@shared/guideContent";
import { buildGuideRegenerationContext } from "./services/guideRegeneration";

function storedContent(): GuideContentV2 {
  return {
    schemaVersion: 2,
    format: "playbook",
    title: "Stored playbook",
    promise: "Build a repeatable source-supported practice sequence.",
    introduction: "Use the source sequence as written.",
    quickStart: {
      desiredOutcome: "Complete the demonstrated sequence with visible evidence.",
      timeRequired: "Use the source-prescribed session length",
      prerequisites: [],
      firstAction: "Review the first demonstrated step.",
    },
    sections: [{
      id: "source_sequence",
      title: "Source sequence",
      content: "Follow the demonstrated sequence.",
      type: "drill",
      objective: "Complete the source sequence.",
      sourceRefs: [{ label: "Demonstrated sequence" }],
      blocks: [{
        type: "steps",
        items: [{
          id: "first_step",
          title: "Begin",
          instruction: "Perform the first demonstrated action.",
          successCriteria: "The first action is visibly complete.",
        }],
      }],
    }],
    conclusion: "Use the recorded evidence for the next session.",
    callToAction: "Save the completed notes.",
  };
}

test("reconstructs regeneration from the stored source, V2 brief, presentation, and library metadata", () => {
  const transcript = "ORIGINAL SOURCE TRANSCRIPT — preserve this text exactly.";
  const context = buildGuideRegenerationContext({
    guide: {
      id: 41,
      title: "Stored basketball guide",
      description: "An older AI summary that must not replace the source.",
      transcript,
      youtubeUrl: "https://not-youtube.example/video",
      youtubeVideoId: "WvUSs6yTltE",
      channelTitle: "Source Coach",
      category: "basketball",
      tags: ["footwork", "shooting"],
      content: storedContent(),
      presentationProfile: { version: 1, mode: "manual", preset: "basketball" },
    },
    targetAudience: "Developing basketball players",
    customInstructions: "Make every drill easier for a 14-year-old player to follow.",
  });

  assert.equal(context.sourceContent, transcript);
  assert.equal(context.sourceVideo?.videoId, "WvUSs6yTltE");
  assert.equal(context.creationBrief.format, "playbook");
  assert.equal(context.creationBrief.audience, "Developing basketball players");
  assert.equal(context.creationBrief.focus, storedContent().promise);
  assert.equal(
    context.creationBrief.customInstructions,
    "Make every drill easier for a 14-year-old player to follow.",
  );
  assert.equal(
    context.creationBrief.desiredOutcome,
    storedContent().quickStart?.desiredOutcome,
  );
  assert.equal(context.presentationProfile.mode, "manual");
  assert.equal(context.presentationProfile.preset, "basketball");
  assert.deepEqual(context.libraryQuery.tags, ["footwork", "shooting"]);
  assert.equal(context.libraryQuery.sourceContent, transcript);
});

test("falls back safely for legacy content while retaining a valid stored YouTube URL", () => {
  const context = buildGuideRegenerationContext({
    guide: {
      id: 42,
      title: "Legacy guide",
      description: "Legacy focus",
      transcript: "Stored legacy transcript",
      youtubeUrl: "https://youtu.be/WvUSs6yTltE",
      content: { title: "legacy v1 content" },
      presentationProfile: { invalid: true },
    },
  });

  assert.equal(context.creationBrief.format, "report");
  assert.equal(context.creationBrief.focus, "Legacy focus");
  assert.equal(context.sourceVideo?.canonicalUrl, "https://www.youtube.com/watch?v=WvUSs6yTltE");
  assert.equal(context.presentationProfile.preset, "editorial");
});
