import { z } from "zod";
import type { PublicBrandAppearance } from "./branding";

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

export const quizOptionSchema = z.object({
  id: stableIdSchema,
  label: z.string().trim().min(1).max(240),
  outcomeWeights: z.record(stableIdSchema, z.number().finite().min(-100).max(100)),
}).strict().refine((option) => Object.keys(option.outcomeWeights).length === 1, {
  path: ["outcomeWeights"],
  message: "Each option must map to exactly one primary outcome",
});

export const quizQuestionSchema = z.object({
  id: stableIdSchema,
  prompt: z.string().trim().min(1).max(500),
  helpText: z.string().trim().max(500).optional(),
  required: z.boolean().default(true),
  options: z.array(quizOptionSchema).min(2).max(8),
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
  questions: z.array(quizQuestionSchema).min(2).max(20),
  outcomes: z.array(quizOutcomeSchema).min(2).max(8),
  leadCapture: quizLeadCaptureSchema,
  theme: quizThemeSchema,
}).strict().superRefine((value, context) => {
  const outcomeIds = new Set(value.outcomes.map((outcome) => outcome.id));
  const questionIds = new Set<string>();
  const referencedOutcomes = new Set<string>();

  if (outcomeIds.size !== value.outcomes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["outcomes"],
      message: "Outcome IDs must be unique",
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
});

export const generateQuizRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  sourceContent: z.string().trim().min(50).max(100_000),
  audience: optionalTrimmedText(500),
  objective: optionalTrimmedText(500),
  questionCount: z.number().int().min(2).max(12).default(6),
  outcomeCount: z.number().int().min(2).max(6).default(3),
  leadCapture: quizLeadCaptureSchema.optional(),
  brandId: z.number().int().positive().nullable().optional(),
  theme: quizThemeSchema.optional(),
  themeMode: quizThemeModeSchema.optional(),
}).strict();

export const updateQuizRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  questions: z.array(quizQuestionSchema).min(2).max(20).optional(),
  outcomes: z.array(quizOutcomeSchema).min(2).max(8).optional(),
  leadCapture: quizLeadCaptureSchema.optional(),
  theme: quizThemeSchema.optional(),
  themeMode: quizThemeModeSchema.optional(),
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
export type QuizOutcome = z.infer<typeof quizOutcomeSchema>;
export type QuizLeadCapture = z.infer<typeof quizLeadCaptureSchema>;
export type QuizTheme = z.infer<typeof quizThemeSchema>;
export type QuizThemeMode = z.infer<typeof quizThemeModeSchema>;
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
}).strict();

/** Immutable public-facing result data captured when an attempt completes. */
export const quizResultSnapshotSchema = z.object({
  version: z.literal(1),
  outcome: publicQuizOutcomeSnapshotSchema,
  gift: storedBenefitAssetSnapshotSchema.nullable(),
  cta: storedBenefitAssetSnapshotSchema.nullable(),
}).strict();

export type QuizResultSnapshot = z.infer<typeof quizResultSnapshotSchema>;

export type PublicQuizProjection = {
  guide: {
    id: number;
    title: string;
    description: string | null;
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
};

export type PublicQuizResult = {
  attemptId: string;
  outcome: PublicQuizOutcome;
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

  return {
    attemptId,
    outcome: snapshot.outcome,
    gift: snapshot.gift ? projectAsset(snapshot.gift) : null,
    cta: snapshot.cta ? projectAsset(snapshot.cta) : null,
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
