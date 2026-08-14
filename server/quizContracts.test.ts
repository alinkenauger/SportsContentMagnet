import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import {
  benefitAssetCreateSchema,
  benefitAssetUpdateSchema,
  completeQuizRequestSchema,
  normalizeStoredQuizLeadCapture,
  publicQuizResultFromSnapshot,
  quizDefinitionSchema,
  quizLeadCaptureSchema,
  quizResultSnapshotSchema,
  QuizScoringError,
  scoreQuizOutcome,
  updateQuizRequestSchema,
  type QuizDefinition,
} from "@shared/quiz";

function validQuiz(): QuizDefinition {
  return {
    title: "What should you improve next?",
    description: "Answer two questions to find the most useful next step.",
    questions: [
      {
        id: "focus",
        prompt: "Where is the biggest gap?",
        required: true,
        options: [
          { id: "foundation", label: "Foundation", outcomeWeights: { builder: 2 } },
          { id: "details", label: "Details", outcomeWeights: { optimizer: 2 } },
        ],
      },
      {
        id: "confidence",
        prompt: "How confident are you?",
        required: false,
        options: [
          { id: "low", label: "Not yet", outcomeWeights: { builder: 1 } },
          { id: "high", label: "Very", outcomeWeights: { optimizer: 1 } },
        ],
      },
    ],
    outcomes: [
      {
        id: "builder",
        title: "Builder",
        summary: "Strengthen the foundation.",
        description: "Start with the core behavior before adding complexity.",
        recommendations: ["Choose one foundational habit"],
        giftAssetId: null,
        ctaAssetId: null,
      },
      {
        id: "optimizer",
        title: "Optimizer",
        summary: "Refine the details.",
        description: "Use a focused measurement to improve what already works.",
        recommendations: ["Measure one high-leverage behavior"],
        giftAssetId: null,
        ctaAssetId: null,
      },
    ],
    leadCapture: {
      enabled: true,
      required: false,
      headline: "Where should we send your result?",
      fields: ["firstName", "email"],
    },
    theme: {
      primaryColor: "#111111",
      secondaryColor: "#222222",
      backgroundColor: "#FFFFFF",
      fontFamily: "Inter",
    },
  };
}

test("quiz contracts accept a reachable definition and optional unanswered questions", () => {
  const quiz = quizDefinitionSchema.parse(validQuiz());
  const scored = scoreQuizOutcome(quiz.questions, quiz.outcomes, { focus: "foundation" });

  assert.equal(scored.outcome.id, "builder");
  assert.deepEqual(scored.scoreMap, { builder: 2, optimizer: 0 });
});

test("quiz contracts reject duplicate IDs, unknown mappings, and unreachable outcomes", () => {
  const duplicateQuestion = structuredClone(validQuiz());
  duplicateQuestion.questions[1].id = duplicateQuestion.questions[0].id;
  assert.throws(() => quizDefinitionSchema.parse(duplicateQuestion), z.ZodError);

  const unknownMapping = structuredClone(validQuiz());
  unknownMapping.questions[0].options[0].outcomeWeights = { missing: 1 };
  assert.throws(() => quizDefinitionSchema.parse(unknownMapping), z.ZodError);

  const unreachable = structuredClone(validQuiz());
  unreachable.questions.forEach((question) => {
    question.options.forEach((option) => {
      option.outcomeWeights = { builder: 1 };
    });
  });
  assert.throws(() => quizDefinitionSchema.parse(unreachable), z.ZodError);
});

test("required lead capture must collect email and completion validates identity fields", () => {
  const quiz = structuredClone(validQuiz());
  quiz.leadCapture = {
    enabled: true,
    required: true,
    headline: "Reveal your result",
    fields: ["firstName"],
  };
  assert.throws(() => quizDefinitionSchema.parse(quiz), z.ZodError);

  assert.throws(
    () => completeQuizRequestSchema.parse({
      attemptId: "00000000-0000-4000-8000-000000000001",
      answers: { focus: "foundation" },
      email: "not-an-email",
    }),
    z.ZodError,
  );
});

test("lead capture authoring only accepts fields the public runner collects", () => {
  const base = {
    enabled: true,
    required: false,
    headline: "Reveal your result",
  };

  for (const unsupportedField of ["lastName", "phone"]) {
    assert.throws(
      () => quizLeadCaptureSchema.parse({ ...base, fields: [unsupportedField] }),
      z.ZodError,
    );
  }
  assert.deepEqual(
    quizLeadCaptureSchema.parse({ ...base, fields: ["firstName", "email"] }).fields,
    ["firstName", "email"],
  );
});

test("legacy persisted lead fields normalize to a safe public contract", () => {
  assert.deepEqual(
    normalizeStoredQuizLeadCapture({
      enabled: true,
      required: true,
      headline: "Reveal your result",
      fields: ["phone", "firstName", "lastName"],
    }).fields,
    ["firstName", "email"],
  );

  assert.deepEqual(
    normalizeStoredQuizLeadCapture({
      enabled: true,
      required: false,
      headline: "Reveal your result",
      fields: ["phone"],
    }).fields,
    ["firstName", "email"],
  );
});

test("completed quiz snapshots project stable public outcomes without internal asset IDs", () => {
  const snapshot = quizResultSnapshotSchema.parse({
    version: 1,
    outcome: {
      id: "builder",
      title: "The Builder",
      summary: "Start with the foundation.",
      description: "A concrete next-step plan captured when the quiz was completed.",
      recommendations: ["Choose one foundational habit"],
    },
    gift: {
      assetId: 42,
      title: "Foundation worksheet",
      description: "A one-page worksheet.",
      benefitSummary: "Turn the result into action.",
      url: "https://example.com/original-gift",
      buttonLabel: "Get the worksheet",
    },
    cta: null,
  });

  const result = publicQuizResultFromSnapshot(
    "00000000-0000-4000-8000-000000000001",
    snapshot,
  );
  assert.equal(result.outcome.title, "The Builder");
  assert.equal(result.gift?.url, "https://example.com/original-gift");
  assert.equal("assetId" in (result.gift || {}), false);
});

test("benefit assets only accept web URLs and mutation contracts reject empty updates", () => {
  const baseAsset = {
    kind: "free_gift" as const,
    title: "Reset sheet",
    description: "A one-page reset.",
    benefitSummary: "Choose the next move.",
    url: "https://example.com/reset",
    buttonLabel: "Get the sheet",
  };

  assert.equal(benefitAssetCreateSchema.parse(baseAsset).status, "active");
  for (const url of ["javascript:alert(1)", "data:text/html,unsafe", "ftp://example.com/file"]) {
    assert.throws(() => benefitAssetCreateSchema.parse({ ...baseAsset, url }), z.ZodError);
  }
  assert.throws(() => benefitAssetUpdateSchema.parse({}), z.ZodError);
  assert.throws(() => updateQuizRequestSchema.parse({}), z.ZodError);
});

test("scoring rejects unknown questions, missing outcomes, and stale outcome mappings", () => {
  const quiz = validQuiz();
  assert.throws(
    () => scoreQuizOutcome(quiz.questions, quiz.outcomes, { unknown: "answer" }),
    (error: unknown) => error instanceof QuizScoringError && error.code === "INVALID_ANSWER",
  );
  assert.throws(
    () => scoreQuizOutcome(quiz.questions, [], { focus: "foundation" }),
    (error: unknown) => error instanceof QuizScoringError && error.code === "INVALID_QUIZ",
  );

  const staleQuestions = structuredClone(quiz.questions);
  staleQuestions[0].options[0].outcomeWeights = { removed_outcome: 1 };
  assert.throws(
    () => scoreQuizOutcome(staleQuestions, quiz.outcomes, { focus: "foundation" }),
    (error: unknown) => error instanceof QuizScoringError && error.code === "INVALID_QUIZ",
  );
});
