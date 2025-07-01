import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupGoogleAuth, isGoogleAuthenticated } from "./googleAuth";
import { analyzeVideoContent, generatePracticeGuide, personalizeGuideContent } from "./services/openai";
import { getYouTubeVideoData, transcribeVideo } from "./services/youtube";
import { insertGuideSchema, insertLandingPageSchema, insertLeadSchema, insertBrandingSettingsSchema, insertTrainingSettingsSchema, insertKnowledgebaseEntrySchema } from "@shared/schema";
import QRCode from 'qrcode';

export async function registerRoutes(app: Express): Promise<Server> {
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
      
      res.json({ 
        success: true, 
        transcript: transcript.substring(0, 500) + '...', // Truncate for response
        length: transcript.length 
      });
    } catch (error) {
      console.error('Test transcription error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard analytics
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getAnalyticsByUser(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Guide routes
  app.post('/api/guides', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { youtubeUrl, manualTranscript, manualTitle, inputMethod, category, customInstructions, targetAudience, difficulty, collectSms, smsConsentText, leadTags } = req.body;

      let videoData: any;
      let transcript: string;

      if (inputMethod === "manual") {
        // Handle manual transcript input
        if (!manualTranscript || !manualTitle) {
          return res.status(400).json({ message: "Manual transcript and title are required" });
        }
        
        // Create mock video data for manual input
        videoData = {
          videoId: `manual-${Date.now()}`,
          title: manualTitle,
          description: "",
          thumbnailUrl: "",
          duration: "0:00",
          channelTitle: "Manual Upload",
          publishedAt: new Date().toISOString(),
          viewCount: 0,
          likeCount: 0
        };
        
        transcript = manualTranscript;
      } else {
        // Handle YouTube URL input
        if (!youtubeUrl) {
          return res.status(400).json({ message: "YouTube URL is required" });
        }

        // Step 1: Extract video metadata
        videoData = await getYouTubeVideoData(youtubeUrl);
        
        // Step 2: Transcribe video
        transcript = await transcribeVideo(videoData.videoId);
      }
      
      // Step 3: Analyze content with AI
      const analysis = await analyzeVideoContent(transcript, videoData.title, videoData.description);
      
      // Step 4: Get user's branding settings
      const brandingSettings = await storage.getBrandingSettings(userId);
      
      // Step 5: Generate practice guide
      const guideContent = await generatePracticeGuide(analysis, videoData.title, videoData.channelTitle, brandingSettings);
      
      // Process lead tags (convert comma-separated string to array)
      const processedLeadTags = leadTags ? 
        leadTags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : 
        [];
      
      // Step 6: Create guide in database
      const guide = await storage.createGuide({
        userId,
        title: guideContent.title,
        description: analysis.summary,
        youtubeUrl,
        youtubeVideoId: videoData.videoId,
        channelTitle: videoData.channelTitle,
        thumbnailUrl: videoData.thumbnailUrl,
        transcript,
        aiAnalysis: analysis,
        content: guideContent,
        category: analysis.category,
        tags: analysis.keyTips,
        leadTags: processedLeadTags,
        slug: `guide-${Date.now()}`,
        status: 'published'
      });

      // Step 7: Create default landing page
      const landingPage = await storage.createLandingPage({
        guideId: guide.id,
        userId,
        title: `Get Your ${guideContent.title}`,
        headline: `Master ${analysis.category} with This Free Practice Guide`,
        description: `Download our comprehensive practice guide based on "${videoData.title}" and start improving your skills today.`,
        customFields: [
          { name: 'firstName', label: 'First Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'skillLevel', label: 'Skill Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], required: false }
        ],
        customUrl: `${guide.slug}-landing`,
        collectSms: collectSms || false,
        smsConsentText: smsConsentText || "I consent to receive text messages from this business. Message and data rates may apply. Reply STOP to opt out.",
        isActive: true
      });

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
      const guides = await storage.searchGuides(userId, search as string, category as string);
      res.json(guides);
    } catch (error) {
      console.error("Error fetching guides:", error);
      res.status(500).json({ message: "Failed to fetch guides" });
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

  const httpServer = createServer(app);
  return httpServer;
}
