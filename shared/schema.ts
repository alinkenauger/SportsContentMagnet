import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Branding settings for each user
export const brandingSettings = pgTable("branding_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  logoUrl: varchar("logo_url"),
  primaryColor: varchar("primary_color").default("#2563EB"),
  secondaryColor: varchar("secondary_color").default("#10B981"),
  accentColor: varchar("accent_color").default("#F59E0B"),
  fontFamily: varchar("font_family").default("Inter"),
  companyName: varchar("company_name"),
  tagline: text("tagline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Practice guides generated from videos
export const guides = pgTable("guides", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  youtubeUrl: varchar("youtube_url").notNull(),
  youtubeVideoId: varchar("youtube_video_id").notNull(),
  channelTitle: varchar("channel_title"), // YouTube channel name
  thumbnailUrl: varchar("thumbnail_url"),
  transcript: text("transcript"),
  aiAnalysis: jsonb("ai_analysis"),
  content: jsonb("content"), // Generated guide content
  category: varchar("category"),
  tags: text("tags").array(),
  status: varchar("status").default("draft"), // draft, published, archived
  slug: varchar("slug").unique(),
  views: integer("views").default(0),
  downloads: integer("downloads").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0"),
  ctaLink: varchar("cta_link"), // Call-to-action link for navigation
  ctaText: varchar("cta_text"), // Text for the CTA button
  navigationLinks: jsonb("navigation_links"), // Custom navigation links
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Landing pages for lead capture
export const landingPages = pgTable("landing_pages", {
  id: serial("id").primaryKey(),
  guideId: integer("guide_id").references(() => guides.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  headline: varchar("headline"),
  description: text("description"),
  customFields: jsonb("custom_fields"), // Dynamic form fields
  customUrl: varchar("custom_url").unique(),
  trackingPixel: text("tracking_pixel"),
  collectSms: boolean("collect_sms").default(false), // Whether to collect SMS on form
  smsConsentText: text("sms_consent_text").default("I consent to receive text messages from this business. Message and data rates may apply. Reply STOP to opt out."),
  isActive: boolean("is_active").default(true),
  views: integer("views").default(0),
  conversions: integer("conversions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Captured leads from landing pages
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  landingPageId: integer("landing_page_id").references(() => landingPages.id).notNull(),
  guideId: integer("guide_id").references(() => guides.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  email: varchar("email").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone", { length: 20 }),
  smsConsent: boolean("sms_consent").default(false),
  customFieldData: jsonb("custom_field_data"), // Responses to custom fields
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").defaultNow(),
});

// QR codes for sharing guides
export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  guideId: integer("guide_id").references(() => guides.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  qrCodeUrl: varchar("qr_code_url").notNull(),
  targetUrl: varchar("target_url").notNull(),
  scans: integer("scans").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics events
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  guideId: integer("guide_id").references(() => guides.id),
  landingPageId: integer("landing_page_id").references(() => landingPages.id),
  eventType: varchar("event_type").notNull(), // view, download, conversion, click
  eventData: jsonb("event_data"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Training settings for customizing AI prompts
export const trainingSettings = pgTable("training_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  customInstructions: text("custom_instructions"),
  analysisPrompt: text("analysis_prompt"),
  guideGenerationPrompt: text("guide_generation_prompt"),
  personalizationPrompt: text("personalization_prompt"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledgebase entries for training content
export const knowledgebaseEntries = pgTable("knowledgebase_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  contentType: varchar("content_type").notNull(), // 'text', 'link', 'transcription'
  sourceUrl: varchar("source_url"), // Original URL if from link or file
  sourceType: varchar("source_type"), // 'manual', 'url', 'file_upload'
  fileType: varchar("file_type"), // 'audio', 'video', 'text', 'pdf', etc.
  tags: text("tags").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Personalization engine tables
export const personalizationProfiles = pgTable("personalization_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  skillLevel: varchar("skill_level").notNull(), // 'beginner', 'intermediate', 'advanced', 'expert'
  goals: text("goals").array().default([]), // e.g., ['weight_loss', 'muscle_gain', 'technique_improvement']
  preferences: jsonb("preferences").default({}), // flexible JSON for various preferences
  demographics: jsonb("demographics").default({}), // age_group, experience_level, etc.
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const personalizationRules = pgTable("personalization_rules", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  conditions: jsonb("conditions").notNull(), // JSON rules for when to apply
  modifications: jsonb("modifications").notNull(), // JSON for content modifications
  priority: integer("priority").default(0), // higher number = higher priority
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contentVariants = pgTable("content_variants", {
  id: serial("id").primaryKey(),
  guideId: integer("guide_id").references(() => guides.id).notNull(),
  profileId: integer("profile_id").references(() => personalizationProfiles.id).notNull(),
  variantName: varchar("variant_name").notNull(),
  personalizedContent: jsonb("personalized_content").notNull(), // modified guide content
  generationPrompt: text("generation_prompt"), // prompt used to generate this variant
  performanceMetrics: jsonb("performance_metrics").default({}), // engagement, conversion rates
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  guides: many(guides),
  landingPages: many(landingPages),
  leads: many(leads),
  qrCodes: many(qrCodes),
  analyticsEvents: many(analyticsEvents),
  brandingSettings: one(brandingSettings),
  trainingSettings: one(trainingSettings),
  knowledgebaseEntries: many(knowledgebaseEntries),
  personalizationProfiles: many(personalizationProfiles),
  personalizationRules: many(personalizationRules),
}));

export const guidesRelations = relations(guides, ({ one, many }) => ({
  user: one(users, { fields: [guides.userId], references: [users.id] }),
  landingPages: many(landingPages),
  leads: many(leads),
  qrCodes: many(qrCodes),
  analyticsEvents: many(analyticsEvents),
  contentVariants: many(contentVariants),
}));

export const landingPagesRelations = relations(landingPages, ({ one, many }) => ({
  guide: one(guides, { fields: [landingPages.guideId], references: [guides.id] }),
  user: one(users, { fields: [landingPages.userId], references: [users.id] }),
  leads: many(leads),
  analyticsEvents: many(analyticsEvents),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  landingPage: one(landingPages, { fields: [leads.landingPageId], references: [landingPages.id] }),
  guide: one(guides, { fields: [leads.guideId], references: [guides.id] }),
  user: one(users, { fields: [leads.userId], references: [users.id] }),
}));

export const qrCodesRelations = relations(qrCodes, ({ one }) => ({
  guide: one(guides, { fields: [qrCodes.guideId], references: [guides.id] }),
  user: one(users, { fields: [qrCodes.userId], references: [users.id] }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, { fields: [analyticsEvents.userId], references: [users.id] }),
  guide: one(guides, { fields: [analyticsEvents.guideId], references: [guides.id] }),
  landingPage: one(landingPages, { fields: [analyticsEvents.landingPageId], references: [landingPages.id] }),
}));

export const brandingSettingsRelations = relations(brandingSettings, ({ one }) => ({
  user: one(users, { fields: [brandingSettings.userId], references: [users.id] }),
}));

export const trainingSettingsRelations = relations(trainingSettings, ({ one }) => ({
  user: one(users, { fields: [trainingSettings.userId], references: [users.id] }),
}));

export const knowledgebaseEntriesRelations = relations(knowledgebaseEntries, ({ one }) => ({
  user: one(users, { fields: [knowledgebaseEntries.userId], references: [users.id] }),
}));

export const personalizationProfilesRelations = relations(personalizationProfiles, ({ one, many }) => ({
  user: one(users, { fields: [personalizationProfiles.userId], references: [users.id] }),
  contentVariants: many(contentVariants),
}));

export const personalizationRulesRelations = relations(personalizationRules, ({ one }) => ({
  user: one(users, { fields: [personalizationRules.userId], references: [users.id] }),
}));

export const contentVariantsRelations = relations(contentVariants, ({ one }) => ({
  guide: one(guides, { fields: [contentVariants.guideId], references: [guides.id] }),
  profile: one(personalizationProfiles, { fields: [contentVariants.profileId], references: [personalizationProfiles.id] }),
}));

// Insert schemas
export const insertGuideSchema = createInsertSchema(guides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLandingPageSchema = createInsertSchema(landingPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export const insertBrandingSettingsSchema = createInsertSchema(brandingSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQrCodeSchema = createInsertSchema(qrCodes).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingSettingsSchema = createInsertSchema(trainingSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKnowledgebaseEntrySchema = createInsertSchema(knowledgebaseEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPersonalizationProfileSchema = createInsertSchema(personalizationProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPersonalizationRuleSchema = createInsertSchema(personalizationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentVariantSchema = createInsertSchema(contentVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Guide = typeof guides.$inferSelect;
export type InsertGuide = z.infer<typeof insertGuideSchema>;
export type LandingPage = typeof landingPages.$inferSelect;
export type InsertLandingPage = z.infer<typeof insertLandingPageSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type BrandingSettings = typeof brandingSettings.$inferSelect;
export type InsertBrandingSettings = z.infer<typeof insertBrandingSettingsSchema>;
export type QrCode = typeof qrCodes.$inferSelect;
export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type TrainingSettings = typeof trainingSettings.$inferSelect;
export type InsertTrainingSettings = z.infer<typeof insertTrainingSettingsSchema>;
export type KnowledgebaseEntry = typeof knowledgebaseEntries.$inferSelect;
export type InsertKnowledgebaseEntry = z.infer<typeof insertKnowledgebaseEntrySchema>;
export type PersonalizationProfile = typeof personalizationProfiles.$inferSelect;
export type InsertPersonalizationProfile = z.infer<typeof insertPersonalizationProfileSchema>;
export type PersonalizationRule = typeof personalizationRules.$inferSelect;
export type InsertPersonalizationRule = z.infer<typeof insertPersonalizationRuleSchema>;
export type ContentVariant = typeof contentVariants.$inferSelect;
export type InsertContentVariant = z.infer<typeof insertContentVariantSchema>;
