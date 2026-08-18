import { z } from "zod";
import {
  guideFormatSchema,
  parseGeneratedGuideContent,
  type GuideContentV2,
  type GuideFormat,
} from "@shared/guideContent";
import { isTrainingGuide } from "./services/guideContentPrompt";
import {
  auditGuideQuality,
  buildGuideTrainingDepthProfile,
  type GuideQualityAudit,
  type GuideTrainingAnalysisInput,
  type GuideTrainingDepthProfile,
} from "./services/guideQuality";

export interface StoredGuidePublishInput {
  content: unknown;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  transcript?: string | null;
  aiAnalysis?: unknown;
  /**
   * The durable format selected before this publish attempt. V2 content can
   * supply its own declared format when no separate durable value exists.
   * Legacy content must receive this explicitly because V1 had no format.
   */
  expectedFormat?: GuideFormat;
}

export interface GuidePublishValidationContext {
  expectedFormat: GuideFormat | null;
  formatSource: "stored_expectation" | "content" | null;
  normalizedLegacy: boolean;
  trainingRecipeApplied: boolean;
  trainingDepthProfile: GuideTrainingDepthProfile | null;
  /**
   * Legacy Guide rows retain a plain transcript, not trustworthy segment
   * boundaries. Never report timestamp verification unless exact ranges are
   * added to the durable model and passed to the quality audit.
   */
  sourceTimingRangesChecked: false;
}

export type GuidePublishValidationResult =
  | {
      publishable: true;
      content: GuideContentV2;
      audit: GuideQualityAudit;
      context: GuidePublishValidationContext;
    }
  | {
      publishable: false;
      content?: GuideContentV2;
      audit: GuideQualityAudit;
      context: GuidePublishValidationContext;
    };

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function storedTrainingAnalysis(value: unknown): GuideTrainingAnalysisInput | undefined {
  const analysis = asRecord(value);
  if (!analysis) return undefined;

  let recognizedInventory = false;
  const result: GuideTrainingAnalysisInput = {};

  const keyTips = stringArray(analysis.keyTips);
  if (keyTips) {
    recognizedInventory = true;
    result.keyTips = keyTips;
  }

  if (Array.isArray(analysis.drills)) {
    recognizedInventory = true;
    result.drills = analysis.drills.flatMap((candidate) => {
      const drill = asRecord(candidate);
      if (!drill) return [];
      const steps = stringArray(drill.steps);
      return [{
        ...(typeof drill.name === "string" ? { name: drill.name } : {}),
        ...(typeof drill.description === "string" ? { description: drill.description } : {}),
        ...(steps ? { steps } : {}),
      }];
    });
  }

  if (Array.isArray(analysis.techniques)) {
    recognizedInventory = true;
    result.techniques = analysis.techniques.flatMap((candidate) => {
      const technique = asRecord(candidate);
      if (!technique) return [];
      const keyPoints = stringArray(technique.keyPoints);
      return [{
        ...(typeof technique.name === "string" ? { name: technique.name } : {}),
        ...(typeof technique.description === "string"
          ? { description: technique.description }
          : {}),
        ...(keyPoints ? { keyPoints } : {}),
      }];
    });
  }

  const inventory = asRecord(analysis.contentInventory);
  if (inventory) {
    const contentInventory: NonNullable<GuideTrainingAnalysisInput["contentInventory"]> = {};
    const copyStringArray = (
      sourceKey: keyof typeof inventory,
      targetKey: keyof typeof contentInventory,
    ) => {
      const values = stringArray(inventory[sourceKey]);
      if (!values) return;
      recognizedInventory = true;
      (contentInventory as Record<string, unknown>)[targetKey] = values;
    };

    copyStringArray("principles", "principles");
    copyStringArray("bestPractices", "bestPractices");
    copyStringArray("keyTakeaways", "keyTakeaways");
    copyStringArray("progressions", "progressions");
    copyStringArray("regressions", "regressions");
    copyStringArray("workoutPlanIngredients", "workoutPlanIngredients");

    if (Array.isArray(inventory.troubleshooting)) {
      recognizedInventory = true;
      contentInventory.troubleshooting = inventory.troubleshooting.flatMap((candidate) => {
        const item = asRecord(candidate);
        if (!item) return [];
        return [{
          ...(typeof item.problem === "string" ? { problem: item.problem } : {}),
          ...(typeof item.cause === "string" ? { cause: item.cause } : {}),
          ...(typeof item.fix === "string" ? { fix: item.fix } : {}),
        }];
      });
    }

    result.contentInventory = contentInventory;
  }

  return recognizedInventory ? result : undefined;
}

function issuePath(path: Array<PropertyKey>): string {
  if (path.length === 0) return "content";
  return path.map((part) => typeof part === "symbol" ? part.description ?? "symbol" : String(part))
    .join(".");
}

function schemaFailureAudit(error: unknown): GuideQualityAudit {
  const paths = error instanceof z.ZodError
    ? Array.from(new Set(error.issues.slice(0, 8).map((issue) => issuePath(issue.path))))
    : ["content"];

  return {
    passed: false,
    issues: [{
      code: "schema_validation",
      message: "The stored draft does not satisfy the Guide V2 contract.",
      evidence: paths.map((path) => ({
        path,
        observed: "missing or invalid stored Guide data",
        expected: "a value accepted by the strict generated Guide V2 schema",
      })),
      repairInstruction: "Return the Guide to draft and regenerate or edit it into a complete schemaVersion 2 Guide before publishing.",
    }],
  };
}

function missingFormatAudit(): GuideQualityAudit {
  return {
    passed: false,
    issues: [{
      code: "schema_validation",
      message: "The stored draft has no trustworthy deliverable format.",
      evidence: [{
        path: "content.format",
        observed: "missing or invalid",
        expected: "a valid V2 format, or an explicit durable expectedFormat for legacy content",
      }],
      repairInstruction: "Return the Guide to draft and choose its deliverable format before publishing.",
    }],
  };
}

function baseContext(input: {
  expectedFormat: GuideFormat | null;
  formatSource: GuidePublishValidationContext["formatSource"];
  normalizedLegacy: boolean;
}): GuidePublishValidationContext {
  return {
    ...input,
    trainingRecipeApplied: false,
    trainingDepthProfile: null,
    sourceTimingRangesChecked: false,
  };
}

/**
 * Deterministically validates only the durable Guide output available at
 * publish time. It performs no AI calls, database writes, or source repair.
 *
 * Exact timestamp grounding cannot be re-proven from the current stored Guide
 * row because timestamped transcript segments are not durable fields. The
 * general audit still requires useful topical source labels, but this helper
 * deliberately supplies no invented timing ranges to the audit.
 */
export function validateStoredGuideForPublish(
  input: StoredGuidePublishInput,
): GuidePublishValidationResult {
  const rawContent = asRecord(input.content);
  const isDeclaredV2 = rawContent?.schemaVersion === 2;
  const formatSource = input.expectedFormat !== undefined
    ? "stored_expectation" as const
    : rawContent?.format !== undefined
      ? "content" as const
      : null;
  const expectedFormatResult = guideFormatSchema.safeParse(
    input.expectedFormat ?? rawContent?.format,
  );

  if (!expectedFormatResult.success) {
    return {
      publishable: false,
      audit: missingFormatAudit(),
      context: baseContext({
        expectedFormat: null,
        formatSource,
        normalizedLegacy: !isDeclaredV2,
      }),
    };
  }

  const expectedFormat = expectedFormatResult.data;
  let content: GuideContentV2;
  try {
    content = parseGeneratedGuideContent(input.content, expectedFormat);
  } catch (error) {
    return {
      publishable: false,
      audit: schemaFailureAudit(error),
      context: baseContext({
        expectedFormat,
        formatSource,
        normalizedLegacy: !isDeclaredV2,
      }),
    };
  }

  const analysis = storedTrainingAnalysis(input.aiAnalysis);
  const trainingDepthProfile = buildGuideTrainingDepthProfile(analysis);
  const trainingRecipeApplied = Boolean(
    trainingDepthProfile && isTrainingGuide({
      brief: {
        format: expectedFormat,
        focus: input.description ?? undefined,
      },
      title: input.title ?? content.title,
      category: input.category ?? undefined,
      sourceText: input.transcript ?? undefined,
      drillCount: trainingDepthProfile.drillCount,
    }),
  );
  const audit = auditGuideQuality(content, {
    expectedFormat,
    requireTrainingRecipe: trainingRecipeApplied,
    ...(trainingRecipeApplied && trainingDepthProfile
      ? { trainingDepthProfile }
      : {}),
  });
  const context: GuidePublishValidationContext = {
    expectedFormat,
    formatSource,
    normalizedLegacy: !isDeclaredV2,
    trainingRecipeApplied,
    trainingDepthProfile: trainingRecipeApplied && trainingDepthProfile
      ? trainingDepthProfile
      : null,
    sourceTimingRangesChecked: false,
  };

  return audit.passed
    ? { publishable: true, content, audit, context }
    : { publishable: false, content, audit, context };
}
