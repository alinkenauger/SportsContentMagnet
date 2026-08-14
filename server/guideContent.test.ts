import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import {
  generatedGuideContentV2Schema,
  guideContentV2Schema,
  guideCreationBriefSchema,
  inferGuideFormatFromTemplate,
  normalizeGuideContent,
} from "@shared/guideContent";

function validV2Guide() {
  return {
    schemaVersion: 2 as const,
    format: "playbook" as const,
    title: "The Consistent Practice Playbook",
    promise: "Build a repeatable practice routine you can verify.",
    introduction: "Use each play in order, then confirm the completion criteria.",
    quickStart: {
      desiredOutcome: "Complete one focused practice block.",
      timeRequired: "20 minutes",
      prerequisites: ["A quiet practice area"],
      firstAction: "Choose the one skill you will measure today.",
    },
    sections: [
      {
        id: "choose_focus",
        title: "Choose one measurable focus",
        content: "Select one skill and define what a successful repetition looks like.",
        type: "technique" as const,
        objective: "Leave practice knowing whether the skill improved.",
        blocks: [
          {
            type: "steps" as const,
            title: "Set the practice target",
            items: [
              {
                id: "define_target",
                title: "Define the target",
                instruction: "Write one observable result for the session.",
                successCriteria: "The result can be counted or clearly observed.",
              },
            ],
          },
          {
            type: "checklist" as const,
            title: "Before you start",
            items: [
              {
                id: "target_is_visible",
                text: "The target is written where you can see it.",
                required: true,
              },
            ],
          },
        ],
      },
    ],
    conclusion: "Repeat the playbook with one focus at a time.",
    callToAction: "Schedule the next focused practice block.",
  };
}

test("normalizes a strict V1 guide into backward-compatible V2 content", () => {
  const normalized = normalizeGuideContent({
    title: "Legacy Guide",
    introduction: "A useful legacy introduction.",
    sections: [
      {
        title: "Legacy Section",
        content: "Legacy prose remains available to old and new renderers.",
        type: "section",
        timestamp: 125,
        duration: 30,
      },
    ],
    conclusion: "Legacy conclusion.",
    callToAction: "Take the next step.",
  });

  assert.equal(normalized.schemaVersion, 2);
  assert.equal(normalized.format, "report");
  assert.equal(normalized.sections[0].content, "Legacy prose remains available to old and new renderers.");
  assert.equal(normalized.sections[0].type, "tip");
  assert.equal(normalized.sections[0].timestamp, "2:05");
  assert.equal(normalized.sections[0].timestampSeconds, 125);
  assert.deepEqual(normalized.sections[0].blocks, [
    { type: "rich_text", text: "Legacy prose remains available to old and new renderers." },
  ]);
});

test("accepts a concrete V2 playbook while retaining legacy renderer fields", () => {
  const parsed = generatedGuideContentV2Schema.parse(validV2Guide());

  assert.equal(parsed.sections[0].content.length > 0, true);
  assert.equal(parsed.sections[0].type, "technique");
  assert.equal(parsed.sections[0].blocks[0].type, "steps");
});

test("strict V2 validation rejects unknown properties", () => {
  assert.throws(
    () => guideContentV2Schema.parse({ ...validV2Guide(), unsafeHtml: "<script>alert(1)</script>" }),
    (error: unknown) => error instanceof z.ZodError,
  );
});

test("generated V2 validation rejects HTML markup", () => {
  const guide = validV2Guide();
  guide.sections[0].content = '<img src=x onerror="alert(1)">';

  assert.throws(
    () => generatedGuideContentV2Schema.parse(guide),
    (error: unknown) =>
      error instanceof z.ZodError &&
      error.issues.some((issue) => issue.message.includes("HTML markup")),
  );
});

test("generated V2 validation rejects prose-only output", () => {
  const guide = validV2Guide();
  guide.sections[0].blocks = [
    { type: "rich_text", text: "A paragraph without an implementation tool." },
  ] as typeof guide.sections[0]["blocks"];

  assert.throws(
    () => generatedGuideContentV2Schema.parse(guide),
    (error: unknown) =>
      error instanceof z.ZodError &&
      error.issues.some((issue) => issue.message.includes("concrete action block")),
  );
});

test("creation briefs normalize blank optional fields and template formats", () => {
  const brief = guideCreationBriefSchema.parse({
    format: inferGuideFormatFromTemplate("workout"),
    audience: "   ",
    focus: "Build a repeatable weekly routine",
  });

  assert.equal(brief.format, "action_plan");
  assert.equal(brief.audience, undefined);
  assert.equal(brief.focus, "Build a repeatable weekly routine");
  assert.equal(inferGuideFormatFromTemplate("sop"), "checklist");
});
