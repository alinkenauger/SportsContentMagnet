import { z } from "zod";

const stableIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, underscores, or hyphens");

const nonEmptyText = (maxLength: number) => z.string().trim().min(1).max(maxLength);

const optionalText = (maxLength: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim().length === 0 ? undefined : value,
  nonEmptyText(maxLength).optional(),
);

export const guideFormatSchema = z.enum([
  "playbook",
  "checklist",
  "workbook",
  "action_plan",
  "template_pack",
  "report",
]);

export const guideCreationBriefSchema = z.object({
  format: guideFormatSchema.default("report"),
  audience: optionalText(500),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "all"]).optional(),
  focus: optionalText(1000),
  desiredOutcome: optionalText(1000),
  availableTime: optionalText(200),
  customInstructions: optionalText(2000),
}).strict();

const legacySectionTypeSchema = z.enum([
  "tip",
  "drill",
  "technique",
  "equipment",
  "section",
]);

const canonicalSectionTypeSchema = z.enum(["tip", "drill", "technique", "equipment"]);

const drillBreakdownSchema = z.object({
  painPoint: optionalText(1000),
  technique: optionalText(2000),
  repetitions: optionalText(500),
  duration: optionalText(500),
  keyFocus: optionalText(1000),
  focus: optionalText(1000),
  tips: z.array(nonEmptyText(500)).max(20).optional(),
  verbalSteps: z.array(nonEmptyText(1000)).max(30).optional(),
}).strict();

export const legacyGuideSectionSchema = z.object({
  title: nonEmptyText(300),
  content: nonEmptyText(20_000),
  type: legacySectionTypeSchema,
  timestamp: z.union([nonEmptyText(30), z.number().finite().nonnegative()]).optional(),
  timestampSeconds: z.number().finite().nonnegative().optional(),
  duration: z.number().finite().positive().optional(),
  durationSeconds: z.number().finite().positive().optional(),
  drillBreakdown: drillBreakdownSchema.optional(),
}).strict();

export const guideContentV1Schema = z.object({
  title: nonEmptyText(300),
  introduction: nonEmptyText(20_000),
  sections: z.array(legacyGuideSectionSchema).min(1).max(100),
  conclusion: nonEmptyText(20_000),
  callToAction: nonEmptyText(5000),
  nextSteps: optionalText(10_000),
  drillBreakdowns: z.array(z.unknown()).max(100).optional(),
}).strict();

const sourceRefSchema = z.object({
  label: nonEmptyText(300),
  startSeconds: z.number().finite().nonnegative().optional(),
  endSeconds: z.number().finite().nonnegative().optional(),
}).strict().superRefine((value, context) => {
  if (
    value.startSeconds !== undefined &&
    value.endSeconds !== undefined &&
    value.endSeconds < value.startSeconds
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endSeconds"],
      message: "End time must not precede start time",
    });
  }
});

const stepSchema = z.object({
  id: stableIdSchema,
  title: nonEmptyText(300),
  instruction: nonEmptyText(3000),
  why: optionalText(2000),
  duration: optionalText(200),
  successCriteria: optionalText(1000),
  commonMistake: optionalText(1000),
  fix: optionalText(1000),
}).strict();

const checklistItemSchema = z.object({
  id: stableIdSchema,
  text: nonEmptyText(1000),
  why: optionalText(1000),
  evidence: optionalText(1000),
  required: z.boolean().default(false),
}).strict();

const worksheetPromptSchema = z.object({
  id: stableIdSchema,
  prompt: nonEmptyText(1500),
  responseType: z.enum(["short_text", "long_text", "number", "choice", "rating"]),
  placeholder: optionalText(500),
  options: z.array(nonEmptyText(300)).min(2).max(20).optional(),
}).strict().superRefine((value, context) => {
  if (value.responseType === "choice" && !value.options) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["options"],
      message: "Choice prompts require options",
    });
  }
});

const metricSchema = z.object({
  id: stableIdSchema,
  label: nonEmptyText(300),
  target: optionalText(500),
  measurement: nonEmptyText(1000),
}).strict();

export const guideBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rich_text"),
    text: nonEmptyText(20_000),
  }).strict(),
  z.object({
    type: z.literal("steps"),
    title: optionalText(300),
    items: z.array(stepSchema).min(1).max(30),
  }).strict(),
  z.object({
    type: z.literal("checklist"),
    title: optionalText(300),
    items: z.array(checklistItemSchema).min(1).max(100),
  }).strict(),
  z.object({
    type: z.literal("worksheet"),
    title: nonEmptyText(300),
    instructions: optionalText(2000),
    prompts: z.array(worksheetPromptSchema).min(1).max(50),
  }).strict(),
  z.object({
    type: z.literal("scorecard"),
    title: nonEmptyText(300),
    metrics: z.array(metricSchema).min(1).max(30),
  }).strict(),
  z.object({
    type: z.literal("example"),
    scenario: nonEmptyText(2000),
    good: nonEmptyText(5000),
    avoid: optionalText(5000),
  }).strict(),
  z.object({
    type: z.literal("troubleshooting"),
    items: z.array(z.object({
      problem: nonEmptyText(1000),
      cause: optionalText(1000),
      fix: nonEmptyText(2000),
    }).strict()).min(1).max(30),
  }).strict(),
  z.object({
    type: z.literal("table"),
    title: optionalText(300),
    columns: z.array(nonEmptyText(200)).min(1).max(12),
    rows: z.array(z.array(nonEmptyText(1000)).min(1).max(12)).min(1).max(100),
  }).strict(),
  z.object({
    type: z.literal("callout"),
    tone: z.enum(["tip", "warning", "insight"]),
    title: optionalText(300),
    text: nonEmptyText(3000),
  }).strict(),
]).superRefine((value, context) => {
  if (value.type !== "table") return;
  value.rows.forEach((row, index) => {
    if (row.length !== value.columns.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rows", index],
        message: "Every row must match the column count",
      });
    }
  });
});

export const guideSectionV2Schema = z.object({
  id: stableIdSchema,
  title: nonEmptyText(300),
  content: nonEmptyText(20_000),
  type: canonicalSectionTypeSchema,
  objective: optionalText(1000),
  timestamp: optionalText(30),
  timestampSeconds: z.number().finite().nonnegative().optional(),
  durationSeconds: z.number().finite().positive().optional(),
  sourceRefs: z.array(sourceRefSchema).max(30).optional(),
  blocks: z.array(guideBlockSchema).min(1).max(30),
  drillBreakdown: drillBreakdownSchema.optional(),
}).strict();

const actionPlanSchema = z.object({
  title: nonEmptyText(300),
  duration: nonEmptyText(200),
  cadence: nonEmptyText(500),
  milestones: z.array(z.object({
    id: stableIdSchema,
    period: nonEmptyText(200),
    actions: z.array(nonEmptyText(1000)).min(1).max(30),
    completionCriteria: z.array(nonEmptyText(1000)).min(1).max(20),
  }).strict()).min(1).max(30),
}).strict();

const reusableTemplateSchema = z.object({
  id: stableIdSchema,
  title: nonEmptyText(300),
  purpose: nonEmptyText(1000),
  body: nonEmptyText(10_000),
  placeholders: z.array(nonEmptyText(200)).max(30),
  example: optionalText(10_000),
}).strict();

export const guideContentV2Schema = z.object({
  schemaVersion: z.literal(2),
  format: guideFormatSchema,
  title: nonEmptyText(300),
  promise: nonEmptyText(1000),
  introduction: nonEmptyText(20_000),
  quickStart: z.object({
    desiredOutcome: nonEmptyText(1000),
    timeRequired: optionalText(200),
    prerequisites: z.array(nonEmptyText(500)).max(30),
    firstAction: nonEmptyText(1000),
  }).strict().optional(),
  sections: z.array(guideSectionV2Schema).min(1).max(100),
  actionPlan: actionPlanSchema.optional(),
  templates: z.array(reusableTemplateSchema).max(30).optional(),
  conclusion: nonEmptyText(20_000),
  callToAction: nonEmptyText(5000),
}).strict();

export const generatedGuideContentV2Schema = guideContentV2Schema.superRefine(
  (value, context) => {
    if (/<(?:\/?[a-z][^>]*|!--)/i.test(JSON.stringify(value))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Generated guide content must not contain HTML markup",
      });
    }

    const hasConcreteBlock = value.sections.some((section) =>
      section.blocks.some((block) => block.type !== "rich_text" && block.type !== "callout"),
    );
    if (!hasConcreteBlock) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections"],
        message: "Generated V2 guides require at least one concrete action block",
      });
    }

    const requiredBlockType = value.format === "playbook"
      ? "steps"
      : value.format === "checklist"
        ? "checklist"
        : value.format === "workbook"
          ? "worksheet"
          : null;
    if (
      requiredBlockType &&
      !value.sections.some((section) =>
        section.blocks.some((block) => block.type === requiredBlockType),
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections"],
        message: `${value.format} guides require a ${requiredBlockType} block`,
      });
    }

    if (value.format === "action_plan" && !value.actionPlan) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actionPlan"],
        message: "Action-plan guides require an action plan",
      });
    }

    if (value.format === "template_pack" && (!value.templates || value.templates.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["templates"],
        message: "Template-pack guides require at least one reusable template",
      });
    }
  },
);

export type GuideFormat = z.infer<typeof guideFormatSchema>;
export type GuideCreationBrief = z.infer<typeof guideCreationBriefSchema>;
export type GuideContentV1 = z.infer<typeof guideContentV1Schema>;
export type GuideContentV2 = z.infer<typeof guideContentV2Schema>;
export type GuideBlock = z.infer<typeof guideBlockSchema>;

function timestampLabel(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function canonicalSectionType(type: z.infer<typeof legacySectionTypeSchema>) {
  return type === "section" ? "tip" as const : type;
}

export function inferGuideFormatFromTemplate(templateId?: string): GuideFormat {
  switch (templateId) {
    case "checklist":
    case "sop":
      return "checklist";
    case "playbook":
    case "step_by_step":
      return "playbook";
    case "workbook":
      return "workbook";
    case "action_plan":
    case "workout":
    case "next_step":
      return "action_plan";
    case "template_pack":
      return "template_pack";
    default:
      return "report";
  }
}

export function normalizeGuideContent(
  input: unknown,
  options?: { format?: GuideFormat },
): GuideContentV2 {
  const v2Result = guideContentV2Schema.safeParse(input);
  if (v2Result.success) return v2Result.data;

  const legacy = guideContentV1Schema.parse(input);
  const format = options?.format ?? "report";
  return guideContentV2Schema.parse({
    schemaVersion: 2,
    format,
    title: legacy.title,
    promise: legacy.introduction.slice(0, 1000),
    introduction: legacy.introduction,
    sections: legacy.sections.map((section, index) => {
      const timestampSeconds = section.timestampSeconds ??
        (typeof section.timestamp === "number" ? section.timestamp : undefined);
      const timestamp = typeof section.timestamp === "string"
        ? section.timestamp
        : timestampSeconds !== undefined
          ? timestampLabel(timestampSeconds)
          : undefined;

      return {
        id: `section_${index + 1}`,
        title: section.title,
        content: section.content,
        type: canonicalSectionType(section.type),
        ...(timestamp ? { timestamp } : {}),
        ...(timestampSeconds !== undefined ? { timestampSeconds } : {}),
        ...((section.durationSeconds ?? section.duration) !== undefined
          ? { durationSeconds: section.durationSeconds ?? section.duration }
          : {}),
        ...(section.drillBreakdown ? { drillBreakdown: section.drillBreakdown } : {}),
        blocks: [{ type: "rich_text" as const, text: section.content }],
      };
    }),
    conclusion: legacy.conclusion,
    callToAction: legacy.callToAction,
  });
}

export function parseGeneratedGuideContent(
  input: unknown,
  fallbackFormat: GuideFormat,
): GuideContentV2 {
  if (
    typeof input === "object" &&
    input !== null &&
    "schemaVersion" in input &&
    (input as { schemaVersion?: unknown }).schemaVersion === 2
  ) {
    return generatedGuideContentV2Schema.parse(input);
  }
  return normalizeGuideContent(input, { format: fallbackFormat });
}
