import { z } from "zod";
import type { PublicBrandAppearance } from "./branding";
import {
  includeInLibraryInputSchema,
  type LibraryContext,
} from "./library";
import {
  parseYouTubeSource,
  presentationProfileSchema,
  presentationSelectionSchema,
  sourceMomentSchema,
  youtubeSourceSchema,
  type PresentationProfile,
  type PresentationSelection,
  type YouTubeSource,
} from "./presentation";

const stableIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, underscores, or hyphens");

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "URL must use http or https");

const optionalTrimmedText = (maxLength: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).max(maxLength).optional(),
);

export const MIN_AUTHORED_QUIZ_QUESTIONS = 5;
export const AUTHORED_QUIZ_OPTION_COUNT = 4;

export const quizOptionSchema = z.object({
  id: stableIdSchema,
  label: z.string().trim().min(1).max(240),
  outcomeWeights: z.record(stableIdSchema, z.number().finite().min(-100).max(100)),
  answerInsight: z.string().trim().min(1).max(600).optional(),
  evidence: z.string().trim().min(1).max(600).optional(),
  sourceRefs: z.array(sourceMomentSchema).max(3).optional(),
  dimensionWeights: z
    .record(stableIdSchema, z.number().finite().min(-100).max(100))
    .optional(),
}).strict().refine((option) => Object.keys(option.outcomeWeights).length === 1, {
  path: ["outcomeWeights"],
  message: "Each option must map to exactly one primary outcome",
}).refine((option) => !option.dimensionWeights || Object.keys(option.dimensionWeights).length > 0, {
  path: ["dimensionWeights"],
  message: "Dimension weights cannot be empty when provided",
});

export const quizQuestionSchema = z.object({
  id: stableIdSchema,
  prompt: z.string().trim().min(1).max(500),
  helpText: z.string().trim().max(500).optional(),
  required: z.boolean().default(true),
  options: z.array(quizOptionSchema).min(2).max(8),
}).strict();

/**
 * Persisted V1 quizzes may have fewer questions and answer choices, so
 * `quizQuestionSchema` intentionally remains tolerant at read/scoring
 * boundaries. New generation, editing, and publishing use this stricter
 * authoring contract.
 */
export const authoredQuizQuestionSchema = quizQuestionSchema.superRefine(
  (question, context) => {
    if (question.options.length !== AUTHORED_QUIZ_OPTION_COUNT) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: `Each question must have exactly ${AUTHORED_QUIZ_OPTION_COUNT} answer choices`,
      });
    }
  },
);

export const authoredQuizQuestionsSchema = z
  .array(authoredQuizQuestionSchema)
  .min(
    MIN_AUTHORED_QUIZ_QUESTIONS,
    `Interactive Quizzes must have at least ${MIN_AUTHORED_QUIZ_QUESTIONS} questions`,
  )
  .max(20);

export const quizDiagnosticDimensionSchema = z.object({
  id: stableIdSchema,
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(600),
  lowLabel: z.string().trim().min(1).max(120),
  highLabel: z.string().trim().min(1).max(120),
}).strict();

export const quizPrescriptionStepSchema = z.object({
  title: z.string().trim().min(1).max(180),
  action: z.string().trim().min(1).max(700),
  why: z.string().trim().min(1).max(600),
  timeframe: z.string().trim().min(1).max(120),
  successCriteria: z.string().trim().min(1).max(500),
  sourceRefs: z.array(sourceMomentSchema).max(5).optional(),
}).strict();

export const quizMistakeCorrectionSchema = z.object({
  mistake: z.string().trim().min(1).max(500),
  correction: z.string().trim().min(1).max(500),
}).strict();

export const quizImplementationAssetSchema = z.object({
  type: z.enum(["script", "template", "checklist", "worksheet"]),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(600),
  instructions: z.string().trim().min(1).max(1000),
  content: z.string().trim().min(20).max(8000),
}).strict();

export const quizOutcomePrescriptionSchema = z.object({
  strengths: z.array(z.string().trim().min(1).max(500)).min(1).max(6),
  bottleneck: z.string().trim().min(1).max(900),
  opportunity: z.string().trim().min(1).max(900),
  watchout: z.string().trim().min(1).max(700),
  quickWin: quizPrescriptionStepSchema,
  nextSteps: z.array(quizPrescriptionStepSchema).min(2).max(6),
  mistakes: z.array(quizMistakeCorrectionSchema).min(1).max(6),
  implementationAsset: quizImplementationAssetSchema.optional(),
}).strict();

export const quizOutcomeSchema = z.object({
  id: stableIdSchema,
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(600),
  description: z.string().trim().min(1).max(5000),
  recommendations: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
  giftAssetId: z.number().int().positive().nullable().default(null),
  ctaAssetId: z.number().int().positive().nullable().default(null),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  prescription: quizOutcomePrescriptionSchema.optional(),
}).strict();

export const supportedQuizLeadCaptureFields = ["firstName", "email"] as const;
export type QuizLeadCaptureField = (typeof supportedQuizLeadCaptureFields)[number];

export const quizLeadCaptureSchema = z.object({
  enabled: z.boolean().default(true),
  required: z.boolean().default(false),
  headline: z.string().trim().min(1).max(200).default("Where should we send your result?"),
  buttonText: z.string().trim().min(1).max(80).optional(),
  fields: z.array(z.enum(supportedQuizLeadCaptureFields)).min(1).max(2).optional(),
}).strict().superRefine((value, context) => {
  if (value.enabled && value.required && value.fields && !value.fields.includes("email")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fields"],
      message: "Email is required in fields when lead capture is required",
    });
  }

  if (!value.enabled && value.required) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["required"],
      message: "Disabled lead capture cannot be required",
    });
  }
});

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const quizThemeSchema = z.object({
  primaryColor: hexColorSchema.default("#2563EB"),
  secondaryColor: hexColorSchema.default("#10B981"),
  accentColor: hexColorSchema.optional(),
  backgroundColor: hexColorSchema.default("#F8FAFC"),
  fontFamily: z.string().trim().min(1).max(100).default("Inter"),
}).strict();

export const quizThemeModeSchema = z.enum(["brand", "custom"]);

export const quizDefinitionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  dimensions: z.array(quizDiagnosticDimensionSchema).min(1).max(8).optional(),
  questions: z.array(quizQuestionSchema).min(2).max(20),
  outcomes: z.array(quizOutcomeSchema).min(2).max(8),
  leadCapture: quizLeadCaptureSchema,
  theme: quizThemeSchema,
}).strict().superRefine((value, context) => {
  const outcomeIds = new Set(value.outcomes.map((outcome) => outcome.id));
  const dimensionIds = new Set((value.dimensions || []).map((dimension) => dimension.id));
  const questionIds = new Set<string>();
  const referencedOutcomes = new Set<string>();
  const referencedDimensions = new Set<string>();

  if (outcomeIds.size !== value.outcomes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["outcomes"],
      message: "Outcome IDs must be unique",
    });
  }

  if (dimensionIds.size !== (value.dimensions || []).length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dimensions"],
      message: "Diagnostic dimension IDs must be unique",
    });
  }

  value.questions.forEach((question, questionIndex) => {
    if (questionIds.has(question.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questions", questionIndex, "id"],
        message: "Question IDs must be unique",
      });
    }
    questionIds.add(question.id);

    const optionIds = new Set<string>();
    question.options.forEach((option, optionIndex) => {
      if (optionIds.has(option.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", questionIndex, "options", optionIndex, "id"],
          message: "Option IDs must be unique within a question",
        });
      }
      optionIds.add(option.id);

      const weightEntries = Object.entries(option.outcomeWeights);
      if (weightEntries.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", questionIndex, "options", optionIndex, "outcomeWeights"],
          message: "Every option must contribute to at least one outcome",
        });
      }

      weightEntries.forEach(([outcomeId]) => {
        if (!outcomeIds.has(outcomeId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["questions", questionIndex, "options", optionIndex, "outcomeWeights", outcomeId],
            message: `Unknown outcome ID: ${outcomeId}`,
          });
        } else {
          referencedOutcomes.add(outcomeId);
        }
      });

      Object.entries(option.dimensionWeights || {}).forEach(([dimensionId, weight]) => {
        if (!dimensionIds.has(dimensionId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["questions", questionIndex, "options", optionIndex, "dimensionWeights", dimensionId],
            message: `Unknown diagnostic dimension ID: ${dimensionId}`,
          });
        } else if (weight !== 0) {
          referencedDimensions.add(dimensionId);
        }
      });
    });
  });

  value.outcomes.forEach((outcome, outcomeIndex) => {
    if (!referencedOutcomes.has(outcome.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["outcomes", outcomeIndex, "id"],
        message: "Every outcome must be reachable from at least one option",
      });
    }
  });

  (value.dimensions || []).forEach((dimension, dimensionIndex) => {
    if (!referencedDimensions.has(dimension.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dimensions", dimensionIndex, "id"],
        message: "Every diagnostic dimension must have at least one non-zero option weight",
      });
    }
  });
});

/** Strict contract for quizzes created, edited, or newly published today. */
export const authoredQuizDefinitionSchema = quizDefinitionSchema.superRefine(
  (definition, context) => {
    if (definition.questions.length < MIN_AUTHORED_QUIZ_QUESTIONS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questions"],
        message: `Interactive Quizzes must have at least ${MIN_AUTHORED_QUIZ_QUESTIONS} questions`,
      });
    }

    definition.questions.forEach((question, questionIndex) => {
      if (question.options.length !== AUTHORED_QUIZ_OPTION_COUNT) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", questionIndex, "options"],
          message: `Each question must have exactly ${AUTHORED_QUIZ_OPTION_COUNT} answer choices`,
        });
      }
    });
  },
);

export const generateQuizRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  sourceContent: z.preprocess(
    (value) => typeof value === "string" && value.trim().length === 0 ? undefined : value,
    z.string().trim().min(50).max(100_000).optional(),
  ),
  youtubeUrl: optionalTrimmedText(2048).refine(
    (value) => value === undefined || parseYouTubeSource(value) !== null,
    "Enter a valid YouTube video URL",
  ),
  audience: optionalTrimmedText(500),
  objective: optionalTrimmedText(500),
  brandVoice: optionalTrimmedText(4000),
  questionCount: z.number().int().min(MIN_AUTHORED_QUIZ_QUESTIONS).max(12).default(6),
  outcomeCount: z.number().int().min(2).max(6).default(3),
  leadCapture: quizLeadCaptureSchema.optional(),
  brandId: z.number().int().positive().nullable().optional(),
  theme: quizThemeSchema.optional(),
  themeMode: quizThemeModeSchema.optional(),
  presentationSelection: presentationSelectionSchema.optional(),
  includeInLibrary: includeInLibraryInputSchema.optional().default(true),
}).strict().superRefine((value, context) => {
  const hasPastedSource = value.sourceContent !== undefined;
  const hasYouTubeSource = value.youtubeUrl !== undefined;

  if (!hasPastedSource && !hasYouTubeSource) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceContent"],
      message: "Paste source content or enter a YouTube video URL",
    });
  }

  if (hasPastedSource && hasYouTubeSource) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["youtubeUrl"],
      message: "Choose either a YouTube video or pasted source content",
    });
  }
});

export const updateQuizRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  dimensions: z.array(quizDiagnosticDimensionSchema).min(1).max(8).optional(),
  questions: authoredQuizQuestionsSchema.optional(),
  outcomes: z.array(quizOutcomeSchema).min(2).max(8).optional(),
  leadCapture: quizLeadCaptureSchema.optional(),
  theme: quizThemeSchema.optional(),
  themeMode: quizThemeModeSchema.optional(),
  presentationSelection: presentationSelectionSchema.optional(),
  includeInLibrary: includeInLibraryInputSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one quiz field is required",
});

export const completeQuizRequestSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.record(stableIdSchema, stableIdSchema),
  firstName: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(320).optional(),
}).strict();

export const quizAttemptIdSchema = z.object({
  attemptId: z.string().uuid(),
}).strict();

export const quizClickRequestSchema = z.object({
  kind: z.enum(["gift", "cta"]),
}).strict();

export const benefitAssetCreateSchema = z.object({
  brandId: z.number().int().positive().nullable().optional(),
  kind: z.enum(["free_gift", "cta"]),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  benefitSummary: z.string().trim().min(1).max(1000),
  url: httpUrlSchema,
  buttonLabel: z.string().trim().min(1).max(100),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  status: z.enum(["active", "archived"]).default("active"),
}).strict();

export const benefitAssetUpdateSchema = benefitAssetCreateSchema
  .omit({ brandId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one benefit asset field is required",
  });

export type QuizOption = z.infer<typeof quizOptionSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizDiagnosticDimension = z.infer<typeof quizDiagnosticDimensionSchema>;
export type QuizPrescriptionStep = z.infer<typeof quizPrescriptionStepSchema>;
export type QuizImplementationAsset = z.infer<typeof quizImplementationAssetSchema>;
export type QuizOutcomePrescription = z.infer<typeof quizOutcomePrescriptionSchema>;
export type QuizOutcome = z.infer<typeof quizOutcomeSchema>;
export type QuizLeadCapture = z.infer<typeof quizLeadCaptureSchema>;
export type QuizTheme = z.infer<typeof quizThemeSchema>;
export type QuizThemeMode = z.infer<typeof quizThemeModeSchema>;
export type { PresentationProfile, PresentationSelection, YouTubeSource };
export type QuizDefinition = z.infer<typeof quizDefinitionSchema>;
export type GenerateQuizRequest = z.infer<typeof generateQuizRequestSchema>;
export type UpdateQuizRequest = z.infer<typeof updateQuizRequestSchema>;
export type BenefitAssetCreate = z.infer<typeof benefitAssetCreateSchema>;
export type BenefitAssetUpdate = z.infer<typeof benefitAssetUpdateSchema>;

/**
 * Older persisted quizzes may contain lead fields the release cannot collect.
 * Normalize those rows at the storage boundary without widening new authoring.
 */
export function normalizeStoredQuizLeadCapture(value: unknown): QuizLeadCapture {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return quizLeadCaptureSchema.parse(value);
  }

  const candidate = { ...(value as Record<string, unknown>) };
  if ("fields" in candidate) {
    const fields = Array.isArray(candidate.fields)
      ? Array.from(new Set(candidate.fields.filter(
        (field): field is QuizLeadCaptureField =>
          supportedQuizLeadCaptureFields.includes(field as QuizLeadCaptureField),
      )))
      : [];

    if (candidate.required === true && !fields.includes("email")) {
      fields.push("email");
    }
    candidate.fields = fields.length > 0
      ? fields
      : [...supportedQuizLeadCaptureFields];
  }

  return quizLeadCaptureSchema.parse(candidate);
}

export function resolveQuizTheme(
  appearance: Pick<
    PublicBrandAppearance,
    "primaryColor" | "secondaryColor" | "accentColor" | "backgroundColor" | "bodyFontFamily"
  >,
  storedTheme: QuizTheme,
  mode: QuizThemeMode,
): QuizTheme {
  const brandTheme: QuizTheme = {
    primaryColor: appearance.primaryColor,
    secondaryColor: appearance.secondaryColor,
    accentColor: appearance.accentColor,
    backgroundColor: appearance.backgroundColor,
    fontFamily: appearance.bodyFontFamily,
  };
  return mode === "brand" ? brandTheme : { ...brandTheme, ...storedTheme };
}

export type PublicBenefitAsset = {
  title: string;
  description: string;
  benefitSummary: string;
  url: string;
  buttonLabel: string;
};

export type PublicQuizOutcome = {
  id: string;
  title: string;
  summary: string;
  description: string;
  recommendations: string[];
  prescription?: QuizOutcomePrescription;
};

const storedBenefitAssetSnapshotSchema = z.object({
  assetId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  benefitSummary: z.string().min(1).max(1000),
  url: httpUrlSchema,
  buttonLabel: z.string().min(1).max(100),
}).strict();

const publicQuizOutcomeSnapshotSchema = z.object({
  id: stableIdSchema,
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(600),
  description: z.string().min(1).max(5000),
  recommendations: z.array(z.string().min(1).max(500)).min(1).max(12),
  prescription: quizOutcomePrescriptionSchema.optional(),
}).strict();

/** Original immutable public-facing result data captured by released quizzes. */
export const quizResultSnapshotV1Schema = z.object({
  version: z.literal(1),
  outcome: publicQuizOutcomeSnapshotSchema,
  gift: storedBenefitAssetSnapshotSchema.nullable(),
  cta: storedBenefitAssetSnapshotSchema.nullable(),
}).strict();

const quizAnswerEvidenceSnapshotSchema = z.object({
  questionId: stableIdSchema,
  optionId: stableIdSchema,
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(240),
  answerInsight: z.string().min(1).max(600).optional(),
  evidence: z.string().min(1).max(600).optional(),
  sourceRefs: z.array(sourceMomentSchema).max(3).optional(),
}).strict();

const quizDimensionScoreSnapshotSchema = z.object({
  dimensionId: stableIdSchema,
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(600),
  lowLabel: z.string().min(1).max(120),
  highLabel: z.string().min(1).max(120),
  rawScore: z.number().finite(),
  minPossible: z.number().finite(),
  maxPossible: z.number().finite(),
  normalizedScore: z.number().int().min(0).max(100),
  direction: z.enum(["low", "balanced", "high"]),
  signalLabel: z.string().min(1).max(300),
}).strict();

/**
 * V2 keeps the exact selected answers and score inputs needed to explain a
 * result after its quiz definition changes. IDs stay inside the stored
 * snapshot; public projection deliberately strips them.
 */
export const quizResultSnapshotV2Schema = z.object({
  version: z.literal(2),
  outcome: publicQuizOutcomeSnapshotSchema,
  diagnostic: z.object({
    responsePattern: z.string().min(1).max(2400),
    answerEvidence: z.array(quizAnswerEvidenceSnapshotSchema).max(20),
    dimensionScores: z.array(quizDimensionScoreSnapshotSchema).max(8),
    strongestSignalDimensionId: stableIdSchema.nullable(),
    outcomeScoreMap: z.record(stableIdSchema, z.number().finite()),
  }).strict(),
  gift: storedBenefitAssetSnapshotSchema.nullable(),
  cta: storedBenefitAssetSnapshotSchema.nullable(),
}).strict().superRefine((snapshot, context) => {
  const dimensionIds = new Set(
    snapshot.diagnostic.dimensionScores.map((dimension) => dimension.dimensionId),
  );
  if (
    snapshot.diagnostic.strongestSignalDimensionId !== null
    && !dimensionIds.has(snapshot.diagnostic.strongestSignalDimensionId)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["diagnostic", "strongestSignalDimensionId"],
      message: "Strongest signal must reference a stored diagnostic dimension",
    });
  }
  if (!(snapshot.outcome.id in snapshot.diagnostic.outcomeScoreMap)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["diagnostic", "outcomeScoreMap"],
      message: "Outcome score map must include the selected outcome",
    });
  }
});

/** Immutable result data captured when an attempt completes. */
export const quizResultSnapshotSchema = z.union([
  quizResultSnapshotV1Schema,
  quizResultSnapshotV2Schema,
]);

export type QuizResultSnapshot = z.infer<typeof quizResultSnapshotSchema>;
export type QuizResultSnapshotV1 = z.infer<typeof quizResultSnapshotV1Schema>;
export type QuizResultSnapshotV2 = z.infer<typeof quizResultSnapshotV2Schema>;

export type PublicQuizProjection = {
  guide: {
    id: number;
    title: string;
    description: string | null;
    presentationProfile: PresentationProfile;
    sourceVideo: YouTubeSource | null;
  };
  landingPage: {
    customUrl: string;
    headline: string | null;
    subheadline: string | null;
    description: string | null;
    buttonText: string | null;
  };
  quiz: {
    questions: Array<{
      id: string;
      prompt: string;
      helpText?: string;
      required: boolean;
      options: Array<{ id: string; label: string }>;
    }>;
    leadCapture: QuizLeadCapture;
    theme: QuizTheme;
    themeMode: QuizThemeMode;
  };
  branding: PublicBrandAppearance;
  library: LibraryContext | null;
};

export type PublicQuizResult = {
  attemptId: string;
  outcome: PublicQuizOutcome;
  diagnostic?: {
    responsePattern: string;
    strongestSignal: {
      title: string;
      description: string;
      normalizedScore: number;
      direction: "low" | "balanced" | "high";
      label: string;
    } | null;
    dimensions: Array<{
      title: string;
      description: string;
      normalizedScore: number;
      direction: "low" | "balanced" | "high";
      label: string;
    }>;
    answerEvidence: Array<{
      question: string;
      answer: string;
      answerInsight?: string;
      evidence?: string;
      sourceRefs?: z.infer<typeof sourceMomentSchema>[];
    }>;
  };
  gift: PublicBenefitAsset | null;
  cta: PublicBenefitAsset | null;
};

export function publicQuizResultFromSnapshot(
  attemptId: string,
  snapshot: QuizResultSnapshot,
): PublicQuizResult {
  const projectAsset = (
    asset: NonNullable<QuizResultSnapshot["gift"]>,
  ): PublicBenefitAsset => {
    const { assetId: _assetId, ...publicAsset } = asset;
    return publicAsset;
  };

  const publicResult: PublicQuizResult = {
    attemptId,
    outcome: snapshot.outcome,
    gift: snapshot.gift ? projectAsset(snapshot.gift) : null,
    cta: snapshot.cta ? projectAsset(snapshot.cta) : null,
  };

  if (snapshot.version === 1) return publicResult;

  const projectDimension = (
    dimension: QuizResultSnapshotV2["diagnostic"]["dimensionScores"][number],
  ) => ({
    title: dimension.title,
    description: dimension.description,
    normalizedScore: dimension.normalizedScore,
    direction: dimension.direction,
    label: dimension.signalLabel,
  });
  const strongestSignal = snapshot.diagnostic.strongestSignalDimensionId
    ? snapshot.diagnostic.dimensionScores.find(
      (dimension) => dimension.dimensionId === snapshot.diagnostic.strongestSignalDimensionId,
    )
    : undefined;

  return {
    ...publicResult,
    diagnostic: {
      responsePattern: snapshot.diagnostic.responsePattern,
      strongestSignal: strongestSignal ? projectDimension(strongestSignal) : null,
      dimensions: snapshot.diagnostic.dimensionScores.map(projectDimension),
      answerEvidence: snapshot.diagnostic.answerEvidence.map((answer) => ({
        question: answer.question,
        answer: answer.answer,
        ...(answer.answerInsight ? { answerInsight: answer.answerInsight } : {}),
        ...(answer.evidence ? { evidence: answer.evidence } : {}),
        ...(answer.sourceRefs ? { sourceRefs: answer.sourceRefs } : {}),
      })),
    },
  };
}

export class QuizScoringError extends Error {
  constructor(
    public readonly code: "INVALID_QUIZ" | "MISSING_ANSWER" | "INVALID_ANSWER",
    message: string,
  ) {
    super(message);
    this.name = "QuizScoringError";
  }
}

/**
 * Scores a single-choice quiz. Ties resolve to the earliest outcome in the
 * supplied outcome array, making the result stable across runs.
 */
export function scoreQuizOutcome(
  questions: QuizQuestion[],
  outcomes: QuizOutcome[],
  answers: Record<string, string>,
): { outcome: QuizOutcome; scoreMap: Record<string, number> } {
  if (outcomes.length === 0) {
    throw new QuizScoringError("INVALID_QUIZ", "Quiz has no outcomes");
  }

  const questionIds = new Set(questions.map((question) => question.id));
  const unknownQuestionId = Object.keys(answers).find((questionId) => !questionIds.has(questionId));
  if (unknownQuestionId) {
    throw new QuizScoringError("INVALID_ANSWER", `Unknown question: ${unknownQuestionId}`);
  }

  const scoreMap = Object.fromEntries(outcomes.map((outcome) => [outcome.id, 0]));

  for (const question of questions) {
    const optionId = answers[question.id];
    if (!optionId) {
      if (question.required) {
        throw new QuizScoringError("MISSING_ANSWER", `Missing answer for question: ${question.id}`);
      }
      continue;
    }

    const option = question.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      throw new QuizScoringError(
        "INVALID_ANSWER",
        `Invalid option ${optionId} for question: ${question.id}`,
      );
    }

    for (const [outcomeId, weight] of Object.entries(option.outcomeWeights)) {
      if (!(outcomeId in scoreMap)) {
        throw new QuizScoringError("INVALID_QUIZ", `Option references unknown outcome: ${outcomeId}`);
      }
      scoreMap[outcomeId] += weight;
    }
  }

  let outcome = outcomes[0];
  let highestScore = scoreMap[outcome.id];
  for (let index = 1; index < outcomes.length; index += 1) {
    const candidate = outcomes[index];
    const candidateScore = scoreMap[candidate.id];
    if (candidateScore > highestScore) {
      outcome = candidate;
      highestScore = candidateScore;
    }
  }

  return { outcome, scoreMap };
}

type StoredQuizResultAsset = z.infer<typeof storedBenefitAssetSnapshotSchema>;

function publicOutcomeSnapshot(outcome: QuizOutcome): PublicQuizOutcome {
  return {
    id: outcome.id,
    title: outcome.title,
    summary: outcome.summary,
    description: outcome.description,
    recommendations: [...outcome.recommendations],
    ...(outcome.prescription
      ? { prescription: quizOutcomePrescriptionSchema.parse(outcome.prescription) }
      : {}),
  };
}

/**
 * Deterministically composes the permanent V2 result. This intentionally does
 * not call a model: the participant's exact selections, diagnostic scales,
 * and authored outcome prescription are enough to explain and reproduce it.
 */
export function composeQuizResultSnapshotV2(params: {
  definition: QuizDefinition;
  answers: Record<string, string>;
  expectedOutcomeId?: string;
  gift: StoredQuizResultAsset | null;
  cta: StoredQuizResultAsset | null;
}): QuizResultSnapshotV2 {
  const definition = quizDefinitionSchema.parse(params.definition);
  const { outcome, scoreMap } = scoreQuizOutcome(
    definition.questions,
    definition.outcomes,
    params.answers,
  );

  if (params.expectedOutcomeId && params.expectedOutcomeId !== outcome.id) {
    throw new QuizScoringError(
      "INVALID_QUIZ",
      "Selected outcome does not match the deterministic quiz score",
    );
  }

  const answerEvidence = definition.questions.flatMap((question) => {
    const optionId = params.answers[question.id];
    if (!optionId) return [];
    const option = question.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      // scoreQuizOutcome already guards this branch; keep the invariant local
      // so future scoring changes cannot create a partial result snapshot.
      throw new QuizScoringError(
        "INVALID_ANSWER",
        `Invalid option ${optionId} for question: ${question.id}`,
      );
    }
    return [{
      questionId: question.id,
      optionId: option.id,
      question: question.prompt,
      answer: option.label,
      ...(option.answerInsight ? { answerInsight: option.answerInsight } : {}),
      ...(option.evidence ? { evidence: option.evidence } : {}),
      ...(option.sourceRefs ? { sourceRefs: option.sourceRefs } : {}),
    }];
  });

  const dimensionScores = (definition.dimensions || []).map((dimension) => {
    let rawScore = 0;
    let minPossible = 0;
    let maxPossible = 0;

    definition.questions.forEach((question) => {
      const selectedOptionId = params.answers[question.id];
      if (!selectedOptionId) return;
      const selectedOption = question.options.find((option) => option.id === selectedOptionId);
      if (!selectedOption) return;

      const possibleWeights = question.options.map(
        (option) => option.dimensionWeights?.[dimension.id] ?? 0,
      );
      rawScore += selectedOption.dimensionWeights?.[dimension.id] ?? 0;
      minPossible += Math.min(...possibleWeights);
      maxPossible += Math.max(...possibleWeights);
    });

    const scoreRange = maxPossible - minPossible;
    const unboundedScore = scoreRange === 0
      ? 50
      : Math.round(((rawScore - minPossible) / scoreRange) * 100);
    const normalizedScore = Math.max(0, Math.min(100, unboundedScore));
    const direction = normalizedScore < 40
      ? "low" as const
      : normalizedScore > 60
        ? "high" as const
        : "balanced" as const;
    const signalLabel = direction === "low"
      ? dimension.lowLabel
      : direction === "high"
        ? dimension.highLabel
        : `${dimension.lowLabel} / ${dimension.highLabel}`;

    return {
      dimensionId: dimension.id,
      title: dimension.title,
      description: dimension.description,
      lowLabel: dimension.lowLabel,
      highLabel: dimension.highLabel,
      rawScore,
      minPossible,
      maxPossible,
      normalizedScore,
      direction,
      signalLabel,
    };
  });

  let strongestSignal: (typeof dimensionScores)[number] | undefined = dimensionScores[0];
  let strongestDistance = strongestSignal
    ? Math.abs(strongestSignal.normalizedScore - 50)
    : 0;
  for (let index = 1; index < dimensionScores.length; index += 1) {
    const candidate = dimensionScores[index];
    const candidateDistance = Math.abs(candidate.normalizedScore - 50);
    if (candidateDistance > strongestDistance) {
      strongestSignal = candidate;
      strongestDistance = candidateDistance;
    }
  }
  if (strongestDistance === 0) strongestSignal = undefined;

  const responseInsights = Array.from(new Set(answerEvidence
    .map((answer) => answer.answerInsight || answer.evidence)
    .filter((insight): insight is string => Boolean(insight))))
    .slice(0, 3);
  const responsePattern = responseInsights.length > 0
    ? responseInsights.join(" ")
    : strongestSignal
      ? `Your clearest response pattern is ${strongestSignal.title}: ${strongestSignal.signalLabel}.`
      : `Your answers most strongly align with ${outcome.title}.`;

  return quizResultSnapshotV2Schema.parse({
    version: 2,
    outcome: publicOutcomeSnapshot(outcome),
    diagnostic: {
      responsePattern,
      answerEvidence,
      dimensionScores,
      strongestSignalDimensionId: strongestSignal?.dimensionId ?? null,
      outcomeScoreMap: scoreMap,
    },
    gift: params.gift,
    cta: params.cta,
  });
}
