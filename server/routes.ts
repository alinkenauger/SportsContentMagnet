import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupGoogleAuth, isGoogleAuthenticated } from "./googleAuth";
import { analyzeVideoContent, generatePracticeGuide, personalizeGuideContent } from "./services/openai";
import { getYouTubeVideoData, transcribeVideo } from "./services/youtube";
import { generateGuidePDF, generatePDFFilename } from "./services/pdfGenerator";
import { insertGuideSchema, insertLandingPageSchema, insertLeadSchema, insertBrandingSettingsSchema, insertTrainingSettingsSchema, insertKnowledgebaseEntrySchema } from "@shared/schema";
import QRCode from 'qrcode';
import multer from 'multer';
import { StorageCostManager } from "./services/storageManager";
// import pdf from 'pdf-parse'; // Temporarily disabled due to module issues

export async function registerRoutes(app: Express): Promise<Server> {
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
        cb(new Error('Only PDF and audio files are allowed'), false);
      }
    }
  });

  // Use Google OAuth as primary authentication
  setupGoogleAuth(app);
  // Keep Replit Auth as backup/alternative
  await setupAuth(app);

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
      const userId = req.user.claims?.sub || req.user.id;
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

  // Google auth status (works with both Replit Auth and Google OAuth)
  app.get('/api/auth/google-status', async (req: any, res) => {
    try {
      // Check if authenticated with Google OAuth
      if (req.isAuthenticated() && req.user && req.user.id) {
        return res.json({ connected: true, user: { id: req.user.id, email: req.user.email } });
      }
      
      // Check if authenticated with Replit Auth and has Google connection
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const googleConnection = await storage.getUserGoogleConnection(userId);
        return res.json({ connected: !!googleConnection });
      }
      
      res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error checking Google auth status:", error);
      res.status(500).json({ message: "Failed to check Google auth status" });
    }
  });

  // Alternative user endpoint for Google OAuth
  app.get('/api/auth/google-user', isGoogleAuthenticated, async (req: any, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching Google user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

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
      const userId = req.user.claims.sub;
      const currentBrandId = req.user.currentBrandId;
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
        status: 'published'
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
      console.error("Error creating guide:", error);
      res.status(500).json({ message: "Failed to create guide: " + (error as Error).message });
    }
  });

  app.get('/api/guides', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

      if (!guide.youtubeUrl || !guide.content?.sections) {
        return res.status(400).json({ message: "Guide must have YouTube URL and sections for screenshot extraction" });
      }

      console.log(`Regenerating screenshots for guide ${guideId}...`);
      
      const { videoScreenshotService } = await import('./services/videoScreenshotService');
      
      // Map guide sections to screenshot timestamps
      const timestampData = guide.content.sections.map((section: any) => ({
        timestamp: section.timestampSeconds || 0,
        duration: section.duration || 30,
        title: section.title || 'Section'
      }));
      
      console.log(`Processing ${timestampData.length} timestamps:`, timestampData.map(t => ({ title: t.title, timestamp: t.timestamp })));
      
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
      
      // Generate PDF
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
          firstName: lead.firstName,
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
      const analysis = await analyzeVideoContent(guide.transcript, guide.title, guide.description);
      
      // Regenerate guide content based on real transcript
      const newContent = await generatePracticeGuide(analysis, guide.title, guide.channelTitle, brandingSettings);

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
      const userId = req.user.claims.sub;
      const settings = await storage.getBrandingSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching branding settings:", error);
      res.status(500).json({ message: "Failed to fetch branding settings" });
    }
  });

  app.post('/api/branding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Analytics routes
  app.get('/api/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.getAnalyticsByUser(userId);
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
      const leads = await storage.getLeadsByUser(userId);
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

  // Global Admin routes
  const { isGlobalAdmin } = await import('./adminAuth');

  // Admin: Get all users with stats
  app.get('/api/admin/users', isGlobalAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
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

  // Admin: Get system stats
  app.get('/api/admin/stats', isGlobalAdmin, async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching system stats:", error);
      res.status(500).json({ message: "Failed to fetch system stats" });
    }
  });

  // Admin: Check admin status
  app.get('/api/admin/check', isGlobalAdmin, async (req, res) => {
    res.json({ isAdmin: true });
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
        processingCostUSD: "0",
        storageCostUSD: "0"
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

  const httpServer = createServer(app);
  return httpServer;
}
