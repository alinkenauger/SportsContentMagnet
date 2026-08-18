import type { Express, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { randomBytes, randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireSuperAdmin, requireAccountAdmin, requireBrandAdmin } from "./roleAuth";
import { analyzeVideoContent, generatePracticeGuide } from "./services/openai";
import { getYouTubeVideoData, transcribeVideo } from "./services/youtube";
import { EmailService } from "./services/emailService";
import {
  insertBrandSchema,
  insertGuideSchema,
  insertLandingPageSchema,
  insertLeadSchema,
  insertTrainingSettingsSchema,
  insertKnowledgebaseEntrySchema,
  brandUsers,
  guides,
  landingPages,
  quizzes,
  subscriptionPlans,
} from "@shared/schema";
import { db, pool } from "./db";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import QRCode from 'qrcode';
import multer from 'multer';
import { StorageCostManager } from "./services/storageManager";
import fs from 'fs';
import path from 'path';
import { getServiceConfiguration } from './services/deploymentChecker';
import { registerAuthRoutes } from "./authRoutes";
import { registerQuizRoutes } from "./quizRoutes";
import { getRequestUserId } from "./requestUser";
import { isDirectlyAccessibleGuide } from "./guideVisibility";
import { hasAllowedBrandImageSignature } from "./brandAssetValidation";
import {
  BrandAccessError,
  assertBrandAccess,
  assertGuideAccess,
  listAccessibleBrands,
  resolveBrandIdForUser,
  resolveCurrentBrandScope,
} from "./brandAccess";
import {
  mergeBrandAppearance,
  resolveAppearanceForScope,
  resolveBrandingEnvelope,
  resolvePublicAppearanceForGuide,
  toBrandingPersistence,
} from "./brandAppearance";
import {
  brandAppearanceUpdateSchema,
  brandScopeMatches,
  brandScopeExpectationSchema,
} from "@shared/branding";
import {
  guideCreationBriefSchema,
  inferGuideFormatFromTemplate,
  type GuideCreationBrief,
} from "@shared/guideContent";
import { GuideQualityError } from "./services/guideQuality";
import { validateStoredGuideForPublish } from "./guidePublishValidation";
import { buildGuideRegenerationContext } from "./services/guideRegeneration";
import { createRateLimit } from "./rateLimit";
import { createDeliveryAccessToken, verifyDeliveryAccessToken } from "./deliveryAccess";
import {
  createIpResourceRateKey,
  landingSubmissionIssues,
  publicGuideIdSchema,
  publicLandingSlugSchema,
  publicLeadSubmissionSchema,
  recordPublicGuideView,
  recordPublicLandingView,
} from "./publicGuideSafety";
import {
  createPresentationProfile,
  normalizePresentationProfile,
  parseYouTubeSource,
  presentationSelectionSchema,
  youtubeSourceFromStoredFields,
  type YouTubeSource,
} from "@shared/presentation";
import {
  includeInLibraryInputSchema,
  libraryInclusionUpdateSchema,
  librarySlugSchema,
  publicLibraryQuerySchema,
} from "@shared/library";
import {
  ensureBrandLibraryForWriter,
  getPublicMagnetLibrary,
  prepareBrandLibraryKnowledge,
  provisionBrandLibrary,
  resolvePublicLibraryContextForGuide,
} from "./magnetLibrary";
import {
  BRAND_ASSET_URL_PREFIX,
  BrandAssetQuotaError,
  createBrandAssetStore,
} from "./brandAssetStorage";
import Stripe from "stripe";
// import pdf from 'pdf-parse'; // Temporarily disabled due to module issues

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Helper function to get user ID from either authentication method
function getUserId(req: any): string | null {
  return getRequestUserId(req);
}

function requestText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

const adminRoleSchema = z.enum(["user", "brand_admin", "account_admin", "super_admin"]);
const positiveRouteIdSchema = z.string()
  .regex(/^[1-9]\d*$/, "ID must be a positive integer")
  .transform(Number)
  .refine(Number.isSafeInteger, "ID is too large");
const adminCreateUserSchema = z.object({
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  role: adminRoleSchema.default("user"),
});
const guideRegenerationRequestSchema = z.object({
  instructions: z.preprocess(
    (value) => typeof value === "string" && value.trim().length === 0 ? undefined : value,
    z.string()
      .trim()
      .min(10, "Tell the AI what you want improved")
      .max(1_200, "Improvement instructions must be 1,200 characters or fewer")
      .optional(),
  ),
}).strict();

function guideBriefFromRequest(body: Record<string, unknown>, selectedTemplate?: string): unknown {
  const nestedBrief = typeof body.creationBrief === "object" &&
    body.creationBrief !== null &&
    !Array.isArray(body.creationBrief)
    ? body.creationBrief as Record<string, unknown>
    : {};

  return {
    format: requestText(nestedBrief.format) || requestText(body.format) ||
      inferGuideFormatFromTemplate(selectedTemplate),
    audience: requestText(nestedBrief.audience) || requestText(body.audience) ||
      requestText(body.targetAudience),
    difficulty: requestText(nestedBrief.difficulty) || requestText(body.difficulty),
    focus: requestText(nestedBrief.focus) || requestText(body.focus) ||
      requestText(body.customInstructions),
    desiredOutcome: requestText(nestedBrief.desiredOutcome) || requestText(body.desiredOutcome),
    availableTime: requestText(nestedBrief.availableTime) || requestText(body.availableTime),
    customInstructions: requestText(nestedBrief.customInstructions) ||
      requestText(body.additionalInstructions) || requestText(body.customInstructions),
  };
}

function presentationSelectionFromRequest(body: Record<string, unknown>): unknown {
  let raw = body.presentationSelection;
  if (typeof raw === "string" && raw.trim().startsWith("{")) {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = undefined;
    }
  }
  if (!raw && typeof body.presentationPreset === "string") {
    raw = body.presentationPreset === "auto"
      ? { mode: "auto" }
      : { mode: "manual", preset: body.presentationPreset };
  }
  return raw ?? { mode: "auto" };
}

function sendBrandRouteError(res: Response, error: unknown, fallback: string): void {
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
  if (error instanceof BrandAccessError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof GuideQualityError) {
    res.status(422).json({
      code: error.code,
      message: "The source could not yet produce a publish-quality guide. Add more source detail or adjust the requested format.",
      issues: error.audit.issues.map((issue) => ({ code: issue.code, message: issue.message })),
    });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ message: fallback });
}

function brandingUpdateFromBody(body: unknown) {
  const record = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const candidate = record.appearance && typeof record.appearance === "object" && !Array.isArray(record.appearance)
    ? record.appearance
    : record;
  const {
    id: _id,
    userId: _userId,
    brandId: _brandId,
    scope: _scope,
    capabilities: _capabilities,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    expectedScope: _nestedExpectedScope,
    ...appearance
  } = candidate as Record<string, unknown>;
  return {
    appearance: brandAppearanceUpdateSchema.parse(appearance),
    expectedScope: record.expectedScope === undefined
      ? undefined
      : brandScopeExpectationSchema.parse(record.expectedScope),
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get deployment configuration
  const serviceConfig = getServiceConfiguration();
  const brandAssetStore = createBrandAssetStore({
    database: {
      query: async (text, values) => {
        const result = await pool.query(text, values as any[] | undefined);
        return {
          rows: result.rows as Array<Record<string, unknown>>,
          rowCount: result.rowCount,
        };
      },
      transaction: async (work) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const transactionClient = {
            query: async (text: string, values?: unknown[]) => {
              const result = await client.query(text, values as any[] | undefined);
              return {
                rows: result.rows as Array<Record<string, unknown>>,
                rowCount: result.rowCount,
              };
            },
          };
          const result = await work(transactionClient);
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    },
  });
  const publicLandingReadRateLimit = createRateLimit({
    windowMs: 10 * 60 * 1_000,
    max: 120,
    keyPrefix: "public-landing-read",
    key: createIpResourceRateKey("customUrl"),
  });
  const publicLandingSubmitRateLimit = createRateLimit({
    windowMs: 60 * 60 * 1_000,
    max: 8,
    keyPrefix: "public-landing-submit",
    key: createIpResourceRateKey("customUrl"),
  });
  const publicDeliveryReadRateLimit = createRateLimit({
    windowMs: 10 * 60 * 1_000,
    max: 60,
    keyPrefix: "public-delivery-read",
    key: createIpResourceRateKey("customUrl"),
  });
  const publicGuideViewRateLimit = createRateLimit({
    windowMs: 10 * 60 * 1_000,
    max: 60,
    keyPrefix: "public-guide-view",
    key: createIpResourceRateKey("id"),
  });
  const guideGenerationRateLimit = createRateLimit({
    windowMs: 60 * 60 * 1_000,
    max: 10,
    keyPrefix: "guide-generation",
    key: (req) => getRequestUserId(req) || req.ip || req.socket.remoteAddress || "unknown",
  });

  // Conditional imports based on deployment mode
  let sharp: any = null;
  let processImage: any = null;
  let processImageToFile: any = null;
  let generateGuidePDF: any = null;
  let generatePDFFilename: any = null;

  if (serviceConfig.useLightweightImage) {
    const imageModule = await import('./services/imageProcessor-lite');
    processImage = imageModule.processImage;
    processImageToFile = imageModule.processImageToFile;
  } else {
    sharp = (await import('sharp')).default;
  }

  if (serviceConfig.useLightweightPDF) {
    const pdfModule = await import('./services/pdfGenerator-lite');
    generateGuidePDF = pdfModule.generateGuidePDF;
    generatePDFFilename = pdfModule.generatePDFFilename;
  } else {
    const pdfModule = await import('./services/pdfGenerator');
    generateGuidePDF = pdfModule.generateGuidePDF;
    generatePDFFilename = pdfModule.generatePDFFilename;
  }
  // Health check endpoint for Docker
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Filesystem assets are served by Express static middleware in development.
  // Database-backed assets fall through to this immutable public route in
  // production, keeping every autoscaled replica on the same source of truth.
  app.get(`${BRAND_ASSET_URL_PREFIX}/:assetKey`, async (req, res) => {
    try {
      const asset = await brandAssetStore.get(req.params.assetKey);
      if (!asset) return res.status(404).end();

      const etag = `"${asset.sha256}"`;
      res.set({
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(asset.byteSize),
        "Content-Security-Policy": "default-src 'none'",
        "Content-Type": asset.contentType,
        "Cross-Origin-Resource-Policy": "cross-origin",
        ETag: etag,
        "X-Content-Type-Options": "nosniff",
      });
      if (req.get("If-None-Match") === etag) return res.status(304).end();
      return res.status(200).send(asset.content);
    } catch (error) {
      console.error("Failed to read brand asset:", error);
      return res.status(500).end();
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept PDF files and audio files
      if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF and audio files are allowed') as any, false);
      }
    }
  });

  // Logo upload with specific configuration
  const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit for logos
    },
    fileFilter: (req, file, cb) => {
      // Limit same-origin public assets to formats that cannot execute scripts.
      if (['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PNG, JPEG, or WebP images are allowed') as any, false);
      }
    }
  });

  const brandAssetUploadRateLimit = createRateLimit({
    windowMs: 24 * 60 * 60 * 1_000,
    max: 24,
    keyPrefix: "brand-asset-upload",
    key: (req) => getRequestUserId(req as any) || req.ip || "unknown",
  });

  // Use Replit Auth with admin bypass system
  await setupAuth(app);
  
  // Register custom auth routes (signup, password reset, etc.)
  registerAuthRoutes(app);

  // Register interactive quiz authoring, public runner, and benefit-library routes.
  registerQuizRoutes(app);

  // Local debugging only. Never expose an arbitrary-recipient email trigger in production.
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/test-email", isAuthenticated, requireSuperAdmin, async (req, res) => {
      try {
        const email = z.string().trim().email().max(320).parse(req.body?.email);
        const { EmailService } = await import('./services/emailService');
        const emailService = new EmailService();

        const result = await emailService.sendGuideDeliveryEmail(
          { email, firstName: 'Test User' },
          'Test Guide',
          'https://example.com/guide',
          'https://example.com/landing'
        );

        res.json({
          success: result,
          message: result ? 'Test email sent successfully' : 'Failed to send test email',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "A valid email is required" });
        }
        console.error('Email delivery failed:', error);
        res.status(500).json({ error: 'Failed to send test email' });
      }
    });
  }

  // Primary auth route (Google OAuth)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      return res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        currentBrandId: user.currentBrandId,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Brand routes
  app.get('/api/brands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      res.json(await listAccessibleBrands(userId));
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to fetch brands");
    }
  });

  app.post('/api/brands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const brandData = insertBrandSchema.omit({ userId: true }).parse(req.body);
      
      const brand = await storage.createBrand({ ...brandData, userId });
      
      // If this is the user's first brand, set it as current
      const userBrands = await storage.getBrandsByUser(userId);
      if (userBrands.length === 1) {
        await storage.setCurrentBrand(userId, brand.id);
      }
      
      res.json(brand);
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to create brand");
    }
  });

  app.put('/api/brands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const brandId = parseInt(req.params.id);
      await assertBrandAccess(userId, brandId, "manage_brand");
      const update = insertBrandSchema.omit({ userId: true }).partial().parse(req.body);
      const updatedBrand = await storage.updateBrand(brandId, update);
      res.json(updatedBrand);
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to update brand");
    }
  });

  app.post('/api/brands/:id/library', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const brandId = positiveRouteIdSchema.parse(req.params.id);
      const result = await provisionBrandLibrary(userId, brandId);
      res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to provision Magnet Library");
    }
  });

  app.post('/api/brands/:id/set-current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const brandId = parseInt(req.params.id);
      await assertBrandAccess(userId, brandId, "read");
      
      await storage.setCurrentBrand(userId, brandId);
      if (req.session?.user) {
        req.session.user.currentBrandId = brandId;
      }
      res.json({ success: true });
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to set current brand");
    }
  });

  app.post('/api/brands/clear-current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      await storage.setCurrentBrand(userId, null);
      if (req.session?.user) {
        req.session.user.currentBrandId = null;
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing current brand:", error);
      res.status(500).json({ message: "Failed to clear current brand" });
    }
  });

  app.delete('/api/brands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const brandId = parseInt(req.params.id);
      
      // Verify brand ownership
      const brand = await storage.getBrand(brandId);
      if (!brand || brand.userId !== userId) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      // Don't allow deletion if it's the only brand
      const userBrands = await storage.getBrandsByUser(userId);
      if (userBrands.length === 1) {
        return res.status(400).json({ message: "Cannot delete your only brand" });
      }
      
      await storage.deleteBrand(brandId);
      res.json({ success: true });
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to delete brand");
    }
  });

    // Removed Google auth status endpoint

  // Removed Google OAuth user endpoint

  // Test transcription endpoint (for debugging)
  app.post('/api/test-transcription', async (req, res) => {
    try {
      const { videoId } = req.body;
      if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
      }
      
      console.log(`Testing transcription for video: ${videoId}`);
      const transcript = await transcribeVideo(videoId);
      
      // Handle different transcript response formats
      const transcriptText = typeof transcript === 'string' 
        ? transcript 
        : transcript?.text || 'No transcript available';
      
      res.json({ 
        success: true, 
        transcript: transcriptText.substring(0, 500) + '...', // Truncate for response
        length: transcriptText.length 
      });
    } catch (error) {
      console.error('Test transcription error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
  });

  // Dashboard analytics
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const scope = await resolveCurrentBrandScope(userId, "read");
      const stats = await storage.getAnalyticsByUser(userId, scope.brandId);
      res.json(stats);
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to fetch dashboard stats");
    }
  });

  // Guide routes - handle multiple content types
  app.post('/api/guides', isAuthenticated, guideGenerationRateLimit, upload.single('file'), async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      let videoData: any;
      let transcript: string;
      let inputMethod = req.body.inputMethod;
      
      // Extract common parameters
      let youtubeUrl = requestText(req.body.youtubeUrl);
      let sourceVideo: YouTubeSource | null = null;
      const { leadTags, collectSms, smsConsentText, selectedTemplate } = req.body;
      const briefResult = guideCreationBriefSchema.safeParse(
        guideBriefFromRequest(req.body, selectedTemplate),
      );
      if (!briefResult.success) {
        return res.status(400).json({
          message: "Invalid guide creation brief",
          issues: briefResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }
      const creationBrief: GuideCreationBrief = briefResult.data;
      const presentationResult = presentationSelectionSchema.safeParse(
        presentationSelectionFromRequest(req.body),
      );
      if (!presentationResult.success) {
        return res.status(400).json({ message: "Invalid presentation selection" });
      }
      const libraryInclusionResult = includeInLibraryInputSchema.optional().default(true)
        .safeParse(req.body.includeInLibrary);
      if (!libraryInclusionResult.success) {
        return res.status(400).json({ message: "Invalid library inclusion setting" });
      }
      console.log(`Guide creation: inputMethod=${inputMethod}, youtubeUrl=${youtubeUrl}, template=${selectedTemplate}`);
      
      // Handle different input methods
      if (inputMethod === "youtube") {
        if (!youtubeUrl) {
          return res.status(400).json({ message: "YouTube URL is required" });
        }

        sourceVideo = parseYouTubeSource(youtubeUrl);
        if (!sourceVideo) {
          return res.status(400).json({ message: "Enter a valid YouTube video URL" });
        }
        youtubeUrl = sourceVideo.canonicalUrl;

        // Extract video metadata and transcribe
        videoData = await getYouTubeVideoData(youtubeUrl);
        const transcriptionResult = await transcribeVideo(videoData.videoId);
        
        // Handle both string and object responses from transcription
        if (typeof transcriptionResult === 'string') {
          transcript = transcriptionResult;
        } else if (transcriptionResult && typeof transcriptionResult === 'object') {
          transcript = transcriptionResult.text;
          // Store segments for timestamp generation
          videoData.segments = transcriptionResult.segments || [];
        } else {
          throw new Error('Invalid transcription result');
        }
        
      } else if (inputMethod === "manual") {
        const { transcript: manualTranscript, title } = req.body;
        if (!manualTranscript || !title) {
          return res.status(400).json({ message: "Manual transcript and title are required" });
        }
        
        videoData = {
          videoId: `manual-${Date.now()}`,
          title: title,
          description: "",
          thumbnailUrl: "",
          duration: "0:00",
          channelTitle: "Manual Upload",
          publishedAt: new Date().toISOString(),
          viewCount: 0,
          likeCount: 0
        };
        
        transcript = manualTranscript;
        
      } else if (inputMethod === "pdf") {
        const { title } = req.body;
        if (!req.file || !title) {
          return res.status(400).json({ message: "PDF file and title are required" });
        }

        // Temporarily return error for PDF processing until library is fixed
        return res.status(501).json({ 
          message: "PDF processing temporarily unavailable. Please extract text manually and use the 'Text/Transcript' option instead." 
        });
        
      } else if (inputMethod === "audio") {
        const { title } = req.body;
        if (!req.file || !title) {
          return res.status(400).json({ message: "Audio file and title are required" });
        }

        // Import and use audio transcription service
        const { audioTranscription } = await import('./services/audioTranscription');
        
        // Check if file format is supported
        if (!audioTranscription.isFormatSupported(req.file.path)) {
          return res.status(400).json({ 
            message: `Unsupported audio format. Supported formats: ${audioTranscription.getSupportedFormats().join(', ')}` 
          });
        }

        // Transcribe the audio file
        const transcriptionResult = await audioTranscription.transcribeFile(req.file.path);
        
        if (!transcriptionResult.success) {
          return res.status(500).json({ 
            message: `Audio transcription failed: ${transcriptionResult.error}` 
          });
        }

        videoData = {
          videoId: `audio-${Date.now()}`,
          title: title,
          description: `Transcribed from audio file: ${req.file.originalname}`,
          thumbnailUrl: "",
          duration: "Unknown",
          channelTitle: "Audio Upload",
          publishedAt: new Date().toISOString(),
          viewCount: 0,
          likeCount: 0
        };
        
        transcript = transcriptionResult.text || "";
        
      } else if (inputMethod === "streaming") {
        const { streamingUrl, title } = req.body;
        if (!streamingUrl || !title) {
          return res.status(400).json({ message: "Streaming URL and title are required" });
        }

        // For streaming content, we'll need to extract and process
        // This would require additional setup for streaming video processing
        // For now, we'll return an error and suggest manual transcription
        return res.status(501).json({ 
          message: "Streaming video processing not yet implemented. Please manually transcribe your content and use the 'Text/Transcript' option instead." 
        });
        
      } else {
        return res.status(400).json({ message: "Invalid input method" });
      }
      
      // Step 3: Get user's training settings for AI customization
      const currentBrandId = await resolveBrandIdForUser(userId, undefined, "write_content");
      const trainingSettings = await storage.getTrainingSettings(userId);
      const brandingSettings = await resolveAppearanceForScope(userId, currentBrandId);
      const libraryKnowledge = await prepareBrandLibraryKnowledge({
        userId,
        brandId: currentBrandId,
        query: {
          title: videoData.title,
          sourceContent: transcript.slice(0, 12_000),
          audience: creationBrief.audience,
          objective: creationBrief.desiredOutcome || creationBrief.focus,
        },
      });
      
      // Step 4: Analyze content and generate practice guide
      let guideContent;
      let analysis;
      let screenshots = null;
      
      if (videoData.segments && videoData.segments.length > 0) {
        // Build the source inventory first so timestamped Guides preserve the
        // video's full instructional depth instead of generating from labels alone.
        analysis = await analyzeVideoContent(
          transcript,
          videoData.title,
          videoData.description,
          creationBrief,
          selectedTemplate,
          libraryKnowledge,
        );

        // Use timestamped content generation for YouTube videos with timing data.
        const { generateTimestampedContent } = await import('./services/aiContentWithTimestamps');
        guideContent = await generateTimestampedContent(
          transcript,
          videoData.segments,
          videoData,
          trainingSettings,
          selectedTemplate,
          creationBrief,
          brandingSettings,
          libraryKnowledge,
          analysis,
        );
        
        // Step 4.5: Extract screenshots for YouTube videos if URL provided
        console.log(`Debug screenshot check: youtubeUrl=${youtubeUrl}, sections=${guideContent.sections?.length || 0}`);
        console.log('Guide content sections:', guideContent.sections?.map(s => ({ title: s.title, timestamp: s.timestamp, type: s.type })));
        
        if (youtubeUrl && guideContent.sections && guideContent.sections.length > 0) {
          try {
            console.log('Extracting screenshots for timestamped sections...');
            const { videoScreenshotService } = await import('./services/videoScreenshotService');
            
            // Map guide sections to screenshot timestamps
            const timestampData = guideContent.sections.map((section: any) => ({
              timestamp: section.timestampSeconds || 0, // Use numeric timestampSeconds for FFmpeg
              duration: section.duration || 30,
              title: section.title || 'Section'
            }));
            
            console.log(`Timestamp data for screenshots:`, timestampData.map(t => ({ title: t.title, timestamp: t.timestamp })));
            
            const screenshotResult = await videoScreenshotService.extractScreenshots(youtubeUrl, timestampData);
            
            if (screenshotResult.success && screenshotResult.screenshots) {
              screenshots = screenshotResult.screenshots;
              console.log(`Successfully extracted ${screenshots.length} screenshots`);
              
              // Clean up video file after processing
              if (screenshotResult.cleanup) {
                setTimeout(() => screenshotResult.cleanup!(), 5000); // Cleanup after 5 seconds
              }
            } else {
              console.warn('Screenshot extraction failed:', screenshotResult.error);
            }
          } catch (error) {
            console.warn('Screenshot extraction error:', error);
            // Continue without screenshots - not a critical failure
          }
        }
      } else {
        // Fallback to regular content generation for manual/audio uploads
        analysis = await analyzeVideoContent(
          transcript,
          videoData.title,
          videoData.description,
          creationBrief,
          selectedTemplate,
          libraryKnowledge,
        );
        guideContent = await generatePracticeGuide(
          analysis,
          videoData.title,
          videoData.channelTitle,
          brandingSettings,
          selectedTemplate,
          creationBrief,
          transcript,
          libraryKnowledge,
        );
      }
      
      // Process lead tags (convert comma-separated string to array)
      const processedLeadTags = leadTags ? 
        leadTags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : 
        [];
      
      // Step 6: Create guide in database
      const presentationProfile = createPresentationProfile(presentationResult.data, {
        category: analysis.category,
        title: videoData.title || guideContent.title,
        description: analysis.summary,
        audience: creationBrief.audience || brandingSettings?.targetAudience,
        tags: analysis.keyTips,
        sourceExcerpt: transcript,
      });
      const guide = await storage.createGuide({
        userId,
        brandId: currentBrandId,
        title: guideContent.title,
        description: analysis.summary,
        youtubeUrl: youtubeUrl || null,
        youtubeVideoId: sourceVideo?.videoId ?? null,
        channelTitle: videoData.channelTitle,
        thumbnailUrl: videoData.thumbnailUrl,
        transcript,
        aiAnalysis: analysis,
        content: guideContent,
        screenshots,
        category: analysis.category,
        tags: analysis.keyTips,
        leadTags: processedLeadTags,
        slug: `guide-${Date.now()}`,
        status: 'draft',
        presentationProfile,
        includeInLibrary: libraryInclusionResult.data,
      });

      // Step 7: Generate professional landing page copy
      console.log('Generating professional landing page copy...');
      const { landingPageCopywriter } = await import('./services/landingPageCopywriter');
      const professionalCopy = await landingPageCopywriter.generateLandingPageCopy(
        guideContent as any,
        videoData,
        analysis
      );

      // Step 8: Create landing page with professional copy
      const landingPage = await storage.createLandingPage({
        guideId: guide.id,
        userId,
        title: `Get Your ${guideContent.title}`,
        headline: professionalCopy.headline,
        subheadline: professionalCopy.subheadline,
        description: professionalCopy.description,
        bulletPoints: professionalCopy.bulletPoints,
        socialProof: professionalCopy.socialProof,
        urgencyText: professionalCopy.urgencyText,
        buttonText: professionalCopy.buttonText,
        disclaimer: professionalCopy.disclaimer,
        customFields: [
          { name: 'firstName', label: 'First Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'skillLevel', label: 'Skill Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], required: false }
        ],
        customUrl: `${guide.slug}-landing`,
        collectSms: collectSms === true || collectSms === "true",
        smsConsentText: smsConsentText || "I consent to receive text messages from this business. Message and data rates may apply. Reply STOP to opt out.",
        isActive: true
      });

      if (guide.includeInLibrary === true && guide.brandId !== null) {
        await ensureBrandLibraryForWriter(userId, guide.brandId);
      }

      // Add to knowledge base if enabled (brand-level only)
      if ((req.body.addToKnowledgeBase === true || req.body.addToKnowledgeBase === "true") && guide.brandId) {
        try {
          await storage.createKnowledgebaseEntry({
            userId,
            brandId: guide.brandId,
            title: `${guide.title} - Transcription`,
            content: transcript,
            contentType: "transcription",
            sourceUrl: inputMethod === "youtube" ? youtubeUrl : undefined,
            sourceType: inputMethod === "youtube" ? "url" : "manual",
            tags: ["transcription", "auto-generated", ...(req.body.leadTags ? req.body.leadTags.split(',').map((tag: string) => tag.trim()) : [])],
            isActive: true
          });
          console.log(`Added transcription to brand knowledge base for guide: ${guide.title}`);
        } catch (kbError) {
          console.warn("Failed to add to brand knowledge base, but guide was created successfully:", kbError);
          // Don't fail the whole request if knowledge base addition fails
        }
      }

      res.json({
        guide,
        landingPage,
        landingPageUrl: `/landing/${landingPage.customUrl}`,
        message: "Guide created successfully"
      });

    } catch (error) {
      if (error instanceof BrandAccessError) {
        return res.status(error.status).json({ message: error.message });
      }
      if (error instanceof GuideQualityError) {
        return res.status(422).json({
          code: error.code,
          message: "The source could not yet produce a publish-quality guide. Add more source detail or adjust the requested format.",
          issues: error.audit.issues.map((issue) => ({ code: issue.code, message: issue.message })),
        });
      }
      console.error("=== GUIDE CREATION ERROR ===");
      console.error("Error details:", error);
      console.error("Error name:", (error as Error).name);
      console.error("Error message:", (error as Error).message);
      console.error("Error stack:", (error as Error).stack);
      console.error("Request body:", req.body);
      console.error("========================");
      res.status(500).json({ message: "Failed to create guide: " + (error as Error).message });
    }
  });

  app.get('/api/guides', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const { search, category } = req.query;
      const currentBrandId = await resolveBrandIdForUser(userId, undefined, "read");
      const guides = await storage.getGuidesByUserAndBrand(userId, currentBrandId, search as string, category as string);
      res.json(guides);
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to fetch guides");
    }
  });

  // Endpoint to regenerate screenshots for an existing guide
  app.post('/api/guides/:id/regenerate-screenshots', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = parseInt(req.params.id);
      
      const guide = await storage.getGuide(guideId);
      if (!guide || guide.magnetType !== "guide") {
        return res.status(404).json({ message: "Guide not found" });
      }
      await assertGuideAccess(userId, guide, "write_content");

      if (!guide.youtubeUrl || !(guide.content as any)?.sections) {
        return res.status(400).json({ message: "Guide must have YouTube URL and sections for screenshot extraction" });
      }

      console.log(`Regenerating screenshots for guide ${guideId}...`);
      
      const { videoScreenshotService } = await import('./services/videoScreenshotService');
      
      // Map guide sections to screenshot timestamps
      const timestampData = (guide.content as any).sections.map((section: any) => ({
        timestamp: section.timestampSeconds || 0,
        duration: section.duration || 30,
        title: section.title || 'Section'
      }));
      
      console.log(`Processing ${timestampData.length} timestamps:`, timestampData.map((t: any) => ({ title: t.title, timestamp: t.timestamp })));
      
      const screenshotResult = await videoScreenshotService.extractScreenshots(guide.youtubeUrl, timestampData);
      
      if (screenshotResult.success && screenshotResult.screenshots) {
        const updatedGuide = await storage.updateGuideIfUnchanged(guideId, guide.revision, {
          screenshots: screenshotResult.screenshots
        });
        if (!updatedGuide) {
          screenshotResult.cleanup?.();
          return res.status(409).json({
            code: "guide_changed_during_screenshot_regeneration",
            message: "This Guide changed while its screenshots were being generated. Reload it and try again.",
          });
        }
        
        console.log(`Successfully extracted ${screenshotResult.screenshots.length} screenshots for guide ${guideId}`);
        
        // Clean up video file after processing
        if (screenshotResult.cleanup) {
          setTimeout(() => screenshotResult.cleanup!(), 5000);
        }
        
        res.json({
          success: true,
          screenshots: screenshotResult.screenshots,
          message: `Generated ${screenshotResult.screenshots.length} screenshots`
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: screenshotResult.error || "Unknown error during screenshot extraction" 
        });
      }

    } catch (error) {
      sendBrandRouteError(res, error, "Failed to regenerate screenshots");
    }
  });

  app.get('/api/guides/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = parseInt(req.params.id);
      const guide = await storage.getGuide(guideId);
      
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }
      await assertGuideAccess(userId, guide, "read");

      const analytics = await storage.getGuideAnalytics(guideId);
      res.json({ ...guide, analytics });
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to fetch guide");
    }
  });

  // Authenticated recipient-experience preview for owners and brand collaborators.
  // Drafts are intentionally allowed here, and previewing never records a public view.
  app.get('/api/guides/:id/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = positiveRouteIdSchema.parse(req.params.id);
      const guide = await storage.getGuide(guideId);

      if (!guide || guide.magnetType !== "guide") {
        return res.status(404).json({ message: "Guide not found" });
      }
      await assertGuideAccess(userId, guide, "read");

      const branding = await resolvePublicAppearanceForGuide(guide);
      const library = await resolvePublicLibraryContextForGuide(guide.id);
      res.json({
        guide: {
          id: guide.id,
          title: guide.title,
          description: guide.description,
          thumbnailUrl: guide.thumbnailUrl,
          youtubeUrl: guide.youtubeUrl,
          youtubeVideoId: guide.youtubeVideoId,
          channelTitle: guide.channelTitle,
          views: guide.views,
          screenshots: guide.screenshots,
          navigationLinks: guide.navigationLinks,
          ctaLink: guide.ctaLink,
          ctaText: guide.ctaText,
          content: guide.content,
          category: guide.category,
          presentationProfile: normalizePresentationProfile(guide.presentationProfile),
          sourceVideo: youtubeSourceFromStoredFields(
            guide.youtubeUrl,
            guide.youtubeVideoId,
            guide.channelTitle,
          ),
        },
        branding,
        brandingSettings: branding,
        library,
      });
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to preview guide");
    }
  });

  // Get landing page URL for guide editing
  app.get('/api/guides/:id/landing-page-url', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = parseInt(req.params.id);
      const guide = await storage.getGuide(guideId);
      
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }
      await assertGuideAccess(userId, guide, "read");

      // Get the landing page for this guide
      const landingPage = await storage.getLandingPageByGuideId(guideId);
      
      if (!landingPage) {
        return res.status(404).json({ message: "Landing page not found" });
      }

      res.json({ customUrl: landingPage.customUrl });
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to fetch landing page URL");
    }
  });

  // Track guide view (public endpoint)
  app.post('/api/guides/:id/view', publicGuideViewRateLimit, async (req, res) => {
    try {
      const guideIdResult = publicGuideIdSchema.safeParse(req.params.id);
      if (!guideIdResult.success) {
        return res.status(404).json({ message: "Guide not found" });
      }
      const guideId = guideIdResult.data;
      const guide = await storage.getGuide(guideId);
      
      if (!isDirectlyAccessibleGuide(guide)) {
        return res.status(404).json({ message: "Guide not found" });
      }

      const view = await recordPublicGuideView({
        guideId,
        userId: guide.userId,
        metadata: {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get("user-agent"),
          referrer: req.get("referer"),
        },
      });

      res.json({ success: true, views: view.views, recorded: view.recorded });
    } catch (error) {
      console.error("Error tracking guide view:", error);
      res.status(500).json({ message: "Failed to track view" });
    }
  });

  // Update guide status and refresh searchable Library metadata on publish.
  app.patch('/api/guides/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = parseInt(req.params.id);
      const { status } = req.body;

      if (!["draft", "published", "unlisted", "archived"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const guide = await storage.getGuide(guideId);
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }

      await assertGuideAccess(userId, guide, "write_content");
      if (guide.magnetType === "quiz") {
        return res.status(409).json({
          message: "Publish Interactive Quizzes from the quiz editor so scoring and result assets can be validated.",
        });
      }

      let updateData: any = { status };
      const makesGuidePublic = status === "published" || status === "unlisted";

      if (makesGuidePublic) {
        const validation = validateStoredGuideForPublish({
          content: guide.content,
          title: guide.title,
          description: guide.description,
          category: guide.category,
          transcript: guide.transcript,
          aiAnalysis: guide.aiAnalysis,
        });

        if (!validation.publishable) {
          return res.status(422).json({
            code: "guide_publish_validation_failed",
            message: "This Guide is still a draft because it does not meet the publish-quality bar.",
            issues: validation.audit.issues.map(({ code, message, evidence }) => ({
              code,
              message,
              evidence,
            })),
          });
        }

        // Persist the strict normalized V2 shape that passed the deterministic
        // gate so public renderers never receive a stale legacy projection.
        updateData.content = validation.content;
      }

      // Published magnets receive searchable metadata whether or not the
      // creator keeps Library inclusion enabled.
      if (status === "published" && guide.status !== "published") {
        try {
          const { generateSmartTags } = await import('./services/smartTagging');
          const smartTags = await generateSmartTags(
            guide.title,
            guide.description || "",
            guide.content,
            guide.transcript || ""
          );

          // Update tags with smart-generated ones
          updateData.category = smartTags.category;
          updateData.tags = [
            ...smartTags.tags,
            smartTags.skillLevel,
            ...(smartTags.bodyParts || []),
            ...(smartTags.techniques || []),
            ...(smartTags.equipment || [])
          ].filter((tag, index, self) => self.indexOf(tag) === index); // Remove duplicates

          console.log(`Auto-tagged guide "${guide.title}" for search:`, {
            category: smartTags.category,
            tags: updateData.tags
          });
        } catch (error) {
          console.error("Error generating smart tags:", error);
          // Continue with status update even if tagging fails
        }
      }

      if (status === "published" && guide.includeInLibrary === true && guide.brandId !== null) {
        await ensureBrandLibraryForWriter(userId, guide.brandId);
      }

      const updatedGuide = await storage.updateGuideIfUnchanged(
        guideId,
        guide.revision,
        updateData,
      );
      if (!updatedGuide) {
        return res.status(409).json({
          code: "guide_changed_during_publish",
          message: "This Guide changed while it was being published. Review the latest Draft and try again.",
        });
      }
      
      let message = "Guide status updated";
      if (status === "published") {
        message = "Guide published";
      } else if (status === "unlisted") {
        message = "Guide unlisted - accessible only via direct link";
      } else if (status === "draft") {
        message = "Guide moved to draft";
      }

      res.json({ 
        guide: updatedGuide, 
        message,
        smartTagsApplied: status === "published" && guide.status !== "published"
      });
    } catch (error) {
      console.error("Error updating guide status:", error);
      res.status(500).json({ message: "Failed to update guide status" });
    }
  });

  // Transfer guide between Personal and Brand accounts
  app.patch('/api/guides/:id/transfer', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = parseInt(req.params.id);
      const { targetBrandId } = req.body;

      // Validate input
      if (targetBrandId !== null && (typeof targetBrandId !== 'number' || targetBrandId <= 0)) {
        return res.status(400).json({ message: "Invalid target brand ID" });
      }

      // Get the guide and verify ownership
      const guide = await storage.getGuide(guideId);
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }

      await assertGuideAccess(userId, guide, "manage_brand");
      const resolvedTargetBrandId = await resolveBrandIdForUser(
        userId,
        targetBrandId,
        "manage_brand",
      );
      if (resolvedTargetBrandId === null && guide.userId !== userId) {
        return res.status(403).json({ message: "Only the guide owner can move it to a personal account" });
      }

      const updatedGuide = await db.transaction(async (tx) => {
        const nextStatus = "draft";
        const [updated] = await tx.update(guides).set({
          brandId: resolvedTargetBrandId,
          status: "draft",
          revision: sql`${guides.revision} + 1`,
          updatedAt: new Date(),
        }).where(and(
          eq(guides.id, guideId),
          eq(guides.revision, guide.revision),
        )).returning();
        if (!updated) {
          throw new BrandAccessError(409, "The Guide changed during transfer. Reload it and try again.");
        }
        if (guide.magnetType === "quiz") {
          const [quiz] = await tx
            .select({ outcomes: quizzes.outcomes })
            .from(quizzes)
            .where(eq(quizzes.guideId, guideId));
          const outcomes = (quiz?.outcomes || []).map((outcome) => ({
            ...outcome,
            giftAssetId: null,
            ctaAssetId: null,
          }));
          await tx.update(quizzes).set({
            brandId: resolvedTargetBrandId,
            outcomes,
            updatedAt: new Date(),
          }).where(eq(quizzes.guideId, guideId));
        }
        return { ...updated, status: nextStatus };
      });

      let message;
      if (resolvedTargetBrandId === null) {
        message = "Guide transferred to Personal account";
      } else {
        const brand = await storage.getBrand(resolvedTargetBrandId);
        message = `Guide transferred to ${brand?.name || 'Brand'} account`;
      }

      res.json({ 
        guide: updatedGuide, 
        message
      });
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to transfer guide");
    }
  });

  // Admin-only guide transfer between any brand accounts  
  app.patch('/api/admin/guides/:id/transfer', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const guideId = parseInt(req.params.id);
      const { targetBrandId, targetUserId } = req.body;

      // Validate input
      if (targetBrandId !== null && (typeof targetBrandId !== 'number' || targetBrandId <= 0)) {
        return res.status(400).json({ message: "Invalid target brand ID" });
      }

      if (!targetUserId) {
        return res.status(400).json({ message: "Target user ID is required" });
      }
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(400).json({ message: "Target user does not exist" });
      }

      // Get the guide
      const guide = await storage.getGuide(guideId);
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }

      // If transferring to a brand, verify the target brand exists and belongs to target user
      if (targetBrandId !== null) {
        const targetBrand = await storage.getBrand(targetBrandId);
        if (!targetBrand || targetBrand.userId !== targetUserId) {
          return res.status(400).json({ message: "Target brand doesn't exist or doesn't belong to target user" });
        }
      }

      const updatedGuide = await db.transaction(async (tx) => {
        const [updated] = await tx.update(guides).set({
          userId: targetUserId,
          brandId: targetBrandId,
          status: "draft",
          revision: sql`${guides.revision} + 1`,
          updatedAt: new Date(),
        }).where(and(
          eq(guides.id, guideId),
          eq(guides.revision, guide.revision),
        )).returning();
        if (!updated) {
          throw new BrandAccessError(409, "The Guide changed during transfer. Reload it and try again.");
        }

        await tx.update(landingPages).set({
          userId: targetUserId,
          updatedAt: new Date(),
        }).where(eq(landingPages.guideId, guideId));

        if (guide.magnetType === "quiz") {
          const [quiz] = await tx
            .select({ outcomes: quizzes.outcomes })
            .from(quizzes)
            .where(eq(quizzes.guideId, guideId));
          const outcomes = (quiz?.outcomes || []).map((outcome) => ({
            ...outcome,
            giftAssetId: null,
            ctaAssetId: null,
          }));
          await tx.update(quizzes).set({
            userId: targetUserId,
            brandId: targetBrandId,
            outcomes,
            updatedAt: new Date(),
          }).where(eq(quizzes.guideId, guideId));
        }

        return updated;
      });

      let message;
      if (targetBrandId === null) {
        message = `Guide transferred to user ${targetUserId}'s Personal account`;
      } else {
        const brand = await storage.getBrand(targetBrandId);
        message = `Guide transferred to ${brand?.name || 'Brand'} account (User: ${targetUserId})`;
      }

      res.json({ 
        guide: updatedGuide, 
        message
      });
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to transfer guide");
    }
  });

  app.get('/api/guides/:id/landing-page', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = parseInt(req.params.id);
      const guide = await storage.getGuide(guideId);
      
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }
      await assertGuideAccess(userId, guide, "read");

      const landingPage = await storage.getLandingPageByGuideId(guideId);
      
      if (!landingPage) {
        return res.status(404).json({ message: "Landing page not found" });
      }

      res.json({ customUrl: landingPage.customUrl });
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to fetch landing page");
    }
  });

  app.put('/api/guides/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = parseInt(req.params.id);
      const guide = await storage.getGuide(guideId);
      
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }
      await assertGuideAccess(userId, guide, "write_content");

      const parsedUpdate = insertGuideSchema.partial().parse(req.body);
      if (parsedUpdate.status !== undefined) {
        return res.status(400).json({
          code: "guide_status_transition_required",
          message: "Change Guide visibility through the dedicated status action.",
        });
      }
      if (guide.magnetType === "quiz") {
        return res.status(409).json({
          message: "Edit Interactive Quizzes from the quiz editor so scoring and result assets can be validated.",
        });
      }
      const {
        userId: _userId,
        brandId: _brandId,
        magnetType: _magnetType,
        includeInLibrary: _includeInLibrary,
        status: _status,
        ...updateData
      } = parsedUpdate;
      // A generic content edit to a publicly reachable Guide always becomes a
      // Draft atomically. Only the dedicated status route can make it public
      // again after the stored quality gate passes.
      const safeUpdateData = { ...updateData, status: "draft" };
      const updatedGuide = await storage.updateGuideIfUnchanged(
        guideId,
        guide.revision,
        safeUpdateData,
      );
      if (!updatedGuide) {
        return res.status(409).json({
          code: "guide_changed_during_edit",
          message: "This Guide changed in another session. Reload the latest Draft before saving again.",
        });
      }
      res.json(updatedGuide);
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to update guide");
    }
  });

  app.delete('/api/guides/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = positiveRouteIdSchema.parse(req.params.id);
      const guide = await storage.getGuide(guideId);
      if (!guide) return res.status(404).json({ message: "Guide not found" });
      await assertGuideAccess(userId, guide, "write_content");
      if (guide.magnetType === "quiz") {
        return res.status(409).json({
          message: "Delete Interactive Quizzes from the quiz editor.",
        });
      }

      const deleted = await storage.deleteGuide(guideId, guide.revision);
      if (!deleted) {
        return res.status(409).json({
          code: "guide_changed_during_delete",
          message: "This Guide changed before it could be deleted. Reload it and try again.",
        });
      }
      return res.status(204).end();
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to delete Guide");
    }
  });

  app.patch('/api/guides/:id/library', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = positiveRouteIdSchema.parse(req.params.id);
      const input = libraryInclusionUpdateSchema.parse(req.body);
      const guide = await storage.getGuide(guideId);
      if (!guide) return res.status(404).json({ message: "Guide not found" });
      await assertGuideAccess(userId, guide, "write_content");

      const updated = await storage.updateGuideIfUnchanged(guideId, guide.revision, {
        includeInLibrary: input.includeInLibrary,
      });
      if (!updated) {
        return res.status(409).json({
          code: "guide_changed_during_library_update",
          message: "This Guide changed before its Library setting could be saved. Reload it and try again.",
        });
      }
      if (input.includeInLibrary && updated.brandId !== null) {
        await ensureBrandLibraryForWriter(userId, updated.brandId);
      }
      const library = await resolvePublicLibraryContextForGuide(guideId);
      res.json({
        guide: {
          id: updated.id,
          includeInLibrary: updated.includeInLibrary === true,
        },
        library,
      });
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to update Magnet Library inclusion");
    }
  });

  // PDF download route
  app.get('/api/guides/:id/download-pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = parseInt(req.params.id);
      
      const guide = await storage.getGuide(guideId);
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }
      await assertGuideAccess(userId, guide, "read");

      const branding = await resolvePublicAppearanceForGuide(guide);
      
      // Lightweight deployments return a print-ready HTML workbook that can be
      // opened in any browser and saved as PDF without a headless-browser runtime.
      const pdfBuffer = await generateGuidePDF({
        guide,
        branding: branding || undefined,
        channelTitle: guide.channelTitle || undefined
      });

      // The non-browser generator produces print-ready HTML. Label it truthfully
      // instead of returning HTML bytes with a PDF MIME type.
      const filename = generatePDFFilename(guide);
      const isPrintHtml = filename.toLowerCase().endsWith('.html');
      res.setHeader('Content-Type', isPrintHtml ? 'text/html; charset=utf-8' : 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Track download analytics
      await storage.createAnalyticsEvent({
        userId,
        guideId,
        eventType: 'download',
        eventData: { format: isPrintHtml ? 'print_html' : 'pdf' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer')
      });

      res.send(pdfBuffer);
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to generate PDF");
    }
  });

  // Public library route for displaying all public guides
  app.get('/api/library/public-guides', async (req, res) => {
    try {
      const publicGuides = await storage.getPublicGuides();
      res.json(publicGuides);
    } catch (error) {
      console.error("Error fetching public guides:", error);
      res.status(500).json({ message: "Failed to fetch public guides" });
    }
  });

  // Alternative route for public guides (used by Practice Library)
  app.get('/api/guides/public', async (req, res) => {
    try {
      const publicGuides = await storage.getPublicGuides();
      res.json(publicGuides);
    } catch (error) {
      console.error("Error fetching public guides:", error);
      res.status(500).json({ message: "Failed to fetch public guides" });
    }
  });

  app.get('/api/public/libraries/:slug', async (req, res) => {
    try {
      const slugResult = librarySlugSchema.safeParse(req.params.slug);
      if (!slugResult.success) {
        return res.status(404).json({ message: "Magnet Library not found" });
      }
      const query = publicLibraryQuerySchema.parse(req.query);
      const library = await getPublicMagnetLibrary(slugResult.data, query);
      if (!library) {
        return res.status(404).json({ message: "Magnet Library not found" });
      }
      res.json(library);
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to fetch Magnet Library");
    }
  });

  // Landing page routes
  app.get('/api/landing/:customUrl', publicLandingReadRateLimit, async (req, res) => {
    try {
      const customUrlResult = publicLandingSlugSchema.safeParse(req.params.customUrl);
      if (!customUrlResult.success) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      const customUrl = customUrlResult.data;
      const landingPage = await storage.getLandingPageByUrl(customUrl);
      
      if (!landingPage || !landingPage.isActive) {
        return res.status(404).json({ message: "Landing page not found" });
      }

      const guide = await storage.getGuide(landingPage.guideId);
      if (!isDirectlyAccessibleGuide(guide)) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      const branding = await resolvePublicAppearanceForGuide(guide);
      const library = await resolvePublicLibraryContextForGuide(guide.id);

      await recordPublicLandingView({
        userId: landingPage.userId,
        guideId: landingPage.guideId,
        landingPageId: landingPage.id,
        metadata: {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get("user-agent"),
          referrer: req.get("referer"),
        },
      });

      res.json({
        landingPage: {
          id: landingPage.id,
          title: landingPage.title,
          headline: landingPage.headline,
          subheadline: landingPage.subheadline,
          description: landingPage.description,
          bulletPoints: landingPage.bulletPoints,
          buttonText: landingPage.buttonText,
          disclaimer: landingPage.disclaimer,
          customFields: landingPage.customFields,
          collectSms: landingPage.collectSms,
          smsConsentText: landingPage.smsConsentText,
        },
        guide: {
          id: guide.id,
          title: guide.title,
          description: guide.description,
          thumbnailUrl: guide.thumbnailUrl,
          category: guide.category,
          presentationProfile: normalizePresentationProfile(guide.presentationProfile),
          sourceVideo: youtubeSourceFromStoredFields(
            guide.youtubeUrl,
            guide.youtubeVideoId,
            guide.channelTitle,
          ),
          tags: guide.tags,
          youtubeVideoId: guide.youtubeVideoId,
          channelTitle: guide.channelTitle,
          ctaLink: guide.ctaLink,
          ctaText: guide.ctaText,
        },
        branding,
        brandingSettings: branding,
        library,
      });
    } catch (error) {
      console.error("Error fetching landing page:", error);
      res.status(500).json({ message: "Failed to fetch landing page" });
    }
  });

  // Update landing page (for editor)
  app.put('/api/landing/:customUrl', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const { customUrl } = req.params;
      const landingPage = await storage.getLandingPageByUrl(customUrl);
      
      if (!landingPage) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      const guide = await storage.getGuide(landingPage.guideId);
      if (!guide) return res.status(404).json({ message: "Landing page not found" });
      await assertGuideAccess(userId, guide, "write_content");

      const parsedUpdate = insertLandingPageSchema.partial().parse(req.body);
      const {
        userId: _landingUserId,
        guideId: _guideId,
        customUrl: _customUrl,
        ...updateData
      } = parsedUpdate;
      const updatedLandingPage = await storage.updateLandingPage(landingPage.id, updateData);

      res.json(updatedLandingPage);
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to update landing page");
    }
  });

  app.post('/api/landing/:customUrl/submit', publicLandingSubmitRateLimit, async (req, res) => {
    try {
      const customUrlResult = publicLandingSlugSchema.safeParse(req.params.customUrl);
      if (!customUrlResult.success) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      const submissionResult = publicLeadSubmissionSchema.safeParse(req.body);
      if (!submissionResult.success) {
        return res.status(400).json({
          message: "Invalid lead submission",
          issues: submissionResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }
      const customUrl = customUrlResult.data;
      const landingPage = await storage.getLandingPageByUrl(customUrl);
      
      if (!landingPage || !landingPage.isActive) {
        return res.status(404).json({ message: "Landing page not found" });
      }

      const guide = await storage.getGuide(landingPage.guideId);
      if (!isDirectlyAccessibleGuide(guide)) {
        return res.status(404).json({ message: "Landing page not found" });
      }

      const submission = submissionResult.data;
      const fieldIssues = landingSubmissionIssues(landingPage.customFields, submission);
      if (fieldIssues.length > 0) {
        return res.status(400).json({
          message: "Invalid lead submission",
          issues: fieldIssues.map((message) => ({ path: "customFieldData", message })),
        });
      }
      const { firstName, email, phone, smsConsent, customFieldData } = submission;

      // Create lead
      const lead = await storage.createLead({
        landingPageId: landingPage.id,
        guideId: landingPage.guideId,
        userId: landingPage.userId,
        email,
        firstName,
        phone,
        smsConsent: Boolean(phone && smsConsent),
        tags: guide.leadTags || [], // Apply lead tags from guide
        customFieldData,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer')
      });

      // Track conversion
      await storage.createAnalyticsEvent({
        userId: landingPage.userId,
        guideId: landingPage.guideId,
        landingPageId: landingPage.id,
        eventType: 'conversion',
        eventData: { leadId: lead.id },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer')
      });

      // Update guide conversion rate
      const updatedAnalytics = await storage.getGuideAnalytics(landingPage.guideId);
      await storage.updateGuideConversionRate(landingPage.guideId, updatedAnalytics.conversionRate);

      // Create notification for new lead
      await storage.createNotification({
        userId: landingPage.userId,
        title: "New lead captured",
        message: `Someone downloaded your "${guide.title}" guide`,
        type: "lead",
        entityType: "guide",
        entityId: landingPage.guideId,
        data: { leadId: lead.id, guideTitle: guide.title }
      });

      const deliveryAccessToken = createDeliveryAccessToken({
        customUrl,
        guideId: guide.id,
        leadId: lead.id,
      });
      const deliveryPath = `/delivery/${customUrl}/${lead.id}?access=${encodeURIComponent(deliveryAccessToken)}`;

      // Send guide delivery email
      try {
        const emailService = new EmailService();
        const guideDeliveryUrl = `${req.protocol}://${req.get('host')}${deliveryPath}`;
        const landingPageUrl = `${req.protocol}://${req.get('host')}/landing/${customUrl}`;
        
        await emailService.sendGuideDeliveryEmail(
          { email, firstName: firstName || 'Friend' },
          guide.title || 'Your Practice Guide',
          guideDeliveryUrl,
          landingPageUrl
        );
      } catch (emailError) {
        const emailMessage = emailError instanceof Error ? emailError.message : String(emailError);
        console.warn("📧 Email delivery failed (lead capture still successful):", emailMessage);
        if (emailMessage.includes("not authorized to send mail")) {
          console.warn("🔧 Fix needed: Verify your sender email (adamlinkenauger@gmail.com) in SendGrid Settings → Sender Authentication");
        }
        // Don't fail the lead creation if email fails
      }

      res.json({
        success: true,
        deliveryUrl: deliveryPath,
        message: "Lead captured successfully"
      });

    } catch (error) {
      console.error("Error submitting lead:", error);
      res.status(500).json({ message: "Failed to submit lead" });
    }
  });

  // Delivery page routes
  app.get('/api/delivery/:customUrl/:leadId', publicDeliveryReadRateLimit, async (req, res) => {
    try {
      const customUrlResult = publicLandingSlugSchema.safeParse(req.params.customUrl);
      const leadIdResult = positiveRouteIdSchema.safeParse(req.params.leadId);
      if (!customUrlResult.success || !leadIdResult.success) {
        return res.status(404).json({ message: "Page not found" });
      }
      const customUrl = customUrlResult.data;
      const leadId = leadIdResult.data;
      const landingPage = await storage.getLandingPageByUrl(customUrl);
      
      if (!landingPage || !landingPage.isActive) {
        return res.status(404).json({ message: "Page not found" });
      }

      const guide = await storage.getGuide(landingPage.guideId);
      if (!isDirectlyAccessibleGuide(guide)) {
        return res.status(404).json({ message: "Page not found" });
      }

      const hasDeliveryAccess = verifyDeliveryAccessToken(req.query.access, {
        customUrl,
        guideId: guide.id,
        leadId,
      });
      if (!hasDeliveryAccess) {
        return res.status(404).json({ message: "Page not found" });
      }

      const lead = await storage.getLead(leadId);
      if (
        !lead ||
        lead.guideId !== guide.id ||
        lead.landingPageId !== landingPage.id
      ) {
        return res.status(404).json({ message: "Page not found" });
      }

      const branding = await resolvePublicAppearanceForGuide(guide);
      const library = await resolvePublicLibraryContextForGuide(guide.id);

      // Track delivery page view
      await storage.createAnalyticsEvent({
        userId: landingPage.userId,
        guideId: landingPage.guideId,
        landingPageId: landingPage.id,
        eventType: 'view',
        eventData: { page: 'delivery', leadId: lead.id },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer')
      });

      res.json({
        guide: {
          id: guide.id,
          title: guide.title,
          description: guide.description,
          thumbnailUrl: guide.thumbnailUrl,
          youtubeUrl: guide.youtubeUrl,
          youtubeVideoId: guide.youtubeVideoId,
          channelTitle: guide.channelTitle,
          navigationLinks: guide.navigationLinks,
          ctaLink: guide.ctaLink,
          ctaText: guide.ctaText,
          content: guide.content,
          category: guide.category,
          presentationProfile: normalizePresentationProfile(guide.presentationProfile),
          sourceVideo: youtubeSourceFromStoredFields(
            guide.youtubeUrl,
            guide.youtubeVideoId,
            guide.channelTitle,
          ),
        },
        branding,
        brandingSettings: branding,
        library,
        lead: {
          firstName: lead.firstName,
        },
      });

    } catch (error) {
      console.error("Error fetching delivery page:", error);
      res.status(500).json({ message: "Failed to fetch delivery page" });
    }
  });

  // Public guide view route (no authentication required)
  app.get('/api/guide/:id/public', async (req, res) => {
    try {
      const guideId = parseInt(req.params.id);
      const guide = await storage.getGuide(guideId);
      
      if (!isDirectlyAccessibleGuide(guide)) {
        return res.status(404).json({ message: "Guide not found" });
      }

      const branding = await resolvePublicAppearanceForGuide(guide);
      const library = await resolvePublicLibraryContextForGuide(guide.id);

      res.json({
        guide: {
          id: guide.id,
          title: guide.title,
          description: guide.description,
          thumbnailUrl: guide.thumbnailUrl,
          youtubeUrl: guide.youtubeUrl,
          youtubeVideoId: guide.youtubeVideoId,
          channelTitle: guide.channelTitle,
          views: guide.views,
          screenshots: guide.screenshots,
          navigationLinks: guide.navigationLinks,
          ctaLink: guide.ctaLink,
          ctaText: guide.ctaText,
          content: guide.content,
          category: guide.category,
          presentationProfile: normalizePresentationProfile(guide.presentationProfile),
          sourceVideo: youtubeSourceFromStoredFields(
            guide.youtubeUrl,
            guide.youtubeVideoId,
            guide.channelTitle,
          ),
        },
        branding,
        brandingSettings: branding,
        library,
      });
    } catch (error) {
      console.error("Error fetching public guide:", error);
      res.status(500).json({ message: "Failed to fetch guide" });
    }
  });

  // Regenerate guide content from transcript
  app.post('/api/guides/:id/regenerate', isAuthenticated, guideGenerationRateLimit, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const guideId = positiveRouteIdSchema.parse(req.params.id);
      const request = guideRegenerationRequestSchema.parse(req.body || {});
      
      const guide = await storage.getGuide(guideId);
      if (!guide || guide.magnetType !== "guide") {
        return res.status(404).json({ message: "Guide not found" });
      }
      await assertGuideAccess(userId, guide, "write_content");

      if (!guide.transcript) {
        return res.status(400).json({ message: "No transcript available for regeneration" });
      }

      const brandingSettings = await resolveAppearanceForScope(userId, guide.brandId);
      const regeneration = buildGuideRegenerationContext({
        guide: {
          id: guide.id,
          title: guide.title,
          description: guide.description,
          transcript: guide.transcript,
          youtubeUrl: guide.youtubeUrl,
          youtubeVideoId: guide.youtubeVideoId,
          channelTitle: guide.channelTitle,
          category: guide.category,
          tags: guide.tags,
          content: guide.content,
          presentationProfile: guide.presentationProfile,
        },
        targetAudience: brandingSettings.targetAudience,
        customInstructions: request.instructions,
      });
      const libraryKnowledge = await prepareBrandLibraryKnowledge({
        userId,
        brandId: guide.brandId,
        currentMagnet: { type: "guide", id: guide.id },
        query: regeneration.libraryQuery,
      });

      // Re-analyze the complete stored source before composing the replacement.
      const analysis = await analyzeVideoContent(
        regeneration.sourceContent,
        guide.title,
        guide.description || "",
        regeneration.creationBrief,
        undefined,
        libraryKnowledge,
      );

      let newContent;
      let timedTranscript: Awaited<ReturnType<typeof transcribeVideo>> | null = null;
      if (regeneration.sourceVideo) {
        try {
          const refreshedTranscript = await transcribeVideo(regeneration.sourceVideo.videoId);
          if (
            typeof refreshedTranscript === "object" &&
            refreshedTranscript.segments.length > 0
          ) {
            timedTranscript = refreshedTranscript;
          }
        } catch (error) {
          console.warn("Timestamp refresh unavailable during Guide regeneration; using stored source text", error);
        }
      }

      if (timedTranscript && typeof timedTranscript === "object") {
        const { generateTimestampedContent } = await import("./services/aiContentWithTimestamps");
        const trainingSettings = await storage.getTrainingSettings(userId);
        newContent = await generateTimestampedContent(
          regeneration.sourceContent,
          timedTranscript.segments,
          {
            videoId: regeneration.sourceVideo?.videoId,
            title: guide.title,
            description: guide.description || "",
            thumbnailUrl: guide.thumbnailUrl || "",
            duration: "Unknown",
            channelTitle: guide.channelTitle || "",
            category: guide.category || "",
            viewCount: guide.views || 0,
          },
          trainingSettings,
          undefined,
          regeneration.creationBrief,
          brandingSettings,
          libraryKnowledge,
          analysis,
        );
      } else {
        newContent = await generatePracticeGuide(
          analysis,
          guide.title,
          guide.channelTitle || "",
          brandingSettings,
          undefined,
          regeneration.creationBrief,
          regeneration.sourceContent,
          libraryKnowledge,
        );
      }

      // Update the guide with real content
      const updatedGuide = await storage.updateGuideIfUnchanged(guideId, guide.revision, {
        aiAnalysis: analysis,
        content: newContent,
        presentationProfile: regeneration.presentationProfile,
        status: "draft",
      });
      if (!updatedGuide) {
        return res.status(409).json({
          code: "guide_changed_during_regeneration",
          message: "This Guide changed while the improved Draft was being generated. Reload it before trying again.",
        });
      }

      res.json({ 
        message: "Your improved draft is ready to review",
        needsRepublish: true,
        guide: updatedGuide,
      });
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to regenerate guide");
    }
  });

  // QR Code generation
  app.post('/api/qr-codes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { guideId, targetUrl } = req.body;

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(targetUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Save QR code record
      const qrCode = await storage.createQrCode({
        guideId,
        userId,
        qrCodeUrl: qrCodeDataUrl,
        targetUrl
      });

      res.json(qrCode);
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Current-scope compatibility endpoint. The envelope is canonical; top-level
  // appearance aliases keep older authenticated settings consumers working.
  const brandingResponse = async (userId: string) => {
    const envelope = await resolveBrandingEnvelope(userId);
    return { ...envelope.appearance, ...envelope };
  };

  app.get('/api/branding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      res.json(await brandingResponse(userId));
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to fetch branding settings");
    }
  });

  const saveCurrentBranding = async (req: any, res: Response) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const scope = await resolveCurrentBrandScope(userId, "read");
      if (!scope.canEditBranding) {
        throw new BrandAccessError(403, "Only brand owners and admins can edit branding");
      }
      const { appearance: update, expectedScope } = brandingUpdateFromBody(req.body);
      if (expectedScope && !brandScopeMatches(expectedScope, scope)) {
        throw new BrandAccessError(
          409,
          "The active brand changed while you were editing. Reload branding before saving.",
        );
      }
      const current = await resolveAppearanceForScope(scope.ownerUserId, scope.brandId);
      const appearance = mergeBrandAppearance(current, update, scope.workspaceName);
      await storage.upsertBrandingSettings(
        toBrandingPersistence(appearance, scope.ownerUserId, scope.brandId),
      );
      res.json(await brandingResponse(userId));
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to update branding settings");
    }
  };

  app.put('/api/branding', isAuthenticated, saveCurrentBranding);
  app.post('/api/branding', isAuthenticated, saveCurrentBranding);

  type BrandAssetConfig = {
    prefix: string;
    responseField: "logoUrl" | "logoMarkUrl" | "faviconUrl" | "socialImageUrl";
    width: number;
    height: number;
    fit: "contain" | "cover";
  };

  const uploadCurrentBrandAsset = async (req: any, res: Response, config: BrandAssetConfig) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const scope = await resolveCurrentBrandScope(userId, "read");
      if (!scope.canEditBranding) {
        throw new BrandAccessError(403, "Only brand owners and admins can edit branding");
      }
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      if (!hasAllowedBrandImageSignature(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({ message: "The uploaded file does not match its image type" });
      }

      const sourceExtension = req.file.mimetype === "image/jpeg"
        ? "jpg"
        : req.file.mimetype === "image/webp" ? "webp" : "png";
      const extension = serviceConfig.useLightweightImage ? sourceExtension : "png";
      // Public asset names must not disclose internal user or brand identifiers.
      const fileName = `${config.prefix}-${Date.now()}-${randomUUID().slice(0, 12)}.${extension}`;
      const resizeOptions = {
        width: config.width,
        height: config.height,
        fit: config.fit,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      } as const;
      const processedBuffer = serviceConfig.useLightweightImage
        ? await processImage(req.file.buffer, resizeOptions)
        : await sharp(req.file.buffer).resize(config.width, config.height, {
            fit: config.fit,
            background: resizeOptions.background,
          }).png().toBuffer();
      const processedContentType = serviceConfig.useLightweightImage
        ? req.file.mimetype
        : "image/png";

      const assetUrl = await brandAssetStore.put({
        key: fileName,
        ownerUserId: scope.ownerUserId,
        brandId: scope.brandId,
        contentType: processedContentType,
        content: processedBuffer,
      });
      res.json({ [config.responseField]: assetUrl });
    } catch (error) {
      if (error instanceof BrandAssetQuotaError) {
        return res.status(409).json({
          code: "brand_asset_quota_reached",
          message: "This workspace has reached its brand image storage limit. Reuse an existing image or contact support.",
        });
      }
      sendBrandRouteError(res, error, `Failed to upload ${config.prefix}`);
    }
  };

  app.post('/api/branding/logo', isAuthenticated, brandAssetUploadRateLimit, logoUpload.single('logo'), (req, res) =>
    uploadCurrentBrandAsset(req, res, {
      prefix: "wordmark", responseField: "logoUrl", width: 800, height: 300, fit: "contain",
    }));
  app.post('/api/branding/logo-mark', isAuthenticated, brandAssetUploadRateLimit, logoUpload.single('logoMark'), (req, res) =>
    uploadCurrentBrandAsset(req, res, {
      prefix: "mark", responseField: "logoMarkUrl", width: 512, height: 512, fit: "contain",
    }));
  app.post('/api/branding/favicon', isAuthenticated, brandAssetUploadRateLimit, logoUpload.single('favicon'), (req, res) =>
    uploadCurrentBrandAsset(req, res, {
      prefix: "favicon", responseField: "faviconUrl", width: 64, height: 64, fit: "cover",
    }));
  app.post('/api/branding/social-image', isAuthenticated, brandAssetUploadRateLimit, logoUpload.single('socialImage'), (req, res) =>
    uploadCurrentBrandAsset(req, res, {
      prefix: "social", responseField: "socialImageUrl", width: 1200, height: 630, fit: "contain",
    }));

  // Notifications routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const unreadOnly = req.query.unread === 'true';
      const notifications = await storage.getNotifications(userId, unreadOnly);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId, req.user.claims.sub);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user.claims.sub);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // Analytics routes
  app.get('/api/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const scope = await resolveCurrentBrandScope(userId, "read");
      const analytics = await storage.getAnalyticsByUser(userId, scope.brandId);
      res.json(analytics);
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to fetch analytics");
    }
  });

  // Leads routes
  app.get('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const scope = await resolveCurrentBrandScope(userId, "read");
      const leads = await storage.getLeadsByUserAndBrand(userId, scope.brandId);
      res.json(leads);
    } catch (error) {
      sendBrandRouteError(res, error, "Failed to fetch leads");
    }
  });

  // Training settings routes
  app.get('/api/training-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getTrainingSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching training settings:", error);
      res.status(500).json({ message: "Failed to fetch training settings" });
    }
  });

  app.post('/api/training-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settingsData = insertTrainingSettingsSchema.parse({
        ...req.body,
        userId
      });
      
      const settings = await storage.upsertTrainingSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating training settings:", error);
      res.status(500).json({ message: "Failed to update training settings" });
    }
  });

  // Knowledgebase routes
  app.get('/api/knowledgebase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { query } = req.query;
      
      let entries;
      if (query) {
        entries = await storage.searchKnowledgebaseEntries(userId, query as string);
      } else {
        entries = await storage.getKnowledgebaseEntries(userId);
      }
      
      res.json(entries);
    } catch (error) {
      console.error("Error fetching knowledgebase entries:", error);
      res.status(500).json({ message: "Failed to fetch knowledgebase entries" });
    }
  });

  app.post('/api/knowledgebase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entryData = insertKnowledgebaseEntrySchema.parse({
        ...req.body,
        userId
      });
      
      const entry = await storage.createKnowledgebaseEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating knowledgebase entry:", error);
      res.status(500).json({ message: "Failed to create knowledgebase entry" });
    }
  });

  app.put('/api/knowledgebase/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const entryData = req.body;
      
      const entry = await storage.updateKnowledgebaseEntry(parseInt(id), entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error updating knowledgebase entry:", error);
      res.status(500).json({ message: "Failed to update knowledgebase entry" });
    }
  });

  app.delete('/api/knowledgebase/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteKnowledgebaseEntry(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting knowledgebase entry:", error);
      res.status(500).json({ message: "Failed to delete knowledgebase entry" });
    }
  });

  // File transcription route for knowledgebase
  app.post('/api/transcribe', isAuthenticated, async (req: any, res) => {
    try {
      // For now, return a placeholder response
      // In a real implementation, you would use a service like OpenAI Whisper
      res.json({ text: "Transcription feature coming soon. Please enter text manually for now." });
    } catch (error) {
      console.error("Error transcribing file:", error);
      res.status(500).json({ message: "Failed to transcribe file" });
    }
  });

  // Initialize default subscription plans (run once)
  app.post('/api/subscription/init-plans', isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const plans = [
        {
          name: 'free',
          displayName: 'Free',
          price: '0.00',
          currency: 'USD',
          billingCycle: 'monthly',
          maxLeads: 50,
          maxVisits: 500,
          maxBrands: 0, // Personal account only
          customBranding: false,
          whiteLabeling: false,
          features: ['basic_guides', 'vidmagnet_branding'],
          isActive: true
        },
        {
          name: 'personal',
          displayName: 'Personal',
          price: '24.95',
          currency: 'USD',
          billingCycle: 'monthly',
          maxLeads: null, // unlimited
          maxVisits: null, // unlimited
          maxBrands: 0, // Personal account only
          customBranding: true,
          whiteLabeling: false,
          features: ['unlimited_guides', 'custom_branding', 'priority_support'],
          isActive: true
        },
        {
          name: 'business',
          displayName: 'Business',
          price: '99.00',
          currency: 'USD',
          billingCycle: 'monthly',
          maxLeads: null, // unlimited
          maxVisits: null, // unlimited
          maxBrands: 3, // Minimum 3 brands included
          customBranding: true,
          whiteLabeling: true,
          features: ['unlimited_guides', 'white_labeling', 'team_management', 'priority_support'],
          isActive: true
        }
      ];

      // Insert plans if they don't exist
      for (const plan of plans) {
        await db.insert(subscriptionPlans)
          .values(plan)
          .onConflictDoNothing();
      }

      res.json({ message: "Subscription plans initialized successfully" });
    } catch (error) {
      console.error("Error initializing subscription plans:", error);
      res.status(500).json({ message: "Failed to initialize subscription plans" });
    }
  });

  // Subscription routes
  app.get('/api/subscription/plans', async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.get('/api/subscription/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getUserSubscription(userId);
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post('/api/subscription/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscriptionData = { ...req.body, userId };
      const subscription = await storage.createUserSubscription(subscriptionData);
      res.json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Brand user management routes
  app.get('/api/brands/:brandId/users', isAuthenticated, async (req: any, res) => {
    try {
      const { brandId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has admin access to this brand
      const userRole = await storage.getBrandUserRole(userId, parseInt(brandId));
      if (!userRole || userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required for this brand" });
      }

      const brandUsers = await storage.getBrandUsers(parseInt(brandId));
      res.json(brandUsers);
    } catch (error) {
      console.error("Error fetching brand users:", error);
      res.status(500).json({ message: "Failed to fetch brand users" });
    }
  });

  app.post('/api/brands/:brandId/users', isAuthenticated, async (req: any, res) => {
    try {
      const { brandId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has admin access to this brand
      const userRole = await storage.getBrandUserRole(userId, parseInt(brandId));
      if (!userRole || userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required for this brand" });
      }

      const brandUserData = { 
        ...req.body, 
        brandId: parseInt(brandId),
        invitedBy: userId 
      };
      const brandUser = await storage.addUserToBrand(brandUserData);
      res.json(brandUser);
    } catch (error) {
      console.error("Error adding user to brand:", error);
      res.status(500).json({ message: "Failed to add user to brand" });
    }
  });

  app.patch('/api/brand-users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const userId = req.user.claims.sub;
      
      // Get the brand user to check permissions
      const [existingBrandUser] = await db.select().from(brandUsers).where(eq(brandUsers.id, parseInt(id)));
      if (!existingBrandUser) {
        return res.status(404).json({ message: "Brand user not found" });
      }

      // Check if current user has admin access to this brand
      const userRole = await storage.getBrandUserRole(userId, existingBrandUser.brandId);
      if (!userRole || userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required for this brand" });
      }

      const updatedBrandUser = await storage.updateBrandUserRole(parseInt(id), role);
      res.json(updatedBrandUser);
    } catch (error) {
      console.error("Error updating brand user role:", error);
      res.status(500).json({ message: "Failed to update brand user role" });
    }
  });

  app.delete('/api/brand-users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get the brand user to check permissions
      const [existingBrandUser] = await db.select().from(brandUsers).where(eq(brandUsers.id, parseInt(id)));
      if (!existingBrandUser) {
        return res.status(404).json({ message: "Brand user not found" });
      }

      // Check if current user has admin access to this brand
      const userRole = await storage.getBrandUserRole(userId, existingBrandUser.brandId);
      if (!userRole || userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required for this brand" });
      }

      await storage.removeBrandUser(parseInt(id));
      res.json({ message: "User removed from brand successfully" });
    } catch (error) {
      console.error("Error removing brand user:", error);
      res.status(500).json({ message: "Failed to remove user from brand" });
    }
  });

  app.get('/api/user/brands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userBrands = await storage.getUserBrands(userId);
      res.json(userBrands);
    } catch (error) {
      console.error("Error fetching user brands:", error);
      res.status(500).json({ message: "Failed to fetch user brands" });
    }
  });

  // Super admin endpoints (proper role-based access)
  app.get('/api/admin/users', isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch system stats" });
    }
  });

  app.delete('/api/admin/users/:userId', isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.patch('/api/admin/users/:userId/role', isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const role = adminRoleSchema.parse(req.body?.role);
      await storage.updateUserRole(req.params.userId, role);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid role" });
      }
      console.error('Error updating user role:', error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.post('/api/admin/users', isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const input = adminCreateUserSchema.parse(req.body);
      const temporaryPassword = randomBytes(18).toString("base64url");
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      const { user, created } = await storage.createPendingUser({
        id: randomUUID(),
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        tempPassword: null,
        isEmailVerified: false,
      });
      if (!created) {
        return res.status(409).json({ message: "User with this email already exists" });
      }
      await storage.updateUserPassword(user.id, passwordHash);
      res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tempPassword: temporaryPassword,
        message: "User created successfully. Share the temporary password securely.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user details" });
      }
      console.error('Error creating user:', error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Check if current user is super admin
  app.get('/api/admin/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getRequestUserId(req);
      if (!userId) return res.json({ isAdmin: false });
      const user = await storage.getUser(userId);
      const isSuper = user?.role === 'super_admin';
      res.json({ isAdmin: isSuper });
    } catch (error) {
      console.error('Error checking admin status:', error);
      res.json({ isAdmin: false });
    }
  });

  // Storage Management API Routes
  
  // Get user storage stats for dashboard
  app.get('/api/storage/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await StorageCostManager.getStorageDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching storage stats:", error);
      res.status(500).json({ message: "Failed to fetch storage stats" });
    }
  });

  // Get user storage files
  app.get('/api/storage/files', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const files = await storage.getUserStorageFiles(userId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching storage files:", error);
      res.status(500).json({ message: "Failed to fetch storage files" });
    }
  });

  // Upload file with storage cost tracking
  app.post('/api/storage/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Simplified upload tracking (no complex quota checking)
      const storageRecord = await storage.createStorageUsage({
        userId,
        fileName: file.originalname,
        fileSizeMB: (file.size / (1024 * 1024)).toString(),
        fileType: file.mimetype,
        fileUrl: null, // Will be updated after actual storage
      });

      res.json({
        success: true,
        storageId: storageRecord.id,
        fileSizeMB: file.size / (1024 * 1024),
        processingCost: StorageCostManager.calculateProcessingCost(file.size / (1024 * 1024))
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Mark file as processed (after transcription/extraction)
  app.post('/api/storage/:id/processed', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      await StorageCostManager.markFileProcessed(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking file as processed:", error);
      res.status(500).json({ message: "Failed to mark file as processed" });
    }
  });

  // Delete file and stop storage costs
  app.delete('/api/storage/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      await StorageCostManager.deleteFileAndStopCosts(parseInt(id), userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Get storage billing history
  app.get('/api/storage/billing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billingHistory = await storage.getStorageBillingHistory(userId);
      res.json(billingHistory);
    } catch (error) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({ message: "Failed to fetch billing history" });
    }
  });

  // Get subscription tier information
  app.get('/api/storage/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tier = await storage.getUserSubscriptionTier(userId);
      res.json(tier);
    } catch (error) {
      console.error("Error fetching subscription tier:", error);
      res.status(500).json({ message: "Failed to fetch subscription tier" });
    }
  });

  // Process cleanup jobs (admin endpoint)
  app.post('/api/admin/storage/cleanup', isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      await StorageCostManager.processCleanupJobs();
      res.json({ success: true, message: "Cleanup jobs processed" });
    } catch (error) {
      console.error("Error processing cleanup jobs:", error);
      res.status(500).json({ message: "Failed to process cleanup jobs" });
    }
  });

  // Email Templates API
  app.get("/api/email-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const brandId = req.user.currentBrandId || null;
      
      const templates = await storage.getEmailTemplates(userId, brandId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.post("/api/email-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const brandId = req.user.currentBrandId || null;
      
      const template = await storage.createEmailTemplate({
        userId,
        brandId,
        ...req.body,
      });
      
      res.json(template);
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  // Email Integrations API
  app.get("/api/email-integrations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const brandId = req.user.currentBrandId || null;
      
      const integrations = await storage.getEmailIntegrations(userId, brandId);
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching email integrations:", error);
      res.status(500).json({ message: "Failed to fetch email integrations" });
    }
  });

  app.post("/api/email-integrations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const brandId = req.user.currentBrandId || null;
      
      const integration = await storage.createEmailIntegration({
        userId,
        brandId,
        ...req.body,
      });
      
      res.json(integration);
    } catch (error) {
      console.error("Error creating email integration:", error);
      res.status(500).json({ message: "Failed to create email integration" });
    }
  });

  // Email Logo Upload API
  app.post("/api/email-logo-upload", isAuthenticated, logoUpload.single('logo'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No logo file provided" });
      }

      const userId = req.user.claims.sub;
      const brandId = req.user.currentBrandId || null;
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = path.extname(req.file.originalname);
      const filename = `email-logo-${userId}-${brandId || 'global'}-${timestamp}${extension}`;
      const logoPath = path.join(process.cwd(), 'public', 'logos', filename);

      // Ensure directory exists
      const logoDir = path.dirname(logoPath);
      if (!fs.existsSync(logoDir)) {
        fs.mkdirSync(logoDir, { recursive: true });
      }

      // Resize and save logo
      if (serviceConfig.useLightweightImage) {
        await processImageToFile(req.file.buffer, logoPath, {
          width: 200,
          height: 200,
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        });
      } else {
        await sharp(req.file.buffer)
          .resize(200, 200, { 
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toFile(logoPath);
      }

      const logoUrl = `/logos/${filename}`;
      
      res.json({ logoUrl });
    } catch (error) {
      console.error("Error uploading email logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Stripe Payment Routes
  app.post('/api/stripe/create-checkout-session', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { planName, billingCycle = 'monthly' } = req.body;

      // Get user data
      const user = await storage.getUser(userId);
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email required" });
      }

      // Get subscription plan
      const plans = await storage.getSubscriptionPlans();
      const plan = plans.find(p => p.name === planName);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Create or get Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          metadata: {
            userId: userId
          }
        });
        stripeCustomerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUser(userId, { stripeCustomerId });
      }

      // Calculate price based on billing cycle
      const price = billingCycle === 'yearly' ? 
        (parseFloat(plan.price) * 10).toFixed(2) : // 2 months free on yearly
        plan.price;

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: plan.currency.toLowerCase(),
              product_data: {
                name: `${plan.displayName} Plan`,
                description: `ConvertMag.net ${plan.displayName} ${billingCycle} subscription`,
              },
              unit_amount: Math.round(parseFloat(price) * 100), // Convert to cents
              recurring: {
                interval: billingCycle === 'yearly' ? 'year' : 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin}/settings?tab=billing&success=true`,
        cancel_url: `${req.headers.origin}/pricing?canceled=true`,
        metadata: {
          userId: userId,
          planName: planName,
          billingCycle: billingCycle
        }
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Stripe webhook handler
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // For now, we'll skip signature verification in development
      // In production, you should set up STRIPE_WEBHOOK_SECRET
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test');
    } catch (err: any) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode === 'subscription') {
            await handleSubscriptionCreated(session);
          }
          break;

        case 'customer.subscription.updated':
          const updatedSubscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(updatedSubscription);
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionCanceled(deletedSubscription);
          break;

        case 'invoice.payment_succeeded':
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentSucceeded(invoice);
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(failedInvoice);
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      return res.status(400).send('Webhook handler failed');
    }

    res.json({ received: true });
  });

  // Customer portal session (consolidated endpoint)
  app.post('/api/stripe/customer-portal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer record found. Please create a subscription first." });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.headers.origin}/settings?tab=billing`,
      });

      res.json({ url: portalSession.url });
    } catch (error) {
      console.error('Error creating portal session:', error);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  // Get current subscription status
  app.get('/api/stripe/subscription-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeSubscriptionId) {
        return res.json({ 
          status: 'none', 
          plan: 'free',
          billingCycle: 'monthly',
          additionalBrands: user?.additionalBrands || 0
        });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      res.json({
        status: subscription.status,
        plan: subscription.metadata?.planName || user.subscriptionTier,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        billingCycle: subscription.items.data[0]?.price?.recurring?.interval || user.billingCycle || 'month',
        additionalBrands: user?.additionalBrands || 0,
        accountStatus: user?.accountStatus || 'active',
        pausedAt: user?.pausedAt
      });
    } catch (error) {
      console.error('Error getting subscription status:', error);
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });

  // Change subscription plan
  app.post('/api/stripe/change-plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { newPlanName, newBillingCycle } = req.body;
      const user = await storage.getUser(userId);

      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      // Get the new plan details
      const plans = await storage.getSubscriptionPlans();
      const newPlan = plans.find(p => p.name === newPlanName);
      if (!newPlan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Calculate new price
      const newPrice = newBillingCycle === 'yearly' ? 
        (parseFloat(newPlan.price) * 10).toFixed(2) : // 2 months free on yearly
        newPlan.price;

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      // Update the subscription
      const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price_data: {
            currency: newPlan.currency.toLowerCase(),
            product_data: {
              name: `${newPlan.displayName} Plan`,
              description: `ConvertMag.net ${newPlan.displayName} ${newBillingCycle} subscription`,
            },
            unit_amount: Math.round(parseFloat(newPrice) * 100),
            recurring: {
              interval: newBillingCycle === 'yearly' ? 'year' : 'month',
            },
          },
        }],
        metadata: {
          userId: userId,
          planName: newPlanName,
          billingCycle: newBillingCycle
        },
        proration_behavior: 'always_invoice'
      });

      // Update user in database
      await storage.updateUser(userId, {
        subscriptionTier: newPlanName,
        billingCycle: newBillingCycle
      });

      res.json({ success: true, subscription: updatedSubscription });
    } catch (error) {
      console.error('Error changing plan:', error);
      res.status(500).json({ message: "Failed to change plan" });
    }
  });

  // Add/remove additional brands
  app.post('/api/stripe/manage-brands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { additionalBrands } = req.body; // Number of additional brands beyond plan limit
      const user = await storage.getUser(userId);

      if (!user?.stripeSubscriptionId || user.subscriptionTier !== 'business') {
        return res.status(400).json({ message: "Business subscription required for additional brands" });
      }

      const brandAddonPrice = 33; // $33 per additional brand per month
      const currentAdditionalBrands = user.additionalBrands || 0;
      
      if (additionalBrands === currentAdditionalBrands) {
        return res.json({ message: "No change needed" });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const isYearly = user.billingCycle === 'yearly';
      const addonAmount = isYearly ? brandAddonPrice * 10 * 100 : brandAddonPrice * 100; // Convert to cents

      // Find existing addon item
      const existingAddonItem = subscription.items.data.find(item => 
        item.price.metadata?.type === 'brand_addon'
      );

      let subscriptionItems = [...subscription.items.data];

      if (additionalBrands > 0) {
        const addonItem = {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Additional Brand',
              description: `Extra brand workspace for ConvertMag.net`,
            },
            unit_amount: addonAmount,
            recurring: {
              interval: isYearly ? 'year' : 'month' as 'year' | 'month',
            },
            metadata: {
              type: 'brand_addon'
            }
          },
          quantity: additionalBrands,
        };

        if (existingAddonItem) {
          // Update existing addon
          subscriptionItems = subscriptionItems.map(item => 
            item.id === existingAddonItem.id 
              ? { id: item.id, ...addonItem }
              : { id: item.id }
          );
        } else {
          // Add new addon
          subscriptionItems.push(addonItem);
        }
      } else if (existingAddonItem) {
        // Remove addon
        subscriptionItems = subscriptionItems.filter(item => item.id !== existingAddonItem.id);
        await stripe.subscriptionItems.del(existingAddonItem.id);
      }

      // Update subscription
      if (additionalBrands > 0) {
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          items: subscriptionItems,
          proration_behavior: 'always_invoice'
        });
      }

      // Update user in database
      await storage.updateUser(userId, {
        additionalBrands: additionalBrands
      });

      res.json({ success: true, additionalBrands });
    } catch (error) {
      console.error('Error managing brands:', error);
      res.status(500).json({ message: "Failed to manage brands" });
    }
  });

  // Pause account (downgrade to free but preserve data)
  app.post('/api/stripe/pause-account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription to pause" });
      }

      // Cancel the Stripe subscription at period end
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          ...user,
          pausedByUser: 'true',
          originalPlan: user.subscriptionTier,
          originalBillingCycle: user.billingCycle || 'monthly'
        }
      });

      // Update user status to paused
      await storage.updateUser(userId, {
        accountStatus: 'paused',
        pausedAt: new Date()
      });

      res.json({ success: true, message: "Account will be paused at the end of current billing period" });
    } catch (error) {
      console.error('Error pausing account:', error);
      res.status(500).json({ message: "Failed to pause account" });
    }
  });

  // Resume account (reactivate subscription)
  app.post('/api/stripe/resume-account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No customer record found" });
      }

      // Get the most recent subscription to check metadata
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 1
      });

      let originalPlan = 'personal'; // Default fallback
      let originalBillingCycle = 'monthly'; // Default fallback

      if (subscriptions.data.length > 0) {
        const lastSub = subscriptions.data[0];
        originalPlan = lastSub.metadata?.originalPlan || 'personal';
        originalBillingCycle = lastSub.metadata?.originalBillingCycle || 'monthly';
      }

      // Get the plan details
      const plans = await storage.getSubscriptionPlans();
      const plan = plans.find(p => p.name === originalPlan);
      if (!plan) {
        return res.status(404).json({ message: "Original plan not found" });
      }

      // Calculate price
      const price = originalBillingCycle === 'yearly' ? 
        (parseFloat(plan.price) * 10).toFixed(2) : 
        plan.price;

      // Create new subscription
      const newSubscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: `${plan.displayName} Plan`,
              description: `ConvertMag.net ${plan.displayName} ${originalBillingCycle} subscription`,
            },
            unit_amount: Math.round(parseFloat(price) * 100),
            recurring: {
              interval: originalBillingCycle === 'yearly' ? 'year' : 'month',
            },
          },
        }],
        metadata: {
          userId: userId,
          planName: originalPlan,
          billingCycle: originalBillingCycle
        }
      });

      // Update user record
      await storage.updateUser(userId, {
        accountStatus: 'active',
        subscriptionTier: originalPlan,
        billingCycle: originalBillingCycle,
        stripeSubscriptionId: newSubscription.id,
        pausedAt: null
      });

      res.json({ success: true, subscription: newSubscription });
    } catch (error) {
      console.error('Error resuming account:', error);
      res.status(500).json({ message: "Failed to resume account" });
    }
  });

  // Helper functions for webhook handling
  async function handleSubscriptionCreated(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const planName = session.metadata?.planName;
    
    if (!userId || !planName) return;

    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    // Update user subscription info
    await storage.updateUser(userId, {
      subscriptionTier: planName,
      stripeSubscriptionId: subscription.id
    });

    console.log(`✅ Subscription created for user ${userId}: ${planName}`);
  }

  async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    
    // Find user by Stripe customer ID
    const { users } = await import("@shared/schema");
    const usersList = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    const user = usersList[0];
    
    if (!user) return;

    // Update subscription status based on Stripe subscription
    const planName = subscription.metadata?.planName || 
      (subscription.status === 'active' ? user.subscriptionTier : 'free');

    await storage.updateUser(user.id, {
      subscriptionTier: subscription.status === 'active' ? planName : 'free',
      stripeSubscriptionId: subscription.id
    });

    console.log(`✅ Subscription updated for user ${user.id}: ${subscription.status}`);
  }

  async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    
    // Find user by Stripe customer ID
    const { users } = await import("@shared/schema");
    const usersList = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    const user = usersList[0];
    
    if (!user) return;

    // Downgrade to free plan
    await storage.updateUser(user.id, {
      subscriptionTier: 'free',
      stripeSubscriptionId: null
    });

    console.log(`✅ Subscription canceled for user ${user.id}`);
  }

  async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log(`✅ Payment succeeded for invoice ${invoice.id}`);
    // You can add additional logic here like sending success emails
  }

  async function handlePaymentFailed(invoice: Stripe.Invoice) {
    console.log(`❌ Payment failed for invoice ${invoice.id}`);
    // You can add additional logic here like sending failure emails
  }

  // Health check endpoint for Docker deployment
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
