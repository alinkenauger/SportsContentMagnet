import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import {
  authoredQuizDefinitionSchema,
  benefitAssetCreateSchema,
  benefitAssetUpdateSchema,
  composeQuizResultSnapshotV2,
  completeQuizRequestSchema,
  generateQuizRequestSchema,
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

function validAuthoredQuiz(): QuizDefinition {
  const quiz = structuredClone(validQuiz());
  quiz.questions = Array.from({ length: 5 }, (_, questionIndex) => ({
    id: `question_${questionIndex + 1}`,
    prompt: `Diagnostic question ${questionIndex + 1}`,
    required: true,
    options: Array.from({ length: 4 }, (_, optionIndex) => {
      const outcomeId = optionIndex % 2 === 0 ? "builder" : "optimizer";
      return {
        id: `answer_${questionIndex + 1}_${optionIndex + 1}`,
        label: `Answer ${optionIndex + 1}`,
        outcomeWeights: { [outcomeId]: 1 },
      };
    }),
  }));
  return authoredQuizDefinitionSchema.parse(quiz);
}

function validAnswerAwareQuiz(): QuizDefinition {
  const quiz = validQuiz();
  quiz.dimensions = [
    {
      id: "readiness",
      title: "Readiness",
      description: "How prepared the participant is to move from foundations to refinement.",
      lowLabel: "Foundation first",
      highLabel: "Ready to optimize",
    },
    {
      id: "execution",
      title: "Execution clarity",
      description: "How clearly the participant can turn the idea into action.",
      lowLabel: "Needs a concrete plan",
      highLabel: "Clear execution path",
    },
  ];

  const optionSignals = {
    foundation: {
      answerInsight: "You are prioritizing a stable foundation before adding complexity.",
      evidence: "The source recommends securing the core behavior before refinement.",
      dimensionWeights: { readiness: -2, execution: -1 },
    },
    details: {
      answerInsight: "You already have a foundation and are looking for leverage in the details.",
      evidence: "Choosing refinement signals that the core behavior is already repeatable.",
      dimensionWeights: { readiness: 2, execution: 1 },
    },
    low: {
      answerInsight: "Your next move needs more structure and a visible finish line.",
      evidence: "Low confidence is most actionable when converted into an observable step.",
      dimensionWeights: { readiness: -1, execution: -2 },
    },
    high: {
      answerInsight: "You can move quickly once the highest-leverage adjustment is named.",
      evidence: "High confidence makes a focused refinement more useful than another overview.",
      dimensionWeights: { readiness: 1, execution: 2 },
    },
  } as const;

  quiz.questions.forEach((question) => {
    question.options.forEach((option) => {
      Object.assign(option, optionSignals[option.id as keyof typeof optionSignals]);
    });
  });

  quiz.outcomes.forEach((outcome) => {
    outcome.prescription = {
      strengths: ["You can identify the part of the process that deserves attention."],
      bottleneck: "The next action is not yet specific enough to repeat.",
      opportunity: "Turn the diagnosis into one observable behavior this week.",
      watchout: "Adding more ideas before the first behavior is stable will dilute progress.",
      quickWin: {
        title: "Name the next visible move",
        action: "Write one action that can be completed without further interpretation.",
        why: "A visible action removes ambiguity and creates momentum.",
        timeframe: "Today — 10 minutes",
        successCriteria: "The action has one owner and one observable finish line.",
      },
      nextSteps: [
        {
          title: "Practice the core behavior",
          action: "Repeat the selected behavior in three real situations.",
          why: "Repetition reveals whether the foundation is actually stable.",
          timeframe: "This week",
          successCriteria: "Three repetitions are recorded with the same success measure.",
        },
        {
          title: "Review the evidence",
          action: "Compare the three repetitions and choose one adjustment.",
          why: "Evidence keeps the next decision focused.",
          timeframe: "At the end of the week",
          successCriteria: "One adjustment is selected from observed results.",
        },
      ],
      mistakes: [{
        mistake: "Changing several variables at once.",
        correction: "Keep one behavior fixed long enough to evaluate it.",
      }],
      implementationAsset: {
        type: "worksheet",
        title: `${outcome.title} one-action worksheet`,
        description: "Turn this result into one visible behavior with a clear finish line.",
        instructions: "Fill in each prompt, then keep the completed line where you will see it this week.",
        content: "MY ONE ACTION\n\nThe behavior I will repeat: [write one observable behavior]\nWhere I will use it: [real situation]\nI will know it worked when: [visible finish line]\nMy review date: [date]",
      },
    };
  });

  return quizDefinitionSchema.parse(quiz);
}

test("quiz contracts accept a reachable definition and optional unanswered questions", () => {
  const quiz = quizDefinitionSchema.parse(validQuiz());
  const scored = scoreQuizOutcome(quiz.questions, quiz.outcomes, { focus: "foundation" });

  assert.equal(scored.outcome.id, "builder");
  assert.deepEqual(scored.scoreMap, { builder: 2, optimizer: 0 });
});

test("new quiz authoring requires at least five questions with exactly four answers", () => {
  const legacyQuiz = validQuiz();

  // Stored and already-published V1 quizzes remain readable and scoreable.
  assert.doesNotThrow(() => quizDefinitionSchema.parse(legacyQuiz));
  assert.throws(() => authoredQuizDefinitionSchema.parse(legacyQuiz), z.ZodError);

  const authoredQuiz = validAuthoredQuiz();
  assert.equal(authoredQuiz.questions.length, 5);
  authoredQuiz.questions.forEach((question) => assert.equal(question.options.length, 4));

  const tooFewAnswers = structuredClone(authoredQuiz);
  tooFewAnswers.questions[0].options.pop();
  assert.throws(() => authoredQuizDefinitionSchema.parse(tooFewAnswers), z.ZodError);

  const tooManyAnswers = structuredClone(authoredQuiz);
  tooManyAnswers.questions[0].options.push({
    id: "answer_1_5",
    label: "Answer 5",
    outcomeWeights: { builder: 1 },
  });
  assert.throws(() => authoredQuizDefinitionSchema.parse(tooManyAnswers), z.ZodError);
});

test("quiz generation and editor update contracts enforce the new quiz shape", () => {
  const generateRequest = {
    title: "Find your next step",
    sourceContent: "A source with enough useful detail to generate a focused diagnostic quiz and practical results.",
    questionCount: 5,
    outcomeCount: 2,
  };

  assert.equal(generateQuizRequestSchema.parse(generateRequest).questionCount, 5);
  assert.throws(
    () => generateQuizRequestSchema.parse({ ...generateRequest, questionCount: 4 }),
    z.ZodError,
  );
  assert.doesNotThrow(() => updateQuizRequestSchema.parse({
    questions: validAuthoredQuiz().questions,
  }));
  assert.throws(
    () => updateQuizRequestSchema.parse({ questions: validQuiz().questions }),
    z.ZodError,
  );
});

test("quiz generation accepts exactly one grounded source", () => {
  const request = {
    title: "Find your next step",
    questionCount: 5,
    outcomeCount: 2,
  };
  const pastedSource = "A grounded lesson with enough useful detail to create a diagnostic quiz and practical next steps.";
  const youtubeUrl = "https://www.youtube.com/watch?v=WvUSs6yTltE";

  assert.equal(
    generateQuizRequestSchema.parse({ ...request, sourceContent: pastedSource }).sourceContent,
    pastedSource,
  );
  assert.equal(
    generateQuizRequestSchema.parse({ ...request, youtubeUrl }).youtubeUrl,
    youtubeUrl,
  );
  assert.throws(() => generateQuizRequestSchema.parse(request), z.ZodError);
  assert.throws(
    () => generateQuizRequestSchema.parse({ ...request, youtubeUrl: "https://example.com/watch?v=WvUSs6yTltE" }),
    z.ZodError,
  );
  assert.throws(
    () => generateQuizRequestSchema.parse({ ...request, sourceContent: pastedSource, youtubeUrl }),
    z.ZodError,
  );
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

test("V1 quiz definitions and result snapshots remain valid without diagnostic fields", () => {
  const quiz = quizDefinitionSchema.parse(validQuiz());
  assert.equal(quiz.dimensions, undefined);
  assert.equal(quiz.questions[0].options[0].answerInsight, undefined);
  assert.equal(quiz.outcomes[0].prescription, undefined);

  const snapshot = quizResultSnapshotSchema.parse({
    version: 1,
    outcome: {
      id: "builder",
      title: "Builder",
      summary: "Strengthen the foundation.",
      description: "Start with the core behavior before adding complexity.",
      recommendations: ["Choose one foundational habit"],
    },
    gift: null,
    cta: null,
  });
  assert.equal(snapshot.version, 1);
});

test("stored prescriptions remain valid without a ready-to-use implementation asset", () => {
  const storedQuiz = structuredClone(validAnswerAwareQuiz());
  storedQuiz.outcomes.forEach((outcome) => {
    if (outcome.prescription) delete outcome.prescription.implementationAsset;
  });

  const parsed = quizDefinitionSchema.parse(storedQuiz);
  assert.equal(parsed.outcomes[0].prescription?.implementationAsset, undefined);
});

test("implementation assets use a strict, bounded ready-to-use contract", () => {
  const quiz = validAnswerAwareQuiz();
  const asset = quiz.outcomes[0].prescription?.implementationAsset;

  assert.equal(asset?.type, "worksheet");
  assert.match(asset?.content || "", /MY ONE ACTION/);

  const invalidType = structuredClone(quiz) as unknown as {
    outcomes: Array<{ prescription: { implementationAsset: { type: string } } }>;
  };
  invalidType.outcomes[0].prescription.implementationAsset.type = "download";
  assert.throws(() => quizDefinitionSchema.parse(invalidType), z.ZodError);

  const oversized = structuredClone(quiz);
  oversized.outcomes[0].prescription!.implementationAsset!.content = "x".repeat(8001);
  assert.throws(() => quizDefinitionSchema.parse(oversized), z.ZodError);
});

test("V2 composition captures exact answers, normalized dimensions, and rich prescriptions", () => {
  const quiz = validAnswerAwareQuiz();
  const snapshot = composeQuizResultSnapshotV2({
    definition: quiz,
    answers: { focus: "foundation", confidence: "low" },
    expectedOutcomeId: "builder",
    gift: null,
    cta: null,
  });

  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.outcome.id, "builder");
  assert.equal(snapshot.outcome.prescription?.quickWin.timeframe, "Today — 10 minutes");
  assert.equal(snapshot.outcome.prescription?.implementationAsset?.type, "worksheet");
  assert.match(snapshot.outcome.prescription?.implementationAsset?.content || "", /visible finish line/);
  assert.deepEqual(snapshot.diagnostic.outcomeScoreMap, { builder: 3, optimizer: 0 });
  assert.deepEqual(
    snapshot.diagnostic.answerEvidence.map((answer) => ({
      questionId: answer.questionId,
      optionId: answer.optionId,
    })),
    [
      { questionId: "focus", optionId: "foundation" },
      { questionId: "confidence", optionId: "low" },
    ],
  );
  assert.deepEqual(
    snapshot.diagnostic.dimensionScores.map((dimension) => ({
      id: dimension.dimensionId,
      raw: dimension.rawScore,
      normalized: dimension.normalizedScore,
      direction: dimension.direction,
    })),
    [
      { id: "readiness", raw: -3, normalized: 0, direction: "low" },
      { id: "execution", raw: -3, normalized: 0, direction: "low" },
    ],
  );
  assert.equal(snapshot.diagnostic.strongestSignalDimensionId, "readiness");
  assert.match(snapshot.diagnostic.responsePattern, /stable foundation/);
  assert.match(snapshot.diagnostic.responsePattern, /visible finish line/);
  assert.equal("confidence" in snapshot.diagnostic, false);
});

test("V2 public results expose useful evidence while minimizing internal scoring data", () => {
  const snapshot = composeQuizResultSnapshotV2({
    definition: validAnswerAwareQuiz(),
    answers: { focus: "details", confidence: "high" },
    expectedOutcomeId: "optimizer",
    gift: {
      assetId: 84,
      title: "Optimization worksheet",
      description: "A focused worksheet.",
      benefitSummary: "Choose one high-leverage adjustment.",
      url: "https://example.com/optimization",
      buttonLabel: "Get the worksheet",
    },
    cta: null,
  });
  const result = publicQuizResultFromSnapshot(
    "00000000-0000-4000-8000-000000000002",
    snapshot,
  );

  assert.equal(result.diagnostic?.strongestSignal?.title, "Readiness");
  assert.equal(result.diagnostic?.strongestSignal?.normalizedScore, 100);
  assert.equal(result.diagnostic?.answerEvidence[0].answer, "Details");
  assert.equal(result.outcome.prescription?.nextSteps[0].why.length! > 0, true);
  assert.match(result.outcome.prescription?.implementationAsset?.content || "", /MY ONE ACTION/);
  assert.equal(result.gift?.url, "https://example.com/optimization");

  const serialized = JSON.stringify(result);
  for (const privateField of [
    "assetId",
    "questionId",
    "optionId",
    "dimensionId",
    "outcomeScoreMap",
    "rawScore",
    "minPossible",
    "maxPossible",
    "strongestSignalDimensionId",
  ]) {
    assert.equal(serialized.includes(`\"${privateField}\"`), false, privateField);
  }
});

test("V2 contracts reject invalid diagnostic mappings and inconsistent selected outcomes", () => {
  const unknownDimension = structuredClone(validAnswerAwareQuiz());
  unknownDimension.questions[0].options[0].dimensionWeights = { unknown_dimension: 2 };
  assert.throws(() => quizDefinitionSchema.parse(unknownDimension), z.ZodError);

  const unscoredDimension = structuredClone(validAnswerAwareQuiz());
  unscoredDimension.questions.forEach((question) => {
    question.options.forEach((option) => {
      option.dimensionWeights = { ...option.dimensionWeights, readiness: 0 };
    });
  });
  assert.throws(() => quizDefinitionSchema.parse(unscoredDimension), z.ZodError);

  assert.throws(
    () => composeQuizResultSnapshotV2({
      definition: validAnswerAwareQuiz(),
      answers: { focus: "foundation", confidence: "low" },
      expectedOutcomeId: "optimizer",
      gift: null,
      cta: null,
    }),
    (error: unknown) => error instanceof QuizScoringError && error.code === "INVALID_QUIZ",
  );
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
