import assert from "node:assert/strict";
import test from "node:test";
import {
  QuizScoringError,
  scoreQuizOutcome,
  type QuizOutcome,
  type QuizQuestion,
} from "@shared/quiz";

const outcomes: QuizOutcome[] = [
  {
    id: "builder",
    title: "The Builder",
    summary: "Build the foundation first.",
    description: "Your fastest progress comes from strengthening the basics.",
    recommendations: ["Choose one foundational habit"],
    giftAssetId: null,
    ctaAssetId: null,
  },
  {
    id: "optimizer",
    title: "The Optimizer",
    summary: "Small refinements will unlock the next level.",
    description: "You have the foundation and need a focused adjustment.",
    recommendations: ["Measure one high-leverage behavior"],
    giftAssetId: null,
    ctaAssetId: null,
  },
];

const questions: QuizQuestion[] = [
  {
    id: "current_focus",
    prompt: "What best describes your current focus?",
    required: true,
    options: [
      {
        id: "learn_basics",
        label: "Learn the basics",
        outcomeWeights: { builder: 2 },
      },
      {
        id: "fine_tune",
        label: "Fine-tune what already works",
        outcomeWeights: { optimizer: 3 },
      },
    ],
  },
  {
    id: "confidence",
    prompt: "How confident are you in the foundation?",
    required: true,
    options: [
      {
        id: "not_yet",
        label: "Not yet confident",
        outcomeWeights: { builder: 2 },
      },
      {
        id: "very",
        label: "Very confident",
        outcomeWeights: { optimizer: 1 },
      },
    ],
  },
];

test("returns the outcome with the highest accumulated weight", () => {
  const result = scoreQuizOutcome(questions, outcomes, {
    current_focus: "fine_tune",
    confidence: "very",
  });

  assert.equal(result.outcome.id, "optimizer");
  assert.deepEqual(result.scoreMap, { builder: 0, optimizer: 4 });
});

test("uses outcome order as the deterministic tie-break", () => {
  const tiedQuestion: QuizQuestion = {
    id: "tie_breaker",
    prompt: "Choose either path",
    required: true,
    options: [
      {
        id: "both",
        label: "Both fit",
        outcomeWeights: { builder: 1, optimizer: 1 },
      },
      {
        id: "neither",
        label: "Neither fits",
        outcomeWeights: { builder: 0, optimizer: 0 },
      },
    ],
  };
  const result = scoreQuizOutcome([tiedQuestion], outcomes, { tie_breaker: "both" });

  assert.equal(result.scoreMap.builder, result.scoreMap.optimizer);
  assert.equal(result.outcome.id, "builder");
});

test("rejects a missing required answer", () => {
  assert.throws(
    () => scoreQuizOutcome(questions, outcomes, { current_focus: "learn_basics" }),
    (error: unknown) =>
      error instanceof QuizScoringError && error.code === "MISSING_ANSWER",
  );
});

test("rejects an option that does not belong to the question", () => {
  assert.throws(
    () =>
      scoreQuizOutcome(questions, outcomes, {
        current_focus: "very",
        confidence: "not_yet",
      }),
    (error: unknown) =>
      error instanceof QuizScoringError && error.code === "INVALID_ANSWER",
  );
});
