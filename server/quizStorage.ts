import { randomUUID } from "crypto";
import { and, count, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "./db";
import {
  analyticsEvents,
  benefitAssets,
  guides,
  landingPages,
  leads,
  quizAttempts,
  quizzes,
  type BenefitAsset,
  type Guide,
  type LandingPage,
  type Quiz,
  type QuizAttempt,
} from "@shared/schema";
import {
  normalizeStoredQuizLeadCapture,
  quizDefinitionSchema,
  quizResultSnapshotSchema,
  publicQuizResultFromSnapshot,
  resolveQuizTheme,
  scoreQuizOutcome,
  type BenefitAssetCreate,
  type BenefitAssetUpdate,
  type PublicBenefitAsset,
  type PublicQuizProjection,
  type PublicQuizResult,
  type PublicQuizOutcome,
  type QuizDefinition,
  type QuizResultSnapshot,
  type QuizThemeMode,
  type UpdateQuizRequest,
} from "@shared/quiz";
import {
  assertBrandAccess,
  assertGuideAccess,
  resolveBrandIdForUser,
} from "./brandAccess";
import { resolveAppearanceForScope } from "./brandAppearance";
import { toPublicBrandAppearance } from "@shared/branding";

export class QuizStorageError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "QuizStorageError";
  }
}

const QUIZ_VIEW_DEDUPLICATION_MS = 5 * 60 * 1_000;
const QUIZ_ATTEMPT_RATE_WINDOW_MS = 60 * 60 * 1_000;
const QUIZ_ATTEMPT_RATE_LIMIT = 60;
const QUIZ_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1_000;

type QuizBundle = {
  guide: Guide;
  landingPage: LandingPage;
  quiz: Quiz;
};

type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
};

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return slug || "quiz";
}

function parseQuizDefinition(guide: Guide, quiz: Quiz): QuizDefinition {
  return quizDefinitionSchema.parse({
    title: guide.title,
    description: guide.description || "Take this quiz to discover your best next step.",
    questions: quiz.questions,
    outcomes: quiz.outcomes,
    leadCapture: normalizeStoredQuizLeadCapture(quiz.leadCapture),
    theme: quiz.theme,
  });
}

function toPublicBenefitAsset(asset: BenefitAsset): PublicBenefitAsset {
  if (asset.kind !== "free_gift" && asset.kind !== "cta") {
    throw new QuizStorageError(500, "Benefit asset has an invalid kind");
  }

  return {
    title: asset.title,
    description: asset.description,
    benefitSummary: asset.benefitSummary,
    url: asset.url,
    buttonLabel: asset.buttonLabel,
  };
}

function toPublicQuizOutcome(outcome: QuizDefinition["outcomes"][number]): PublicQuizOutcome {
  return {
    id: outcome.id,
    title: outcome.title,
    summary: outcome.summary,
    description: outcome.description,
    recommendations: outcome.recommendations,
  };
}

function toStoredBenefitAsset(asset: BenefitAsset): NonNullable<QuizResultSnapshot["gift"]> {
  return { assetId: asset.id, ...toPublicBenefitAsset(asset) };
}

function toPublicSnapshotAsset(
  asset: NonNullable<QuizResultSnapshot["gift"]>,
): PublicBenefitAsset {
  const { assetId: _assetId, ...publicAsset } = asset;
  return publicAsset;
}

function parseStoredResultSnapshot(attempt: QuizAttempt): QuizResultSnapshot | null {
  if (attempt.resultSnapshot === null) return null;
  const parsed = quizResultSnapshotSchema.safeParse(attempt.resultSnapshot);
  if (!parsed.success) {
    throw new QuizStorageError(500, "Stored quiz result is invalid");
  }
  return parsed.data;
}

async function getQuizBundleByGuideId(guideId: number): Promise<QuizBundle | null> {
  const [row] = await db
    .select({ guide: guides, landingPage: landingPages, quiz: quizzes })
    .from(quizzes)
    .innerJoin(guides, eq(quizzes.guideId, guides.id))
    .innerJoin(landingPages, eq(landingPages.guideId, guides.id))
    .where(and(eq(guides.id, guideId), eq(guides.magnetType, "quiz")));
  return row || null;
}

async function getQuizBundleForUser(
  userId: string,
  guideId: number,
  write: boolean,
): Promise<QuizBundle> {
  const bundle = await getQuizBundleByGuideId(guideId);
  if (!bundle) throw new QuizStorageError(404, "Quiz not found");
  await assertGuideAccess(userId, bundle.guide, write ? "write_content" : "read");
  return bundle;
}

async function validateOutcomeAssets(
  userId: string,
  brandId: number | null,
  definition: QuizDefinition,
): Promise<void> {
  const assignments = definition.outcomes.flatMap((outcome) => [
    outcome.giftAssetId ? { id: outcome.giftAssetId, kind: "free_gift" as const } : null,
    outcome.ctaAssetId ? { id: outcome.ctaAssetId, kind: "cta" as const } : null,
  ]).filter((assignment): assignment is { id: number; kind: "free_gift" | "cta" } => Boolean(assignment));

  if (assignments.length === 0) return;
  const ids = Array.from(new Set(assignments.map((assignment) => assignment.id)));
  const assets = await db.select().from(benefitAssets).where(inArray(benefitAssets.id, ids));
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

  for (const assignment of assignments) {
    const asset = assetMap.get(assignment.id);
    const inScope = brandId === null
      ? asset?.brandId === null && asset.userId === userId
      : asset?.brandId === brandId;
    if (!asset || !inScope || asset.kind !== assignment.kind || asset.status !== "active") {
      throw new QuizStorageError(400, `Invalid ${assignment.kind} asset: ${assignment.id}`);
    }
  }
}

export async function createQuizFunnel(params: {
  userId: string;
  brandId?: number | null;
  sourceContent: string;
  definition: QuizDefinition;
  themeMode?: QuizThemeMode;
}): Promise<QuizBundle> {
  const brandId = await resolveBrandIdForUser(params.userId, params.brandId, "write_content");
  await validateOutcomeAssets(params.userId, brandId, params.definition);

  const suffix = randomUUID().slice(0, 8);
  const slug = `${slugify(params.definition.title)}-${suffix}`;

  return db.transaction(async (tx) => {
    const [guide] = await tx.insert(guides).values({
      userId: params.userId,
      brandId,
      magnetType: "quiz",
      title: params.definition.title,
      description: params.definition.description,
      youtubeUrl: null,
      youtubeVideoId: null,
      transcript: null,
      aiAnalysis: { type: "quiz", generatedAt: new Date().toISOString() },
      content: {
        title: params.definition.title,
        description: params.definition.description,
      },
      category: "quiz",
      tags: ["quiz"],
      leadTags: [],
      status: "draft",
      slug,
    }).returning();

    const [landingPage] = await tx.insert(landingPages).values({
      guideId: guide.id,
      userId: params.userId,
      title: params.definition.title,
      headline: params.definition.title,
      subheadline: params.definition.description.slice(0, 200),
      description: params.definition.description,
      bulletPoints: [],
      buttonText: "Take the Quiz",
      customFields: [],
      customUrl: `${slug}-quiz`,
      isActive: true,
    }).returning();

    const [quiz] = await tx.insert(quizzes).values({
      guideId: guide.id,
      userId: params.userId,
      brandId,
      sourceContent: params.sourceContent,
      questions: params.definition.questions,
      outcomes: params.definition.outcomes,
      leadCapture: params.definition.leadCapture,
      theme: params.definition.theme,
      themeMode: params.themeMode ?? "brand",
    }).returning();

    return { guide, landingPage, quiz };
  });
}

export async function getQuizForUser(userId: string, guideId: number): Promise<QuizBundle> {
  return getQuizBundleForUser(userId, guideId, false);
}

export async function updateQuizForUser(
  userId: string,
  guideId: number,
  update: UpdateQuizRequest,
): Promise<QuizBundle> {
  const bundle = await getQuizBundleForUser(userId, guideId, true);
  const current = parseQuizDefinition(bundle.guide, bundle.quiz);
  const definition = quizDefinitionSchema.parse({ ...current, ...update });
  await validateOutcomeAssets(userId, bundle.quiz.brandId, definition);

  await db.transaction(async (tx) => {
    await tx.update(guides).set({
      title: definition.title,
      description: definition.description,
      status: "draft",
      updatedAt: new Date(),
    }).where(eq(guides.id, guideId));

    await tx.update(landingPages).set({
      title: definition.title,
      headline: definition.title,
      subheadline: definition.description.slice(0, 200),
      description: definition.description,
      updatedAt: new Date(),
    }).where(eq(landingPages.id, bundle.landingPage.id));

    await tx.update(quizzes).set({
      questions: definition.questions,
      outcomes: definition.outcomes,
      leadCapture: definition.leadCapture,
      theme: definition.theme,
      themeMode: update.themeMode ?? bundle.quiz.themeMode,
      updatedAt: new Date(),
    }).where(eq(quizzes.id, bundle.quiz.id));
  });

  return getQuizBundleForUser(userId, guideId, false);
}

export async function publishQuizForUser(userId: string, guideId: number): Promise<QuizBundle> {
  const bundle = await getQuizBundleForUser(userId, guideId, true);
  const definition = parseQuizDefinition(bundle.guide, bundle.quiz);
  await validateOutcomeAssets(userId, bundle.quiz.brandId, definition);

  await db.transaction(async (tx) => {
    await tx.update(guides).set({ status: "published", updatedAt: new Date() })
      .where(eq(guides.id, guideId));
    await tx.update(landingPages).set({ isActive: true, updatedAt: new Date() })
      .where(eq(landingPages.id, bundle.landingPage.id));
  });

  return getQuizBundleForUser(userId, guideId, false);
}

export async function listBenefitAssetsForUser(
  userId: string,
  requestedBrandId?: number | null,
): Promise<BenefitAsset[]> {
  const brandId = await resolveBrandIdForUser(userId, requestedBrandId, "read");
  const scope = brandId === null
    ? and(eq(benefitAssets.userId, userId), isNull(benefitAssets.brandId))
    : eq(benefitAssets.brandId, brandId);

  return db.select().from(benefitAssets).where(scope).orderBy(desc(benefitAssets.updatedAt));
}

export async function createBenefitAssetForUser(
  userId: string,
  input: BenefitAssetCreate,
): Promise<BenefitAsset> {
  const brandId = await resolveBrandIdForUser(userId, input.brandId, "write_content");
  const [asset] = await db.insert(benefitAssets).values({
    userId,
    brandId,
    kind: input.kind,
    title: input.title,
    description: input.description,
    benefitSummary: input.benefitSummary,
    url: input.url,
    buttonLabel: input.buttonLabel,
    tags: input.tags,
    status: input.status,
  }).returning();
  return asset;
}

async function getBenefitAssetForUser(userId: string, assetId: number, write: boolean): Promise<BenefitAsset> {
  const [asset] = await db.select().from(benefitAssets).where(eq(benefitAssets.id, assetId));
  if (!asset) throw new QuizStorageError(404, "Benefit asset not found");

  if (asset.brandId !== null) {
    await assertBrandAccess(userId, asset.brandId, write ? "write_content" : "read");
  } else if (asset.userId !== userId) {
    throw new QuizStorageError(404, "Benefit asset not found");
  }
  return asset;
}

export async function updateBenefitAssetForUser(
  userId: string,
  assetId: number,
  input: BenefitAssetUpdate,
): Promise<BenefitAsset> {
  await getBenefitAssetForUser(userId, assetId, true);
  const [asset] = await db.update(benefitAssets).set({
    ...input,
    updatedAt: new Date(),
  }).where(eq(benefitAssets.id, assetId)).returning();
  return asset;
}

async function getPublishedQuizBundle(customUrl: string): Promise<QuizBundle> {
  const [bundle] = await db
    .select({ guide: guides, landingPage: landingPages, quiz: quizzes })
    .from(landingPages)
    .innerJoin(guides, eq(landingPages.guideId, guides.id))
    .innerJoin(quizzes, eq(quizzes.guideId, guides.id))
    .where(and(
      eq(landingPages.customUrl, customUrl),
      eq(landingPages.isActive, true),
      eq(guides.status, "published"),
      eq(guides.magnetType, "quiz"),
    ));

  if (!bundle) throw new QuizStorageError(404, "Quiz not found");
  return bundle;
}

export async function getPublicQuiz(customUrl: string): Promise<PublicQuizProjection> {
  const bundle = await getPublishedQuizBundle(customUrl);
  const definition = parseQuizDefinition(bundle.guide, bundle.quiz);
  const appearance = await resolveAppearanceForScope(bundle.guide.userId, bundle.guide.brandId);
  const branding = toPublicBrandAppearance(appearance);
  const themeMode: QuizThemeMode = bundle.quiz.themeMode === "custom" ? "custom" : "brand";
  const theme = resolveQuizTheme(appearance, definition.theme, themeMode);
  return {
    guide: {
      id: bundle.guide.id,
      title: bundle.guide.title,
      description: bundle.guide.description,
    },
    landingPage: {
      customUrl: bundle.landingPage.customUrl || customUrl,
      headline: bundle.landingPage.headline,
      subheadline: bundle.landingPage.subheadline,
      description: bundle.landingPage.description,
      buttonText: bundle.landingPage.buttonText,
    },
    quiz: {
      questions: definition.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        ...(question.helpText ? { helpText: question.helpText } : {}),
        required: question.required,
        options: question.options.map((option) => ({ id: option.id, label: option.label })),
      })),
      leadCapture: definition.leadCapture,
      theme,
      themeMode,
    },
    branding,
  };
}

export async function recordPublicQuizView(customUrl: string, metadata: RequestMetadata): Promise<void> {
  const bundle = await getPublishedQuizBundle(customUrl);
  await db.transaction(async (tx) => {
    const now = new Date();
    const visitorKey = metadata.ipAddress || "unknown";
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`quiz-view:${bundle.quiz.id}:${visitorKey}`}))`);
    const ipCondition = metadata.ipAddress
      ? eq(analyticsEvents.ipAddress, metadata.ipAddress)
      : isNull(analyticsEvents.ipAddress);
    const [recentView] = await tx
      .select({ id: analyticsEvents.id })
      .from(analyticsEvents)
      .where(and(
        eq(analyticsEvents.guideId, bundle.guide.id),
        eq(analyticsEvents.landingPageId, bundle.landingPage.id),
        eq(analyticsEvents.eventType, "quiz_view"),
        ipCondition,
        gt(analyticsEvents.createdAt, new Date(now.getTime() - QUIZ_VIEW_DEDUPLICATION_MS)),
      ))
      .limit(1);
    if (recentView) return;

    await tx.update(landingPages).set({
      views: sql`COALESCE(${landingPages.views}, 0) + 1`,
    }).where(eq(landingPages.id, bundle.landingPage.id));
    await tx.update(guides).set({
      views: sql`COALESCE(${guides.views}, 0) + 1`,
    }).where(eq(guides.id, bundle.guide.id));
    await tx.insert(analyticsEvents).values({
      userId: bundle.guide.userId,
      guideId: bundle.guide.id,
      landingPageId: bundle.landingPage.id,
      eventType: "quiz_view",
      eventData: {},
      ...metadata,
    });
  });
}

export async function startQuizAttempt(
  customUrl: string,
  metadata: RequestMetadata,
): Promise<{ attemptId: string }> {
  const bundle = await getPublishedQuizBundle(customUrl);
  return db.transaction(async (tx) => {
    const now = new Date();
    const visitorKey = metadata.ipAddress || "unknown";
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`quiz-start:${bundle.quiz.id}:${visitorKey}`}))`);
    await tx.delete(quizAttempts).where(and(
      eq(quizAttempts.quizId, bundle.quiz.id),
      isNull(quizAttempts.completedAt),
      lt(quizAttempts.startedAt, new Date(now.getTime() - QUIZ_ATTEMPT_TTL_MS)),
    ));

    const ipCondition = metadata.ipAddress
      ? eq(quizAttempts.ipAddress, metadata.ipAddress)
      : isNull(quizAttempts.ipAddress);
    const [recent] = await tx
      .select({ total: count() })
      .from(quizAttempts)
      .where(and(
        eq(quizAttempts.quizId, bundle.quiz.id),
        ipCondition,
        gt(quizAttempts.startedAt, new Date(now.getTime() - QUIZ_ATTEMPT_RATE_WINDOW_MS)),
      ));
    if (Number(recent?.total || 0) >= QUIZ_ATTEMPT_RATE_LIMIT) {
      throw new QuizStorageError(429, "Too many quiz attempts. Please try again later.");
    }

    const [attempt] = await tx.insert(quizAttempts).values({
      quizId: bundle.quiz.id,
      landingPageId: bundle.landingPage.id,
      answerMap: {},
      scoreMap: {},
      ...metadata,
    }).returning({ id: quizAttempts.id });

    await tx.insert(analyticsEvents).values({
      userId: bundle.guide.userId,
      guideId: bundle.guide.id,
      landingPageId: bundle.landingPage.id,
      eventType: "quiz_start",
      eventData: { attemptId: attempt.id },
      ...metadata,
    });

    return { attemptId: attempt.id };
  });
}

async function getResultAssets(
  outcome: QuizDefinition["outcomes"][number],
  bundle: QuizBundle,
): Promise<Pick<QuizResultSnapshot, "gift" | "cta">> {
  const ids = [outcome.giftAssetId, outcome.ctaAssetId]
    .filter((id): id is number => typeof id === "number");
  if (ids.length === 0) return { gift: null, cta: null };

  const scopeCondition = bundle.quiz.brandId === null
    ? and(eq(benefitAssets.userId, bundle.guide.userId), isNull(benefitAssets.brandId))
    : eq(benefitAssets.brandId, bundle.quiz.brandId);
  const assets = await db.select().from(benefitAssets).where(and(
    inArray(benefitAssets.id, ids),
    eq(benefitAssets.status, "active"),
    scopeCondition,
  ));
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const giftAsset = outcome.giftAssetId ? assetMap.get(outcome.giftAssetId) : undefined;
  const ctaAsset = outcome.ctaAssetId ? assetMap.get(outcome.ctaAssetId) : undefined;

  return {
    gift: giftAsset?.kind === "free_gift" ? toStoredBenefitAsset(giftAsset) : null,
    cta: ctaAsset?.kind === "cta" ? toStoredBenefitAsset(ctaAsset) : null,
  };
}

async function buildPublicResult(
  attempt: QuizAttempt,
  definition: QuizDefinition,
  bundle: QuizBundle,
): Promise<PublicQuizResult> {
  if (!attempt.completedAt || !attempt.outcomeId) {
    throw new QuizStorageError(409, "Quiz attempt is not complete");
  }
  const storedSnapshot = parseStoredResultSnapshot(attempt);
  if (storedSnapshot) return publicQuizResultFromSnapshot(attempt.id, storedSnapshot);

  const outcome = definition.outcomes.find((candidate) => candidate.id === attempt.outcomeId);
  if (!outcome) throw new QuizStorageError(410, "Quiz result is no longer available");
  const { gift, cta } = await getResultAssets(outcome, bundle);
  return {
    attemptId: attempt.id,
    outcome: toPublicQuizOutcome(outcome),
    gift: gift ? toPublicSnapshotAsset(gift) : null,
    cta: cta ? toPublicSnapshotAsset(cta) : null,
  };
}

export async function completeQuizAttempt(params: {
  customUrl: string;
  attemptId: string;
  answers: Record<string, string>;
  firstName?: string;
  email?: string;
  metadata: RequestMetadata;
}): Promise<PublicQuizResult> {
  const bundle = await getPublishedQuizBundle(params.customUrl);
  const definition = parseQuizDefinition(bundle.guide, bundle.quiz);

  const [existingAttempt] = await db.select().from(quizAttempts).where(and(
    eq(quizAttempts.id, params.attemptId),
    eq(quizAttempts.quizId, bundle.quiz.id),
    eq(quizAttempts.landingPageId, bundle.landingPage.id),
  ));
  if (!existingAttempt) throw new QuizStorageError(404, "Quiz attempt not found");
  if (existingAttempt.completedAt) {
    return buildPublicResult(existingAttempt, definition, bundle);
  }

  const { outcome, scoreMap } = scoreQuizOutcome(
    definition.questions,
    definition.outcomes,
    params.answers,
  );

  if (definition.leadCapture.enabled && definition.leadCapture.required && !params.email) {
    throw new QuizStorageError(400, "Email is required to view this result");
  }

  const resultAssets = await getResultAssets(outcome, bundle);
  const resultSnapshot = quizResultSnapshotSchema.parse({
    version: 1,
    outcome: toPublicQuizOutcome(outcome),
    ...resultAssets,
  });

  const attempt = await db.transaction(async (tx) => {
    const [claimed] = await tx.update(quizAttempts).set({
      answerMap: params.answers,
      scoreMap,
      outcomeId: outcome.id,
      resultSnapshot,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(
      eq(quizAttempts.id, params.attemptId),
      eq(quizAttempts.quizId, bundle.quiz.id),
      eq(quizAttempts.landingPageId, bundle.landingPage.id),
      isNull(quizAttempts.completedAt),
    )).returning();

    if (!claimed) {
      const [existing] = await tx.select().from(quizAttempts).where(and(
        eq(quizAttempts.id, params.attemptId),
        eq(quizAttempts.quizId, bundle.quiz.id),
        eq(quizAttempts.landingPageId, bundle.landingPage.id),
      ));
      if (!existing) throw new QuizStorageError(404, "Quiz attempt not found");
      return existing;
    }

    let leadId: number | null = null;
    if (definition.leadCapture.enabled && params.email) {
      const [lead] = await tx.insert(leads).values({
        landingPageId: bundle.landingPage.id,
        guideId: bundle.guide.id,
        userId: bundle.guide.userId,
        email: params.email,
        firstName: params.firstName,
        tags: [...(bundle.guide.leadTags || []), `quiz-outcome:${outcome.id}`],
        customFieldData: {
          quizAttemptId: claimed.id,
          answers: params.answers,
          outcomeId: outcome.id,
        },
        ...params.metadata,
      }).returning({ id: leads.id });
      leadId = lead.id;

      await tx.update(landingPages).set({
        conversions: sql`COALESCE(${landingPages.conversions}, 0) + 1`,
      }).where(eq(landingPages.id, bundle.landingPage.id));
      await tx.update(guides).set({
        downloads: sql`COALESCE(${guides.downloads}, 0) + 1`,
      }).where(eq(guides.id, bundle.guide.id));
      await tx.update(quizAttempts).set({ leadId, updatedAt: new Date() })
        .where(eq(quizAttempts.id, claimed.id));
    }

    await tx.insert(analyticsEvents).values({
      userId: bundle.guide.userId,
      guideId: bundle.guide.id,
      landingPageId: bundle.landingPage.id,
      eventType: "quiz_complete",
      eventData: { attemptId: claimed.id, outcomeId: outcome.id, leadId },
      ...params.metadata,
    });

    return { ...claimed, leadId };
  });

  return buildPublicResult(attempt, definition, bundle);
}

async function getPublishedAttempt(attemptId: string): Promise<{
  attempt: QuizAttempt;
  bundle: QuizBundle;
  definition: QuizDefinition;
}> {
  const [row] = await db
    .select({
      attempt: quizAttempts,
      quiz: quizzes,
      guide: guides,
      landingPage: landingPages,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
    .innerJoin(guides, eq(quizzes.guideId, guides.id))
    .innerJoin(landingPages, eq(quizAttempts.landingPageId, landingPages.id))
    .where(and(
      eq(quizAttempts.id, attemptId),
      eq(guides.status, "published"),
      eq(guides.magnetType, "quiz"),
      eq(landingPages.isActive, true),
    ));
  if (!row) throw new QuizStorageError(404, "Quiz result not found");

  const bundle = { guide: row.guide, landingPage: row.landingPage, quiz: row.quiz };
  return { attempt: row.attempt, bundle, definition: parseQuizDefinition(row.guide, row.quiz) };
}

export async function getPublicQuizResult(
  attemptId: string,
  metadata?: RequestMetadata,
): Promise<PublicQuizResult> {
  const { attempt, bundle, definition } = await getPublishedAttempt(attemptId);
  if (!attempt.completedAt) throw new QuizStorageError(409, "Quiz attempt is not complete");

  if (!attempt.resultViewedAt) {
    await db.transaction(async (tx) => {
      const [claimedView] = await tx
        .update(quizAttempts)
        .set({ resultViewedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(quizAttempts.id, attempt.id), isNull(quizAttempts.resultViewedAt)))
        .returning({ id: quizAttempts.id });
      if (claimedView) {
        await tx.insert(analyticsEvents).values({
          userId: bundle.guide.userId,
          guideId: bundle.guide.id,
          landingPageId: bundle.landingPage.id,
          eventType: "quiz_result_view",
          eventData: { attemptId: attempt.id, outcomeId: attempt.outcomeId },
          ...(metadata || {}),
        });
      }
    });
  }

  return buildPublicResult(attempt, definition, bundle);
}

export async function recordQuizAssetClick(params: {
  attemptId: string;
  kind: "gift" | "cta";
  metadata: RequestMetadata;
}): Promise<{ url: string; asset: PublicBenefitAsset }> {
  const { attempt, bundle, definition } = await getPublishedAttempt(params.attemptId);
  if (!attempt.completedAt || !attempt.outcomeId) {
    throw new QuizStorageError(409, "Quiz attempt is not complete");
  }

  const snapshot = parseStoredResultSnapshot(attempt);
  let assetId: number;
  let publicAsset: PublicBenefitAsset;
  let currentAssetId: number | null = null;

  if (snapshot) {
    const storedAsset = params.kind === "gift" ? snapshot.gift : snapshot.cta;
    if (!storedAsset) throw new QuizStorageError(404, "Benefit asset not found");
    assetId = storedAsset.assetId;
    publicAsset = toPublicSnapshotAsset(storedAsset);
    const [currentAsset] = await db
      .select({ id: benefitAssets.id })
      .from(benefitAssets)
      .where(eq(benefitAssets.id, storedAsset.assetId));
    currentAssetId = currentAsset?.id ?? null;
  } else {
    const outcome = definition.outcomes.find((candidate) => candidate.id === attempt.outcomeId);
    if (!outcome) throw new QuizStorageError(410, "Quiz result is no longer available");
    const legacyAssetId = params.kind === "gift" ? outcome.giftAssetId : outcome.ctaAssetId;
    if (!legacyAssetId) throw new QuizStorageError(404, "Benefit asset not found");

    const scopeCondition = bundle.quiz.brandId === null
      ? and(eq(benefitAssets.userId, bundle.guide.userId), isNull(benefitAssets.brandId))
      : eq(benefitAssets.brandId, bundle.quiz.brandId);
    const [asset] = await db.select().from(benefitAssets).where(and(
      eq(benefitAssets.id, legacyAssetId),
      eq(benefitAssets.kind, params.kind === "gift" ? "free_gift" : "cta"),
      eq(benefitAssets.status, "active"),
      scopeCondition,
    ));
    if (!asset) throw new QuizStorageError(404, "Benefit asset not found");
    assetId = asset.id;
    currentAssetId = asset.id;
    publicAsset = toPublicBenefitAsset(asset);
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(quizAttempts).set({
      firstClickedAt: attempt.firstClickedAt || now,
      lastClickedAt: now,
      clickCount: sql`${quizAttempts.clickCount} + 1`,
      ...(currentAssetId ? { clickedAssetId: currentAssetId } : {}),
      updatedAt: now,
    }).where(eq(quizAttempts.id, attempt.id));
    await tx.insert(analyticsEvents).values({
      userId: bundle.guide.userId,
      guideId: bundle.guide.id,
      landingPageId: bundle.landingPage.id,
      eventType: params.kind === "gift" ? "quiz_gift_click" : "quiz_cta_click",
      eventData: { attemptId: attempt.id, outcomeId: attempt.outcomeId, assetId },
      ...params.metadata,
    });
  });

  return { url: publicAsset.url, asset: publicAsset };
}
