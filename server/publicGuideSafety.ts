import type { Request } from "express";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { analyticsEvents, guides } from "@shared/schema";
import { db } from "./db";

const PUBLIC_VIEW_DEDUPLICATION_MS = 5 * 60 * 1_000;
const CONTACT_FIELD_NAMES = new Set(["email", "firstName", "phone", "smsConsent"]);
const RESERVED_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const optionalTrimmedString = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().max(max).optional(),
);

const customFieldNameSchema = z.string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), "Invalid custom field name")
  .refine((value) => !RESERVED_OBJECT_KEYS.has(value), "Invalid custom field name");

const customFieldDataSchema = z.record(
  customFieldNameSchema,
  z.string().trim().max(2_000),
).superRefine((value, context) => {
  if (Object.keys(value).length > 20) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Too many custom fields",
    });
  }
});

export const publicGuideIdSchema = z.string()
  .regex(/^[1-9]\d*$/, "Invalid guide ID")
  .transform(Number)
  .refine(Number.isSafeInteger, "Guide ID is too large");

export const publicLandingSlugSchema = z.string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid landing page URL");

export const publicLeadSubmissionSchema = z.object({
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  firstName: optionalTrimmedString(100),
  phone: optionalTrimmedString(20),
  smsConsent: z.preprocess((value) => {
    if (value === "true") return true;
    if (value === "false" || value === undefined) return false;
    return value;
  }, z.boolean()).default(false),
  customFieldData: customFieldDataSchema.optional().default({}),
}).strict();

export type PublicLeadSubmission = z.infer<typeof publicLeadSubmissionSchema>;

type LandingFieldDefinition = {
  name: string;
  required: boolean;
};

function landingFieldDefinitions(value: unknown): LandingFieldDefinition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((field) => {
    if (!field || typeof field !== "object" || Array.isArray(field)) return [];
    const record = field as Record<string, unknown>;
    if (typeof record.name !== "string" || !record.name.trim()) return [];
    return [{ name: record.name.trim(), required: record.required === true }];
  });
}

export function landingSubmissionIssues(
  definitions: unknown,
  submission: PublicLeadSubmission,
): string[] {
  const fields = landingFieldDefinitions(definitions);
  const knownNames = new Set(fields.map((field) => field.name));
  const issues: string[] = [];

  for (const name of Object.keys(submission.customFieldData)) {
    if (!knownNames.has(name) || CONTACT_FIELD_NAMES.has(name)) {
      issues.push(`Unknown custom field: ${name}`);
    }
  }

  for (const field of fields) {
    if (!field.required || field.name === "email") continue;
    const value = field.name === "firstName"
      ? submission.firstName
      : field.name === "phone"
        ? submission.phone
        : field.name === "smsConsent"
          ? submission.smsConsent ? "true" : undefined
          : submission.customFieldData[field.name];
    if (typeof value !== "string" || value.trim().length === 0) {
      issues.push(`Missing required field: ${field.name}`);
    }
  }

  return issues;
}

export function createIpResourceRateKey(paramName: string) {
  return (req: Request): string => {
    const address = (req.ip || req.socket.remoteAddress || "unknown").slice(0, 128);
    const resource = String(req.params[paramName] || "unknown").slice(0, 255);
    return `${address}:${resource}`;
  };
}

type PublicViewMetadata = {
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
};

export async function recordPublicLandingView(input: {
  landingPageId: number;
  guideId: number;
  userId: string;
  metadata: PublicViewMetadata;
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const visitorKey = input.metadata.ipAddress || "unknown";
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`landing-view:${input.landingPageId}:${visitorKey}`}))`);
    const ipCondition = input.metadata.ipAddress
      ? eq(analyticsEvents.ipAddress, input.metadata.ipAddress)
      : isNull(analyticsEvents.ipAddress);
    const [recentView] = await tx
      .select({ id: analyticsEvents.id })
      .from(analyticsEvents)
      .where(and(
        eq(analyticsEvents.guideId, input.guideId),
        eq(analyticsEvents.landingPageId, input.landingPageId),
        eq(analyticsEvents.eventType, "view"),
        ipCondition,
        gt(analyticsEvents.createdAt, new Date(now.getTime() - PUBLIC_VIEW_DEDUPLICATION_MS)),
        sql`${analyticsEvents.eventData} ->> 'page' = 'landing'`,
      ))
      .limit(1);
    if (recentView) return false;

    await tx.insert(analyticsEvents).values({
      userId: input.userId,
      guideId: input.guideId,
      landingPageId: input.landingPageId,
      eventType: "view",
      eventData: { page: "landing" },
      ...input.metadata,
    });
    return true;
  });
}

export async function recordPublicGuideView(input: {
  guideId: number;
  userId: string;
  metadata: PublicViewMetadata;
}): Promise<{ recorded: boolean; views: number }> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const visitorKey = input.metadata.ipAddress || "unknown";
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`guide-view:${input.guideId}:${visitorKey}`}))`);
    const ipCondition = input.metadata.ipAddress
      ? eq(analyticsEvents.ipAddress, input.metadata.ipAddress)
      : isNull(analyticsEvents.ipAddress);
    const [recentView] = await tx
      .select({ id: analyticsEvents.id })
      .from(analyticsEvents)
      .where(and(
        eq(analyticsEvents.guideId, input.guideId),
        isNull(analyticsEvents.landingPageId),
        eq(analyticsEvents.eventType, "view"),
        ipCondition,
        gt(analyticsEvents.createdAt, new Date(now.getTime() - PUBLIC_VIEW_DEDUPLICATION_MS)),
      ))
      .limit(1);

    if (recentView) {
      const [current] = await tx
        .select({ views: guides.views })
        .from(guides)
        .where(eq(guides.id, input.guideId))
        .limit(1);
      return { recorded: false, views: current?.views || 0 };
    }

    const [updated] = await tx
      .update(guides)
      .set({
        views: sql`COALESCE(${guides.views}, 0) + 1`,
        updatedAt: now,
      })
      .where(and(
        eq(guides.id, input.guideId),
        eq(guides.magnetType, "guide"),
        inArray(guides.status, ["published", "unlisted"]),
      ))
      .returning({ views: guides.views });
    if (!updated) return { recorded: false, views: 0 };

    await tx.insert(analyticsEvents).values({
      userId: input.userId,
      guideId: input.guideId,
      eventType: "view",
      eventData: { page: "guide" },
      ...input.metadata,
    });
    return { recorded: true, views: updated.views || 0 };
  });
}
