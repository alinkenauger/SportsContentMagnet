import assert from "node:assert/strict";
import test from "node:test";

import { generatedGuideContentV2Schema } from "@shared/guideContent";
import { quizDefinitionSchema } from "@shared/quiz";
import {
  marketingCtaFixture,
  marketingCtaAssetId,
  marketingGiftFixture,
  marketingGiftAssetId,
  marketingGuideFixture,
  marketingQuizFixture,
  marketingQuizResultFixture,
  marketingQuizSelectedOptionId,
} from "../client/src/components/marketing/artifact-fixtures";

test("marketing Guide fixture is a strict, implementation-ready V2 guide", () => {
  const parsed = generatedGuideContentV2Schema.parse(marketingGuideFixture);
  const blockTypes = parsed.sections.flatMap((section) => section.blocks.map((block) => block.type));
  const steps = parsed.sections[0].blocks.find((block) => block.type === "steps");
  const worksheet = parsed.sections[0].blocks.find((block) => block.type === "worksheet");

  assert.equal(parsed.schemaVersion, 2);
  assert.equal(parsed.format, "playbook");
  assert.deepEqual(blockTypes, ["steps", "checklist", "worksheet"]);
  assert.equal(parsed.quickStart?.desiredOutcome, "Leave every client call with one priority, one scheduled action, and one visible finish line.");
  assert.equal(parsed.quickStart?.timeRequired, "20 minutes");
  assert.deepEqual(parsed.quickStart?.prerequisites, []);
  assert.equal(parsed.quickStart?.firstAction, "Choose the move that matters.");
  assert.equal(parsed.sections[0].id, "follow_through_sequence");
  assert.deepEqual(
    steps?.items.map((step) => step.title),
    ["Choose the move that matters.", "Put the action on the calendar.", "Define proof and the follow-up."],
  );
  assert.equal(steps?.items.every((step) => step.duration === undefined), true);
  assert.equal(worksheet?.title, "Weekly Reset Sheet");
  assert.deepEqual(
    worksheet?.prompts.map((prompt) => prompt.id),
    ["weekly_priority", "calendar_slot", "visible_proof"],
  );
  assert.equal(parsed.sections[0].sourceRefs, undefined);
});

test("marketing Interactive Quiz fixture satisfies reachability and lead-capture rules", () => {
  const parsed = quizDefinitionSchema.parse(marketingQuizFixture);
  const reachableOutcomeIds = new Set(
    parsed.questions.flatMap((question) =>
      question.options.flatMap((option) => Object.keys(option.outcomeWeights)),
    ),
  );

  assert.equal(parsed.questions.length, 2);
  assert.equal(parsed.outcomes.length, 2);
  assert.equal(parsed.description, "Find the point where a strong coaching conversation stops turning into client action.");
  assert.deepEqual(
    parsed.questions.map((question) => question.prompt),
    ["At the end of a client call, what usually happens?", "How do you decide an action is finished?"],
  );
  assert.deepEqual(
    parsed.outcomes.map((outcome) => outcome.id),
    ["priority_pile_up", "invisible_finish_line"],
  );
  assert.equal(
    parsed.questions.every((question) =>
      question.options.every((option) => Object.keys(option.outcomeWeights).length === 1),
    ),
    true,
  );
  assert.deepEqual(
    new Set(parsed.outcomes.map((outcome) => outcome.id)),
    reachableOutcomeIds,
  );
  assert.equal(parsed.leadCapture.fields?.includes("email"), true);
  assert.equal(parsed.questions[0].options[0].label, "Everything feels equally important.");
});

test("displayed quiz answer, outcome, gift, and CTA remain referentially aligned", () => {
  const selectedOption = marketingQuizFixture.questions[0].options.find(
    (option) => option.id === marketingQuizSelectedOptionId,
  );
  const mappedOutcomeIds = Object.keys(selectedOption?.outcomeWeights || {});

  assert.deepEqual(mappedOutcomeIds, [marketingQuizResultFixture.outcome.id]);
  assert.equal(marketingQuizFixture.outcomes[0].giftAssetId, marketingGiftAssetId);
  assert.equal(marketingQuizFixture.outcomes[0].ctaAssetId, marketingCtaAssetId);
  assert.equal(marketingQuizResultFixture.gift?.title, marketingGiftFixture.title);
  assert.equal(marketingQuizResultFixture.cta?.title, marketingCtaFixture.title);
});
