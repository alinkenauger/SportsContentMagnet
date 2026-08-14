import type { Express, RequestHandler } from "express";
import { z } from "zod";
import {
  benefitAssetCreateSchema,
  benefitAssetUpdateSchema,
  completeQuizRequestSchema,
  generateQuizRequestSchema,
  QuizScoringError,
  quizClickRequestSchema,
  updateQuizRequestSchema,
} from "@shared/quiz";
import { isAuthenticated } from "./replitAuth";
import {
  getRequestUserId,
  requireRequestUser,
  type RequestWithUser,
} from "./requestUser";
import { QuizGenerationError, generateQuizDefinition } from "./services/quizGenerator";
import { BrandAccessError } from "./brandAccess";
import { createRateLimit } from "./rateLimit";
import {
  QuizStorageError,
  completeQuizAttempt,
  createBenefitAssetForUser,
  createQuizFunnel,
  getPublicQuiz,
  getPublicQuizResult,
  getQuizForUser,
  listBenefitAssetsForUser,
  publishQuizForUser,
  recordPublicQuizView,
  recordQuizAssetClick,
  startQuizAttempt,
  updateBenefitAssetForUser,
  updateQuizForUser,
} from "./quizStorage";

const positiveIdSchema = z.string()
  .regex(/^[1-9]\d*$/, "ID must be a positive integer")
  .transform(Number)
  .refine(Number.isSafeInteger, "ID is too large");

const customUrlSchema = z.string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid quiz URL");

const attemptIdSchema = z.string().uuid();

type AsyncQuizHandler = (
  req: RequestWithUser,
  res: Parameters<RequestHandler>[1],
) => Promise<void>;

function requestMetadata(req: RequestWithUser) {
  return {
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get("user-agent"),
    referrer: req.get("referer"),
  };
}

function authenticatedUserId(req: RequestWithUser): string {
  const userId = getRequestUserId(req);
  if (!userId) throw new QuizStorageError(401, "Authentication required");
  return userId;
}

function requestedBrandId(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === "personal" || value === "null") return null;
  return positiveIdSchema.parse(value);
}

function sendQuizError(res: Parameters<RequestHandler>[1], error: unknown): void {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      message: "Invalid request",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof QuizStorageError) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  if (error instanceof BrandAccessError) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  if (error instanceof QuizScoringError) {
    res.status(400).json({ message: error.message, code: error.code });
    return;
  }

  if (error instanceof QuizGenerationError) {
    const status = error.message === "Quiz generation is not configured" ? 503 : 502;
    res.status(status).json({ message: error.message });
    return;
  }

  console.error("Quiz API error:", error);
  res.status(500).json({ message: "Quiz request failed" });
}

function quizRoute(handler: AsyncQuizHandler): RequestHandler {
  return async (req, res) => {
    try {
      await handler(req as RequestWithUser, res);
    } catch (error) {
      sendQuizError(res, error);
    }
  };
}

export function registerQuizRoutes(app: Express): void {
  const publicQuizRateLimit = createRateLimit({
    windowMs: 10 * 60 * 1_000,
    max: 240,
    keyPrefix: "public-quiz",
  });
  const quizStartRateLimit = createRateLimit({
    windowMs: 10 * 60 * 1_000,
    max: 30,
    keyPrefix: "public-quiz-start",
    key: (req) => `${req.ip || req.socket.remoteAddress || "unknown"}:${req.params.customUrl || "unknown"}`,
  });
  const quizGenerationRateLimit = createRateLimit({
    windowMs: 60 * 60 * 1_000,
    max: 10,
    keyPrefix: "quiz-generation",
    key: (req) => getRequestUserId(req) || req.ip || req.socket.remoteAddress || "unknown",
  });
  app.post(
    "/api/quizzes/generate",
    isAuthenticated,
    requireRequestUser,
    quizGenerationRateLimit,
    quizRoute(async (req, res) => {
      const input = generateQuizRequestSchema.parse(req.body);
      const definition = await generateQuizDefinition(input);
      const bundle = await createQuizFunnel({
        userId: authenticatedUserId(req),
        brandId: input.brandId,
        sourceContent: input.sourceContent,
        definition,
        themeMode: input.themeMode,
      });
      res.status(201).json(bundle);
    }),
  );

  app.get(
    "/api/quizzes/:guideId",
    isAuthenticated,
    requireRequestUser,
    quizRoute(async (req, res) => {
      const guideId = positiveIdSchema.parse(req.params.guideId);
      const bundle = await getQuizForUser(authenticatedUserId(req), guideId);
      res.json(bundle);
    }),
  );

  app.put(
    "/api/quizzes/:guideId",
    isAuthenticated,
    requireRequestUser,
    quizRoute(async (req, res) => {
      const guideId = positiveIdSchema.parse(req.params.guideId);
      const input = updateQuizRequestSchema.parse(req.body);
      const bundle = await updateQuizForUser(authenticatedUserId(req), guideId, input);
      res.json(bundle);
    }),
  );

  app.post(
    "/api/quizzes/:guideId/publish",
    isAuthenticated,
    requireRequestUser,
    quizRoute(async (req, res) => {
      const guideId = positiveIdSchema.parse(req.params.guideId);
      const bundle = await publishQuizForUser(authenticatedUserId(req), guideId);
      res.json(bundle);
    }),
  );

  app.get(
    "/api/benefit-assets",
    isAuthenticated,
    requireRequestUser,
    quizRoute(async (req, res) => {
      const assets = await listBenefitAssetsForUser(
        authenticatedUserId(req),
        requestedBrandId(req.query.brandId),
      );
      res.json(assets);
    }),
  );

  app.post(
    "/api/benefit-assets",
    isAuthenticated,
    requireRequestUser,
    quizRoute(async (req, res) => {
      const input = benefitAssetCreateSchema.parse(req.body);
      const asset = await createBenefitAssetForUser(authenticatedUserId(req), input);
      res.status(201).json(asset);
    }),
  );

  app.put(
    "/api/benefit-assets/:assetId",
    isAuthenticated,
    requireRequestUser,
    quizRoute(async (req, res) => {
      const assetId = positiveIdSchema.parse(req.params.assetId);
      const input = benefitAssetUpdateSchema.parse(req.body);
      const asset = await updateBenefitAssetForUser(authenticatedUserId(req), assetId, input);
      res.json(asset);
    }),
  );

  app.get(
    "/api/public/quizzes/:customUrl",
    publicQuizRateLimit,
    quizRoute(async (req, res) => {
      const customUrl = customUrlSchema.parse(req.params.customUrl);
      const quiz = await getPublicQuiz(customUrl);
      await recordPublicQuizView(customUrl, requestMetadata(req));
      res.json(quiz);
    }),
  );

  app.post(
    "/api/public/quizzes/:customUrl/start",
    publicQuizRateLimit,
    quizStartRateLimit,
    quizRoute(async (req, res) => {
      const customUrl = customUrlSchema.parse(req.params.customUrl);
      const result = await startQuizAttempt(customUrl, requestMetadata(req));
      res.status(201).json(result);
    }),
  );

  app.post(
    "/api/public/quizzes/:customUrl/complete",
    publicQuizRateLimit,
    quizRoute(async (req, res) => {
      const customUrl = customUrlSchema.parse(req.params.customUrl);
      const input = completeQuizRequestSchema.parse(req.body);
      const result = await completeQuizAttempt({
        customUrl,
        ...input,
        metadata: requestMetadata(req),
      });
      res.json(result);
    }),
  );

  app.get(
    "/api/public/quiz-results/:attemptId",
    publicQuizRateLimit,
    quizRoute(async (req, res) => {
      const attemptId = attemptIdSchema.parse(req.params.attemptId);
      const result = await getPublicQuizResult(attemptId, requestMetadata(req));
      res.json(result);
    }),
  );

  app.post(
    "/api/public/quiz-results/:attemptId/click",
    publicQuizRateLimit,
    quizRoute(async (req, res) => {
      const attemptId = attemptIdSchema.parse(req.params.attemptId);
      const input = quizClickRequestSchema.parse(req.body);
      const result = await recordQuizAssetClick({
        attemptId,
        kind: input.kind,
        metadata: requestMetadata(req),
      });
      res.json(result);
    }),
  );
}
