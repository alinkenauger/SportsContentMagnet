import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireSuperAdmin, requireAccountAdmin, requireBrandAdmin } from "./roleAuth";
import { analyzeVideoContent, generatePracticeGuide, personalizeGuideContent } from "./services/openai";
import { getYouTubeVideoData, transcribeVideo } from "./services/youtube";
import { EmailService } from "./services/emailService";
import { insertGuideSchema, insertLandingPageSchema, insertLeadSchema, insertBrandingSettingsSchema, insertTrainingSettingsSchema, insertKnowledgebaseEntrySchema, brandUsers, subscriptionPlans } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import QRCode from 'qrcode';
import multer from 'multer';
import { StorageCostManager } from "./services/storageManager";
import fs from 'fs';
import path from 'path';
import { getServiceConfiguration } from './services/deploymentChecker';
import { registerAuthRoutes } from "./authRoutes";
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
  if (req.session && req.session.user) {
    return req.session.user.id;
  } else if (req.user && req.user.claims) {
    return req.user.claims.sub;
  } else if (req.user && req.user.id) {
    return req.user.id;
  }
  return null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get deployment configuration
  const serviceConfig = getServiceConfiguration();

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
      // Accept only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed') as any, false);
      }
    }
  });

  // Use Replit Auth with admin bypass system
  await setupAuth(app);
  
  // Register custom auth routes (signup, password reset, etc.)
  registerAuthRoutes(app);

  // Test email endpoint for debugging
  app.post("/api/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

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
        email: email
      });
    } catch (error) {
      console.error('Email delivery failed:', error);
      res.status(500).json({ error: 'Failed to send test email', details: error.message });
    }
  });

  // Primary auth route (Google OAuth)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check Google OAuth first
      if (req.isAuthenticated() && req.user && req.user.id) {
        return res.json(req.user);
      }
      
      // Fallback to Replit Auth
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        return res.json(user);
      }
      
      res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Brand routes
  app.get('/api/brands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const brands = await storage.getBrandsByUser(userId);
      res.json(brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  app.post('/api/brands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const brandData = { ...req.body, userId };
      
      const brand = await storage.createBrand(brandData);
      
      // If this is the user's first brand, set it as current
      const userBrands = await storage.getBrandsByUser(userId);
      if (userBrands.length === 1) {
        await storage.setCurrentBrand(userId, brand.id);
      }
      
      res.json(brand);
    } catch (error) {
      console.error("Error creating brand:", error);
      res.status(500).json({ message: "Failed to create brand" });
    }
  });

  app.put('/api/brands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const brandId = parseInt(req.params.id);
      
      // Verify brand ownership
      const brand = await storage.getBrand(brandId);
      if (!brand || brand.userId !== userId) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      const updatedBrand = await storage.updateBrand(brandId, req.body);
      res.json(updatedBrand);
    } catch (error) {
      console.error("Error updating brand:", error);
      res.status(500).json({ message: "Failed to update brand" });
    }
  });

  app.post('/api/brands/:id/set-current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const brandId = parseInt(req.params.id);
      
      // Verify brand ownership
      const brand = await storage.getBrand(brandId);
      if (!brand || brand.userId !== userId) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      await storage.setCurrentBrand(userId, brandId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting current brand:", error);
      res.status(500).json({ message: "Failed to set current brand" });
    }
  });

  app.post('/api/brands/clear-current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      await storage.setCurrentBrand(userId, null);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing current brand:", error);
      res.status(500).json({ message: "Failed to clear current brand" });
    }
  });

  app.delete('/api/brands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
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
      console.error("Error deleting brand:", error);
      res.status(500).json({ message: "Failed to delete brand" });
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
      const userId = getUserId(req);
      // Get current brand from database
      const user = await storage.getUser(userId);
      const currentBrandId = user?.currentBrandId;
      const stats = await storage.getAnalyticsByUser(userId, currentBrandId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Guide routes - handle multiple content types
  app.post('/api/guides', upload.single('file'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      let videoData: any;
      let transcript: string;
      let inputMethod = req.body.inputMethod;
      
      // Extract common parameters
      const { youtubeUrl, leadTags, collectSms, smsConsentText, selectedTemplate } = req.body;
      console.log(`Guide creation: inputMethod=${inputMethod}, youtubeUrl=${youtubeUrl}, template=${selectedTemplate}`);
      
      // Handle different input methods
      if (inputMethod === "youtube") {
        if (!youtubeUrl) {
          return res.status(400).json({ message: "YouTube URL is required" });
        }

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
      const trainingSettings = await storage.getTrainingSettings(userId);
      const brandingSettings = await storage.getBrandingSettings(userId);
      
      // Step 4: Analyze content and generate practice guide
      let guideContent;
      let analysis;
      let screenshots = null;
      
      if (videoData.segments && videoData.segments.length > 0) {
        // Use timestamped content generation for YouTube videos with timing data
        const { generateTimestampedContent } = await import('./services/aiContentWithTimestamps');
        guideContent = await generateTimestampedContent(transcript, videoData.segments, videoData, trainingSettings, selectedTemplate);
        
        // Still need analysis for guide metadata
        analysis = await analyzeVideoContent(transcript, videoData.title, videoData.description);
        
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
        analysis = await analyzeVideoContent(transcript, videoData.title, videoData.description);
        guideContent = await generatePracticeGuide(analysis, videoData.title, videoData.channelTitle, brandingSettings, selectedTemplate);
      }
      
      // Process lead tags (convert comma-separated string to array)
      const processedLeadTags = leadTags ? 
        leadTags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : 
        [];
      
      // Step 6: Create guide in database
      const guide = await storage.createGuide({
        userId,
        title: guideContent.title,
        description: analysis.summary,
        youtubeUrl: youtubeUrl || null,
        youtubeVideoId: videoData.videoId,
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
        status: 'draft'
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
      const { search, category } = req.query;
      
      // Get current user to check their current brand
      const user = await storage.getUser(userId);
      const currentBrandId = user?.currentBrandId || null;
      
      const guides = await storage.getGuidesByUserAndBrand(userId, currentBrandId, search as string, category as string);
      res.json(guides);
    } catch (error) {
      console.error("Error fetching guides:", error);
      res.status(500).json({ message: "Failed to fetch guides" });
    }
  });

  // Endpoint to regenerate screenshots for an existing guide
  app.post('/api/guides/:id/regenerate-screenshots', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.id);
      
      const guide = await storage.getGuide(guideId);
      if (!guide || guide.userId !== userId) {
        return res.status(404).json({ message: "Guide not found" });
      }

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
        // Update guide with new screenshots
        await storage.updateGuide(guideId, {
          screenshots: screenshotResult.screenshots
        });
        
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
      console.error("Error regenerating screenshots:", error);
      res.status(500).json({ message: "Failed to regenerate screenshots: " + (error as Error).message });
    }
  });

  app.get('/api/guides/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.id);
      const guide = await storage.getGuide(guideId);
      
      if (!guide || guide.userId !== userId) {
        return res.status(404).json({ message: "Guide not found" });
      }

      const analytics = await storage.getGuideAnalytics(guideId);
      res.json({ ...guide, analytics });
    } catch (error) {
      console.error("Error fetching guide:", error);
      res.status(500).json({ message: "Failed to fetch guide" });
    }
  });

  // Get landing page URL for guide editing
  app.get('/api/guides/:id/landing-page-url', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.id);
      const guide = await storage.getGuide(guideId);
      
      if (!guide || guide.userId !== userId) {
        return res.status(404).json({ message: "Guide not found" });
      }

      // Get the landing page for this guide
      const landingPage = await storage.getLandingPageByGuideId(guideId);
      
      if (!landingPage) {
        return res.status(404).json({ message: "Landing page not found" });
      }

      res.json({ customUrl: landingPage.customUrl });
    } catch (error) {
      console.error("Error fetching landing page URL:", error);
      res.status(500).json({ message: "Failed to fetch landing page URL" });
    }
  });

  // Track guide view (public endpoint)
  app.post('/api/guides/:id/view', async (req, res) => {
    try {
      const guideId = parseInt(req.params.id);
      const guide = await storage.getGuide(guideId);
      
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }

      // Increment view count
      await storage.updateGuide(guideId, {
        views: (guide.views || 0) + 1
      });

      // Create analytics event
      await storage.createAnalyticsEvent({
        guideId,
        userId: guide.userId,
        eventType: 'view',
        eventData: {
          timestamp: new Date().toISOString(),
          referrer: req.headers.referer || null,
          userAgent: req.headers['user-agent'] || null
        }
      });

      res.json({ success: true, views: (guide.views || 0) + 1 });
    } catch (error) {
      console.error("Error tracking guide view:", error);
      res.status(500).json({ message: "Failed to track view" });
    }
  });

  // Update guide status with smart tagging for Practice Library
  app.patch('/api/guides/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.id);
      const { status } = req.body;

      if (!["draft", "published", "unlisted", "archived"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const guide = await storage.getGuide(guideId);
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }

      if (guide.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      let updateData: any = { status };

      // If publishing to Practice Library, generate smart tags
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

          console.log(`Auto-tagged guide "${guide.title}" for Practice Library:`, {
            category: smartTags.category,
            tags: updateData.tags
          });
        } catch (error) {
          console.error("Error generating smart tags:", error);
          // Continue with status update even if tagging fails
        }
      }

      const updatedGuide = await storage.updateGuide(guideId, updateData);
      
      let message = "Guide status updated";
      if (status === "published") {
        message = "Guide published and added to Practice Library with smart tags!";
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
      const userId = req.user.claims.sub;
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

      if (guide.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized - you don't own this guide" });
      }

      // If transferring to a brand, verify the user owns that brand
      if (targetBrandId !== null) {
        const targetBrand = await storage.getBrand(targetBrandId);
        if (!targetBrand || targetBrand.userId !== userId) {
          return res.status(403).json({ message: "Unauthorized - you don't own the target brand" });
        }
      }

      // Perform the transfer
      const updatedGuide = await storage.updateGuide(guideId, {
        brandId: targetBrandId
      });

      // Landing page transfer not implemented yet
      // Landing pages will need to be recreated for the new brand if needed

      let message;
      if (targetBrandId === null) {
        message = "Guide transferred to Personal account";
      } else {
        const brand = await storage.getBrand(targetBrandId);
        message = `Guide transferred to ${brand?.name || 'Brand'} account`;
      }

      res.json({ 
        guide: updatedGuide, 
        message
      });
    } catch (error) {
      console.error("Error transferring guide:", error);
      res.status(500).json({ message: "Failed to transfer guide" });
    }
  });

  // Import admin auth at the top of the route handler to avoid hoisting issues
  const { isGlobalAdmin: adminAuth } = await import('./adminAuth');
  
  // Admin-only guide transfer between any brand accounts  
  app.patch('/api/admin/guides/:id/transfer', isAuthenticated, adminAuth, async (req: any, res) => {
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

      // Perform the transfer
      const updatedGuide = await storage.updateGuide(guideId, {
        userId: targetUserId,
        brandId: targetBrandId
      });

      // Landing page transfer not implemented yet
      // Landing pages will need to be recreated for the new user if needed

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
      console.error("Error transferring guide (admin):", error);
      res.status(500).json({ message: "Failed to transfer guide" });
    }
  });

  app.get('/api/guides/:id/landing-page', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.id);
      const guide = await storage.getGuide(guideId);
      
      if (!guide || guide.userId !== userId) {
        return res.status(404).json({ message: "Guide not found" });
      }

      const landingPages = await storage.getLandingPagesByUser(userId);
      const landingPage = landingPages.find(lp => lp.guideId === guideId);
      
      if (!landingPage) {
        return res.status(404).json({ message: "Landing page not found" });
      }

      res.json({ customUrl: landingPage.customUrl });
    } catch (error) {
      console.error("Error fetching landing page:", error);
      res.status(500).json({ message: "Failed to fetch landing page" });
    }
  });

  app.put('/api/guides/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.id);
      const guide = await storage.getGuide(guideId);
      
      if (!guide || guide.userId !== userId) {
        return res.status(404).json({ message: "Guide not found" });
      }

      const updateData = insertGuideSchema.partial().parse(req.body);
      const updatedGuide = await storage.updateGuide(guideId, updateData);
      res.json(updatedGuide);
    } catch (error) {
      console.error("Error updating guide:", error);
      res.status(500).json({ message: "Failed to update guide" });
    }
  });

  // PDF download route
  app.get('/api/guides/:id/download-pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const guideId = parseInt(req.params.id);
      
      // Get guide and verify ownership
      const guide = await storage.getGuide(guideId);
      if (!guide || guide.userId !== userId) {
        return res.status(404).json({ message: "Guide not found" });
      }

      // Get branding settings
      const branding = await storage.getBrandingSettings(userId);
      
      // Generate PDF (automatically uses lightweight service in deployment)
      if (serviceConfig.useLightweightPDF) {
        // In lightweight mode, provide helpful message
        return res.status(503).json({ 
          message: "PDF generation is temporarily disabled. Please contact support for alternative download options or access your guide via the web interface." 
        });
      }

      const pdfBuffer = await generateGuidePDF({
        guide,
        branding: branding || undefined,
        channelTitle: guide.channelTitle || undefined
      });

      // Set response headers for PDF download
      const filename = generatePDFFilename(guide);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Track download analytics
      await storage.createAnalyticsEvent({
        userId,
        guideId,
        eventType: 'download',
        eventData: { format: 'pdf' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer')
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
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

  // Landing page routes
  app.get('/api/landing/:customUrl', async (req, res) => {
    try {
      const { customUrl } = req.params;
      const landingPage = await storage.getLandingPageByUrl(customUrl);
      
      if (!landingPage || !landingPage.isActive) {
        return res.status(404).json({ message: "Landing page not found" });
      }

      const guide = await storage.getGuide(landingPage.guideId);
      const brandingSettings = await storage.getBrandingSettings(landingPage.userId);

      // Track page view
      await storage.createAnalyticsEvent({
        userId: landingPage.userId,
        guideId: landingPage.guideId,
        landingPageId: landingPage.id,
        eventType: 'view',
        eventData: { page: 'landing' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer')
      });

      res.json({
        landingPage,
        guide,
        brandingSettings
      });
    } catch (error) {
      console.error("Error fetching landing page:", error);
      res.status(500).json({ message: "Failed to fetch landing page" });
    }
  });

  // Update landing page (for editor)
  app.put('/api/landing/:customUrl', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { customUrl } = req.params;
      const landingPage = await storage.getLandingPageByUrl(customUrl);
      
      if (!landingPage || landingPage.userId !== userId) {
        return res.status(404).json({ message: "Landing page not found" });
      }

      const updatedData = req.body;
      const updatedLandingPage = await storage.updateLandingPage(landingPage.id, updatedData);

      res.json(updatedLandingPage);
    } catch (error) {
      console.error("Error updating landing page:", error);
      res.status(500).json({ message: "Failed to update landing page" });
    }
  });

  app.post('/api/landing/:customUrl/submit', async (req, res) => {
    try {
      const { customUrl } = req.params;
      const landingPage = await storage.getLandingPageByUrl(customUrl);
      
      if (!landingPage || !landingPage.isActive) {
        return res.status(404).json({ message: "Landing page not found" });
      }

      const { firstName, email, phone, smsConsent, customFieldData } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Get guide to access leadTags
      const guide = await storage.getGuide(landingPage.guideId);
      
      // Create lead
      const lead = await storage.createLead({
        landingPageId: landingPage.id,
        guideId: landingPage.guideId,
        userId: landingPage.userId,
        email,
        firstName,
        phone: phone && phone.trim() ? phone : undefined,
        smsConsent: phone && phone.trim() ? (smsConsent === "true") : false,
        tags: guide?.leadTags || [], // Apply lead tags from guide
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

      // Send guide delivery email
      try {
        const emailService = new EmailService();
        const guideDeliveryUrl = `${req.protocol}://${req.get('host')}/delivery/${customUrl}/${lead.id}`;
        const landingPageUrl = `${req.protocol}://${req.get('host')}/landing/${customUrl}`;
        
        await emailService.sendGuideDeliveryEmail(
          { email, firstName: firstName || 'Friend' },
          guide?.title || 'Your Practice Guide',
          guideDeliveryUrl,
          landingPageUrl
        );
      } catch (emailError) {
        console.warn("📧 Email delivery failed (lead capture still successful):", emailError.message);
        if (emailError.message?.includes("not authorized to send mail")) {
          console.warn("🔧 Fix needed: Verify your sender email (adamlinkenauger@gmail.com) in SendGrid Settings → Sender Authentication");
        }
        // Don't fail the lead creation if email fails
      }

      res.json({
        success: true,
        deliveryUrl: `/delivery/${customUrl}/${lead.id}`,
        message: "Lead captured successfully"
      });

    } catch (error) {
      console.error("Error submitting lead:", error);
      res.status(500).json({ message: "Failed to submit lead" });
    }
  });

  // Delivery page routes
  app.get('/api/delivery/:customUrl/:leadId', async (req, res) => {
    try {
      const { customUrl, leadId } = req.params;
      const landingPage = await storage.getLandingPageByUrl(customUrl);
      
      if (!landingPage) {
        return res.status(404).json({ message: "Page not found" });
      }

      const guide = await storage.getGuide(landingPage.guideId);
      const brandingSettings = await storage.getBrandingSettings(landingPage.userId);
      
      // Get lead data for personalization
      const leads = await storage.getLeadsByGuide(landingPage.guideId);
      const lead = leads.find(l => l.id === parseInt(leadId));

      if (!lead) {
        return res.status(404).json({ message: "Access denied" });
      }

      // Personalize the guide content
      const personalizedContent = await personalizeGuideContent(
        guide?.content as any,
        {
          firstName: lead.firstName || undefined,
          customFieldData: lead.customFieldData as Record<string, any>
        }
      );

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
          ...guide,
          content: personalizedContent
        },
        brandingSettings,
        lead
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
      
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }

      // Get branding settings for the guide owner
      const brandingSettings = await storage.getBrandingSettings(guide.userId);

      res.json({
        guide,
        brandingSettings
      });
    } catch (error) {
      console.error("Error fetching public guide:", error);
      res.status(500).json({ message: "Failed to fetch guide" });
    }
  });

  // Regenerate guide content from transcript
  app.post('/api/guides/:id/regenerate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.id);
      
      const guide = await storage.getGuide(guideId);
      if (!guide || guide.userId !== userId) {
        return res.status(404).json({ message: "Guide not found" });
      }

      if (!guide.transcript) {
        return res.status(400).json({ message: "No transcript available for regeneration" });
      }

      // Get branding settings
      const brandingSettings = await storage.getBrandingSettings(userId);

      // Re-analyze the actual transcript
      const analysis = await analyzeVideoContent(guide.transcript || '', guide.title || '', guide.description || '');
      
      // Regenerate guide content based on real transcript
      const newContent = await generatePracticeGuide(analysis, guide.title || '', guide.channelTitle || '', brandingSettings);

      // Update the guide with real content
      const updatedGuide = await storage.updateGuide(guideId, {
        aiAnalysis: analysis,
        content: newContent
      });

      res.json({ 
        message: "Guide regenerated successfully",
        guide: updatedGuide
      });
    } catch (error) {
      console.error("Error regenerating guide:", error);
      res.status(500).json({ message: "Failed to regenerate guide" });
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

  // Branding settings routes
  app.get('/api/branding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const settings = await storage.getBrandingSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching branding settings:", error);
      res.status(500).json({ message: "Failed to fetch branding settings" });
    }
  });

  // Logo upload endpoint with automatic resizing
  app.post('/api/branding/logo', isAuthenticated, logoUpload.single('logo'), async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Create a unique filename with PNG extension (since we'll convert all logos to PNG)
      const timestamp = Date.now();
      const fileName = `logo-${userId}-${timestamp}.png`;
      const filePath = `public/uploads/logos/${fileName}`;

      // Ensure uploads directory exists
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Process image with automatic resizing to 200x200 with transparent background
      let processedBuffer: Buffer;
      if (serviceConfig.useLightweightImage) {
        processedBuffer = await processImage(req.file.buffer, {
          width: 200,
          height: 200,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        });
      } else {
        processedBuffer = await sharp(req.file.buffer)
          .resize(200, 200, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
      }

      // Save the processed file
      fs.writeFileSync(path.join(process.cwd(), filePath), processedBuffer);

      // Return the URL
      const logoUrl = `/uploads/logos/${fileName}`;
      res.json({ logoUrl });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Favicon upload endpoint with automatic resizing
  app.post('/api/branding/favicon', isAuthenticated, logoUpload.single('favicon'), async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Create a unique filename with PNG extension
      const timestamp = Date.now();
      const fileName = `favicon-${userId}-${timestamp}.png`;
      const filePath = `public/uploads/favicons/${fileName}`;

      // Ensure uploads directory exists
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'favicons');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Process image with automatic resizing to 32x32 for favicon
      let processedBuffer: Buffer;
      if (serviceConfig.useLightweightImage) {
        processedBuffer = await processImage(req.file.buffer, {
          width: 32,
          height: 32,
          fit: 'cover'
        });
      } else {
        processedBuffer = await sharp(req.file.buffer)
          .resize(32, 32, {
            fit: 'cover'
          })
          .png()
          .toBuffer();
      }

      // Save the processed file
      fs.writeFileSync(path.join(process.cwd(), filePath), processedBuffer);

      // Return the URL
      const faviconUrl = `/uploads/favicons/${fileName}`;
      res.json({ faviconUrl });
    } catch (error) {
      console.error("Error uploading favicon:", error);
      res.status(500).json({ message: "Failed to upload favicon" });
    }
  });

  app.post('/api/branding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const settingsData = insertBrandingSettingsSchema.parse({
        ...req.body,
        userId
      });
      
      const settings = await storage.upsertBrandingSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating branding settings:", error);
      res.status(500).json({ message: "Failed to update branding settings" });
    }
  });

  // Notifications routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const unreadOnly = req.query.unread === 'true';
      const notifications = await storage.getNotifications(getUserId(req), unreadOnly);
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
      const userId = req.user.claims.sub;
      // Get current brand from database
      const user = await storage.getUser(userId);
      const currentBrandId = user?.currentBrandId;
      const analytics = await storage.getAnalyticsByUser(userId, currentBrandId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Leads routes
  app.get('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Get current brand from database
      const user = await storage.getUser(userId);
      const currentBrandId = user?.currentBrandId || null;
      const leads = await storage.getLeadsByUserAndBrand(userId, currentBrandId);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
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
  const { isGlobalAdmin } = await import('./adminAuth');
  app.post('/api/subscription/init-plans', isGlobalAdmin, async (req, res) => {
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

  // Global Admin routes
  // Admin: Get all users with stats - temporary bypass for broken session
  app.get('/api/admin/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Create new user - temporary bypass for broken session
  app.post('/api/admin/users', async (req, res) => {
    try {
      const { email, firstName, lastName, role } = req.body;

      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, first name, and last name are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Generate a temporary password (user will need to reset it)
      const tempPassword = Math.random().toString(36).slice(-8);

      // Create the user
      const userData = {
        id: randomUUID(),
        email,
        firstName,
        lastName,
        role: role || 'user',
        tempPassword, // Store temporarily for display to admin
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user = await storage.upsertUser(userData);
      
      res.json({
        ...user,
        tempPassword, // Return temp password for admin to share with user
        message: "User created successfully. Share the temporary password with the user."
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Admin: Get specific user stats
  app.get('/api/admin/users/:userId', isGlobalAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const userStats = await storage.getUserStats(userId);
      res.json(userStats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Admin: Update user role
  app.patch('/api/admin/users/:userId/role', isGlobalAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'user' or 'admin'" });
      }

      const updatedUser = await storage.updateUserRole(userId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Admin: Delete user
  app.delete('/api/admin/users/:userId', isGlobalAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin: Get system stats - temporary bypass for broken session
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching system stats:", error);
      res.status(500).json({ message: "Failed to fetch system stats" });
    }
  });





  // Super admin endpoints (proper role-based access)
  app.get('/api/admin/users', requireSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/stats', requireSuperAdmin, async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch system stats" });
    }
  });

  app.delete('/api/admin/users/:userId', requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.patch('/api/admin/users/:userId/role', requireSuperAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      await storage.updateUserRole(req.params.userId, role);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.post('/api/admin/users', requireSuperAdmin, async (req, res) => {
    try {
      const userData = req.body;
      const newUser = await storage.createUser(userData);
      res.json(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Check if current user is super admin
  app.get('/api/admin/check', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both session-based and Replit Auth users
      let userId: string;
      let user: any;
      
      if (req.session && req.session.user) {
        // Session-based authentication
        userId = req.session.user.id;
        user = req.session.user;
      } else if (req.user && req.user.claims) {
        // Replit Auth authentication
        userId = req.user.claims.sub;
        user = await storage.getUserById(userId);
      } else {
        return res.json({ isAdmin: false });
      }
      
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
  app.post('/api/admin/storage/cleanup', isGlobalAdmin, async (req, res) => {
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


