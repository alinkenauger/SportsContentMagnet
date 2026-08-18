import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { GuideContentV2 } from "@shared/guideContent";
import { validateStoredGuideForPublish } from "./guidePublishValidation";

function publishablePlaybook(): GuideContentV2 {
  return {
    schemaVersion: 2,
    format: "playbook",
    title: "The Focused Practice Playbook",
    promise: "Turn one source-supported technique into a repeatable practice routine.",
    introduction: "Use the first section to choose the focus and the second to run and verify the routine.",
    quickStart: {
      desiredOutcome: "Leave the next practice block with an observable result.",
      prerequisites: ["The practice notes described in the source"],
      firstAction: "Write down the single technique you will practice before starting.",
    },
    sections: [
      {
        id: "choose_focus",
        title: "Choose one practice focus",
        content: "Translate the source technique into one action you can observe during the practice block.",
        type: "technique",
        objective: "Define one practice action and the evidence that will show it was completed.",
        sourceRefs: [{ label: "Technique selection and preparation" }],
        blocks: [
          {
            type: "steps",
            title: "Prepare the practice block",
            items: [
              {
                id: "select_technique",
                title: "Select the technique",
                instruction: "Choose the one technique from the source that matches the current practice need.",
                why: "A single focus makes the result easier to observe.",
                successCriteria: "One technique is written at the top of the practice notes.",
              },
              {
                id: "define_evidence",
                title: "Define completion evidence",
                instruction: "Write what you will observe when the selected technique is performed as described.",
                why: "Visible evidence separates completion from a vague impression.",
                successCriteria: "The notes contain one observable completion statement.",
              },
            ],
          },
          {
            type: "checklist",
            title: "Ready to begin",
            items: [
              {
                id: "focus_visible",
                text: "The selected technique is visible in the practice notes.",
                evidence: "The technique is written in one sentence.",
                required: true,
              },
              {
                id: "evidence_defined",
                text: "The completion evidence is written before practice begins.",
                evidence: "The notes state what will be observed.",
                required: true,
              },
            ],
          },
        ],
      },
      {
        id: "run_and_review",
        title: "Run and review the practice block",
        content: "Perform the selected action, record what happened, and compare the observation with the completion evidence.",
        type: "drill",
        objective: "Complete the action and decide what to keep or adjust next time.",
        sourceRefs: [{ label: "Practice execution and review procedure" }],
        blocks: [
          {
            type: "steps",
            title: "Complete the feedback loop",
            items: [
              {
                id: "record_observation",
                title: "Record the observation",
                instruction: "After the practice action, write what you observed without adding an unsupported score.",
                successCriteria: "The notes contain a concrete observation from the completed action.",
              },
            ],
          },
          {
            type: "troubleshooting",
            items: [
              {
                problem: "The observation is too vague to compare.",
                cause: "The completion statement describes a feeling instead of visible evidence.",
                fix: "Rewrite the statement around what can be seen, heard, counted, or directly confirmed.",
              },
            ],
          },
        ],
      },
    ],
    conclusion: "Repeat the same feedback loop with one supported technique at a time.",
    callToAction: "Save the completed notes and choose the next source-supported practice focus.",
  };
}

function legacyGuide() {
  return {
    title: "Legacy Guide",
    introduction: "A useful legacy introduction that explains how to use the material.",
    sections: [{
      title: "Legacy Section",
      content: "Legacy prose remains available to old and new renderers without losing the original text.",
      type: "section" as const,
    }],
    conclusion: "Use the idea in the next relevant situation.",
    callToAction: "Take the next step.",
  };
}

test("accepts a strict V2 Guide that passes the deterministic output audit", () => {
  const result = validateStoredGuideForPublish({
    content: publishablePlaybook(),
    title: "A practical planning method",
  });

  assert.equal(result.publishable, true);
  assert.equal(result.audit.passed, true);
  assert.equal(result.content.format, "playbook");
  assert.deepEqual(result.context, {
    expectedFormat: "playbook",
    formatSource: "content",
    normalizedLegacy: false,
    trainingRecipeApplied: false,
    trainingDepthProfile: null,
    sourceTimingRangesChecked: false,
  });
});

test("rejects malformed stored content before quality auditing it", () => {
  const malformed = {
    ...publishablePlaybook(),
    unsafeHtml: "<script>alert('no')</script>",
  };
  const result = validateStoredGuideForPublish({ content: malformed });

  assert.equal(result.publishable, false);
  assert.equal(result.audit.passed, false);
  assert.deepEqual(result.audit.issues.map((issue) => issue.code), ["schema_validation"]);
  assert.equal(result.content, undefined);
});

test("rejects a stored V2 Guide that changed its durable expected format", () => {
  const result = validateStoredGuideForPublish({
    content: publishablePlaybook(),
    expectedFormat: "checklist",
  });

  assert.equal(result.publishable, false);
  assert.equal(result.context.expectedFormat, "checklist");
  assert.equal(result.context.formatSource, "stored_expectation");
  assert.equal(
    result.audit.issues.some((issue) =>
      issue.code === "format_recipe" &&
      issue.evidence.some((evidence) =>
        evidence.path === "format" &&
        evidence.observed === "playbook" &&
        evidence.expected === "checklist")),
    true,
  );
});

test("normalizes legacy content only with an explicit expected format and keeps the quality bar", () => {
  const withoutFormat = validateStoredGuideForPublish({ content: legacyGuide() });
  assert.equal(withoutFormat.publishable, false);
  assert.equal(withoutFormat.context.expectedFormat, null);
  assert.equal(withoutFormat.context.normalizedLegacy, true);
  assert.deepEqual(withoutFormat.audit.issues.map((issue) => issue.code), ["schema_validation"]);

  const withFormat = validateStoredGuideForPublish({
    content: legacyGuide(),
    expectedFormat: "report",
  });
  assert.equal(withFormat.publishable, false);
  assert.equal(withFormat.content?.schemaVersion, 2);
  assert.equal(withFormat.content?.format, "report");
  assert.equal(withFormat.context.normalizedLegacy, true);
  assert.equal(
    withFormat.audit.issues.some((issue) => issue.code === "value_density"),
    true,
  );
});

test("does not invent training or timestamp evidence when the stored analysis is unavailable", () => {
  const result = validateStoredGuideForPublish({
    content: publishablePlaybook(),
    title: "Basketball shooting mechanics practice session",
    transcript: "The coach explains basketball shooting mechanics and a release drill.",
  });

  assert.equal(result.publishable, true);
  assert.equal(result.context.trainingRecipeApplied, false);
  assert.equal(result.context.trainingDepthProfile, null);
  assert.equal(result.context.sourceTimingRangesChecked, false);
});

test("uses a stored training inventory to apply only the supported training-depth gate", () => {
  const result = validateStoredGuideForPublish({
    content: publishablePlaybook(),
    title: "Basketball shooting mechanics practice session",
    transcript: "The coach explains one basketball shooting drill and its release cue.",
    aiAnalysis: {
      keyTips: ["Keep the release cue visible"],
      drills: [{
        name: "Release drill",
        description: "Practice the release described by the coach.",
        steps: ["Set the ball", "Finish the release"],
      }],
      techniques: [],
      contentInventory: {
        principles: [],
        bestPractices: ["Keep the release cue visible"],
        keyTakeaways: [],
        troubleshooting: [],
        progressions: [],
        regressions: [],
        workoutPlanIngredients: ["Release drill"],
      },
    },
  });

  assert.equal(result.publishable, false);
  assert.equal(result.context.trainingRecipeApplied, true);
  assert.equal(result.context.trainingDepthProfile?.drillCount, 1);
  assert.equal(result.context.trainingDepthProfile?.mistakeCount, 0);
  assert.equal(
    result.audit.issues.some((issue) => issue.code === "content_recipe"),
    true,
  );
});

test("the Guide status route blocks publishing before tags, Library, or status writes", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const routeStart = routes.indexOf("app.patch('/api/guides/:id/status'");
  const routeEnd = routes.indexOf("// Transfer guide between Personal and Brand accounts", routeStart);
  const publishRoute = routes.slice(routeStart, routeEnd);

  const validationIndex = publishRoute.indexOf("validateStoredGuideForPublish({");
  const taggingIndex = publishRoute.indexOf("generateSmartTags");
  const updateIndex = publishRoute.indexOf("storage.updateGuideIfUnchanged(");

  assert.ok(validationIndex >= 0, "publish route must invoke the stored Guide gate");
  assert.ok(taggingIndex > validationIndex, "quality validation must precede smart tagging");
  assert.ok(updateIndex > validationIndex, "quality validation must precede the status write");
  assert.match(publishRoute, /status === "published" \|\| status === "unlisted"/);
  assert.match(publishRoute, /if \(makesGuidePublic\)[\s\S]*guide_publish_validation_failed/);
  assert.match(publishRoute, /res\.status\(422\)/);
  assert.match(publishRoute, /guide_changed_during_publish/);
  assert.match(publishRoute, /res\.status\(409\)/);
});

test("generic Guide updates cannot bypass status or quiz publish validation", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const routeStart = routes.indexOf("app.put('/api/guides/:id'");
  const routeEnd = routes.indexOf("app.patch('/api/guides/:id/library'", routeStart);
  const updateRoute = routes.slice(routeStart, routeEnd);

  const statusGuardIndex = updateRoute.indexOf("if (parsedUpdate.status !== undefined)");
  const quizGuardIndex = updateRoute.indexOf('if (guide.magnetType === "quiz")');
  const forcedDraftIndex = updateRoute.indexOf('const safeUpdateData = { ...updateData, status: "draft" }');
  const writeIndex = updateRoute.indexOf("storage.updateGuideIfUnchanged(");

  assert.ok(statusGuardIndex >= 0, "generic updates must reject status transitions");
  assert.ok(quizGuardIndex >= 0, "generic updates must reject Interactive Quiz mutations");
  assert.ok(writeIndex > statusGuardIndex, "status rejection must run before the write");
  assert.ok(writeIndex > quizGuardIndex, "quiz rejection must run before the write");
  assert.ok(forcedDraftIndex > quizGuardIndex, "edits to public Guides must atomically become Drafts");
  assert.ok(writeIndex > forcedDraftIndex, "the forced Draft state must be part of the content write");
  assert.match(updateRoute, /guide_status_transition_required/);
  assert.match(updateRoute, /guide_changed_during_edit/);
  assert.match(updateRoute, /res\.status\(409\)/);
});

test("Guide deletion is authenticated, tenant-aware, and uses dependency-safe storage", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const routeStart = routes.indexOf("app.delete('/api/guides/:id'");
  const routeEnd = routes.indexOf("app.patch('/api/guides/:id/library'", routeStart);
  const deleteRoute = routes.slice(routeStart, routeEnd);

  assert.match(deleteRoute, /isAuthenticated/);
  assert.match(deleteRoute, /assertGuideAccess\(userId, guide, "write_content"\)/);
  assert.match(deleteRoute, /guide\.magnetType === "quiz"/);
  assert.match(deleteRoute, /storage\.deleteGuide\(guideId, guide\.revision\)/);
  assert.match(deleteRoute, /guide_changed_during_delete/);
  assert.match(deleteRoute, /res\.status\(409\)/);
  assert.match(deleteRoute, /res\.status\(204\)\.end\(\)/);
});
