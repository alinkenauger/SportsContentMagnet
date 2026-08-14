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
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";
import type {
  QuizLeadCapture,
  QuizOutcome,
  QuizQuestion,
  QuizResultSnapshot,
  QuizTheme,
} from "./quiz";

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
  tempPassword: varchar("temp_password"), // For new signups
  resetToken: varchar("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  emailVerificationToken: varchar("email_verification_token"),
  isEmailVerified: boolean("is_email_verified").default(false),
  currentBrandId: integer("current_brand_id").references(() => brands.id, { onDelete: "set null" }),
  role: varchar("role", { length: 50 }).default("user"), // 'super_admin', 'account_admin', 'brand_admin', 'user'
  subscriptionTier: varchar("subscription_tier").default("free"), // 'free', 'basic', 'pro', 'enterprise'
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe customer ID
  stripeSubscriptionId: varchar("stripe_subscription_id"), // Stripe subscription ID
  billingCycle: varchar("billing_cycle").default("monthly"), // 'monthly', 'yearly'
  additionalBrands: integer("additional_brands").default(0), // Extra brands beyond plan limit
  accountStatus: varchar("account_status").default("active"), // 'active', 'paused', 'suspended'
  pausedAt: timestamp("paused_at"), // When account was paused
  storageQuotaGB: decimal("storage_quota_gb", { precision: 10, scale: 2 }).default("1.0"), // GB storage limit
  storageUsedMB: decimal("storage_used_mb", { precision: 12, scale: 2 }).default("0"), // MB currently used
  monthlyStorageCostUSD: decimal("monthly_storage_cost_usd", { precision: 8, scale: 2 }).default("0"), // Monthly storage bill
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Brand workspace table - each user can have multiple brands
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  logoUrl: varchar("logo_url"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Brand users table - many-to-many relationship between users and brands with roles
export const brandUsers = pgTable("brand_users", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'admin', 'editor', 'viewer'
  invitedBy: varchar("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.brandId, table.userId) // Prevent duplicate brand-user relationships
]);

export const googleConnections = pgTable("google_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  googleId: varchar("google_id").notNull(),
  googleAccessToken: text("google_access_token").notNull(),
  googleRefreshToken: text("google_refresh_token"),
  googleEmail: varchar("google_email"),
  googleName: varchar("google_name"),
  googlePicture: varchar("google_picture"),
  connectedAt: timestamp("connected_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prompt templates for guide generation - Two-tier system: Brand Voice + Guide Structure
export const promptTemplates = pgTable("prompt_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  brandId: integer("brand_id").references(() => brands.id, { onDelete: "cascade" }), // nullable for personal account templates
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // 'global', 'brand', 'custom'
  templateType: varchar("template_type", { length: 50 }).notNull(), // 'brand_voice' or 'guide_structure'
  category: varchar("category", { length: 50 }).notNull(), // Brand Voice: 'beginner_friendly', 'detailed_indepth', 'entertaining', 'advanced_performance', 'worlds_greatest_teacher' | Guide Structure: 'step_by_step', 'sop', 'workout', 'detailed_analysis', 'next_step'
  analysisPrompt: text("analysis_prompt").notNull(),
  guidePrompt: text("guide_prompt").notNull(),
  personalizationPrompt: text("personalization_prompt"),
  specialFeatures: text("special_features"), // JSON string for special features like timestamp buttons, tracking sheets, etc.
  minimumGuides: integer("minimum_guides").default(0), // For "Next Step" template requiring 10+ guides
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Media center for user/brand assets
export const mediaAssets = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  brandId: integer("brand_id").references(() => brands.id, { onDelete: "cascade" }), // nullable for personal account assets
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // 'image', 'video', 'audio', 'embed', 'document'
  mimeType: varchar("mime_type", { length: 100 }),
  fileUrl: text("file_url").notNull(), // URL to the actual file
  thumbnailUrl: text("thumbnail_url"), // For video/document previews
  embedCode: text("embed_code"), // For YouTube/Vimeo embeds
  fileSize: integer("file_size"), // In bytes
  dimensions: jsonb("dimensions"), // {width: number, height: number} for images/videos
  tags: jsonb("tags").default([]), // Array of tags for organization
  folder: varchar("folder", { length: 100 }).default(""), // Folder organization
  isPublic: boolean("is_public").default(false), // Whether accessible in guides
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Branding settings for each brand
export const brandingSettings = pgTable("branding_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  brandId: integer("brand_id").references(() => brands.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 160 }),
  companyName: varchar("company_name"), // compatibility alias for displayName
  tagline: text("tagline"),
  logoUrl: varchar("logo_url"), // horizontal wordmark; retained for compatibility
  logoMarkUrl: varchar("logo_mark_url"),
  logoAltText: varchar("logo_alt_text", { length: 240 }),
  faviconUrl: varchar("favicon_url"),
  socialImageUrl: varchar("social_image_url"),
  primaryColor: varchar("primary_color").default("#2563EB"),
  secondaryColor: varchar("secondary_color").default("#10B981"),
  accentColor: varchar("accent_color").default("#F59E0B"),
  backgroundColor: varchar("background_color").default("#F8FAFC"),
  surfaceColor: varchar("surface_color").default("#FFFFFF"),
  textColor: varchar("text_color").default("#0F172A"),
  headingFontFamily: varchar("heading_font_family", { length: 100 }).default("Inter"),
  bodyFontFamily: varchar("body_font_family", { length: 100 }).default("Inter"),
  fontFamily: varchar("font_family").default("Inter"), // compatibility alias for bodyFontFamily
  websiteUrl: varchar("website_url"),
  privacyUrl: varchar("privacy_url"),
  termsUrl: varchar("terms_url"),
  brandVoice: text("brand_voice"),
  targetAudience: text("target_audience"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("branding_settings_personal_unique")
    .on(table.userId)
    .where(sql`${table.brandId} IS NULL`),
  uniqueIndex("branding_settings_brand_unique")
    .on(table.brandId)
    .where(sql`${table.brandId} IS NOT NULL`),
]);

// Subscription plans and pricing
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // 'free', 'personal', 'business'
  displayName: varchar("display_name").notNull(), // 'Free', 'Personal', 'Business'
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  billingCycle: varchar("billing_cycle").default("monthly"), // 'monthly', 'yearly'
  maxLeads: integer("max_leads"), // null = unlimited
  maxVisits: integer("max_visits"), // null = unlimited
  maxBrands: integer("max_brands").default(1), // number of brands allowed
  customBranding: boolean("custom_branding").default(false),
  whiteLabeling: boolean("white_labeling").default(false),
  features: jsonb("features").default([]), // array of feature flags
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: varchar("status").default("active"), // 'active', 'cancelled', 'expired', 'trialing'
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  trialEnd: timestamp("trial_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Practice guides generated from videos
export const guides = pgTable("guides", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  brandId: integer("brand_id").references(() => brands.id), // Link guides to specific brands (nullable for migration)
  magnetType: varchar("magnet_type", { length: 20 }).notNull().default("guide"), // 'guide' or 'quiz'
  title: varchar("title").notNull(),
  description: text("description"),
  youtubeUrl: varchar("youtube_url"),
  youtubeVideoId: varchar("youtube_video_id"),
  channelTitle: varchar("channel_title"), // YouTube channel name
  thumbnailUrl: varchar("thumbnail_url"),
  transcript: text("transcript"),
  aiAnalysis: jsonb("ai_analysis"),
  content: jsonb("content"), // Generated guide content
  screenshots: jsonb("screenshots"), // Array of screenshot metadata with timestamps
  category: varchar("category"),
  tags: text("tags").array(),
  leadTags: text("lead_tags").array(), // Tags applied to leads captured from this guide
  status: varchar("status").default("draft"), // draft, published, unlisted, archived
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
  subheadline: varchar("subheadline", { length: 200 }),
  description: text("description"),
  bulletPoints: text("bullet_points").array(), // Array of benefit bullets
  socialProof: text("social_proof"), // Credibility statement
  urgencyText: text("urgency_text"), // Scarcity/urgency copy
  buttonText: varchar("button_text", { length: 50 }).default("Get Free Guide"),
  disclaimer: text("disclaimer"), // Legal disclaimer
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
  tags: text("tags").array(), // Tags applied from guide leadTags
  customFieldData: jsonb("custom_field_data"), // Responses to custom fields
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reusable free gifts and calls-to-action that can be assigned to quiz outcomes.
export const benefitAssets = pgTable("benefit_assets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  brandId: integer("brand_id").references(() => brands.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 20 }).notNull(), // 'free_gift' or 'cta'
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  benefitSummary: text("benefit_summary").notNull(),
  url: text("url").notNull(),
  buttonLabel: varchar("button_label", { length: 100 }).notNull(),
  tags: text("tags").array().notNull().default([]),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("benefit_assets_user_brand_idx").on(table.userId, table.brandId),
  index("benefit_assets_kind_idx").on(table.kind),
]);

// Quiz definitions stay one-to-one with the existing guide/lead-magnet record.
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  guideId: integer("guide_id").references(() => guides.id, { onDelete: "cascade" }).notNull().unique(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  brandId: integer("brand_id").references(() => brands.id, { onDelete: "cascade" }),
  sourceContent: text("source_content").notNull(),
  questions: jsonb("questions").$type<QuizQuestion[]>().notNull(),
  outcomes: jsonb("outcomes").$type<QuizOutcome[]>().notNull(),
  leadCapture: jsonb("lead_capture").$type<QuizLeadCapture>().notNull(),
  theme: jsonb("theme").$type<QuizTheme>().notNull(),
  themeMode: varchar("theme_mode", { length: 20 }).notNull().default("brand"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("quizzes_user_brand_idx").on(table.userId, table.brandId),
]);

// Public quiz sessions use an unguessable UUID token and retain the scored result.
export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  landingPageId: integer("landing_page_id").references(() => landingPages.id, { onDelete: "cascade" }).notNull(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  answerMap: jsonb("answer_map").$type<Record<string, string>>().notNull().default({}),
  scoreMap: jsonb("score_map").$type<Record<string, number>>().notNull().default({}),
  outcomeId: varchar("outcome_id", { length: 80 }),
  resultSnapshot: jsonb("result_snapshot").$type<QuizResultSnapshot>(),
  resultViewedAt: timestamp("result_viewed_at"),
  firstClickedAt: timestamp("first_clicked_at"),
  lastClickedAt: timestamp("last_clicked_at"),
  clickCount: integer("click_count").notNull().default(0),
  clickedAssetId: integer("clicked_asset_id").references(() => benefitAssets.id, { onDelete: "set null" }),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("quiz_attempts_quiz_idx").on(table.quizId),
  index("quiz_attempts_landing_page_idx").on(table.landingPageId),
  index("quiz_attempts_lead_idx").on(table.leadId),
  index("quiz_attempts_rate_idx").on(table.quizId, table.ipAddress, table.startedAt),
  index("quiz_attempts_stale_idx")
    .on(table.quizId, table.startedAt)
    .where(sql`${table.completedAt} IS NULL`),
]);

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
}, (table) => [
  index("analytics_events_quiz_view_dedupe_idx").on(
    table.guideId,
    table.landingPageId,
    table.eventType,
    table.ipAddress,
    table.createdAt,
  ),
]);

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(), // 'lead', 'milestone', 'report', 'system'
  entityType: varchar("entity_type"), // 'guide', 'lead', 'user'
  entityId: integer("entity_id"), // ID of the related entity
  read: boolean("read").default(false),
  data: jsonb("data"), // Additional notification data
  createdAt: timestamp("created_at").defaultNow(),
});

// Training settings for customizing AI prompts per brand
export const trainingSettings = pgTable("training_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  brandId: integer("brand_id").references(() => brands.id), // nullable for migration
  customInstructions: text("custom_instructions"),
  analysisPrompt: text("analysis_prompt"),
  guideGenerationPrompt: text("guide_generation_prompt"),
  personalizationPrompt: text("personalization_prompt"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge Base Collections - organize knowledge bases into groups
export const knowledgebaseCollections = pgTable("knowledgebase_collections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  brandId: integer("brand_id").references(() => brands.id), // null = global user-level, non-null = brand-specific
  name: varchar("name").notNull(),
  description: text("description"),
  color: varchar("color").default("#3B82F6"), // For UI categorization
  isDefault: boolean("is_default").default(false), // One default collection per user/brand
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge Base Usage Settings - control which collections to use for AI
export const knowledgebaseUsageSettings = pgTable("knowledgebase_usage_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  brandId: integer("brand_id").references(() => brands.id), // null = global user-level, non-null = brand-specific
  useKnowledgeBase: boolean("use_knowledge_base").default(true), // Global on/off toggle
  selectedCollectionIds: jsonb("selected_collection_ids").default([]), // Array of collection IDs to use
  inheritFromGlobal: boolean("inherit_from_global").default(true), // For brands - whether to also use global collections
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledgebase entries - global at user level, brands inherit unless they create their own
export const knowledgebaseEntries = pgTable("knowledgebase_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  brandId: integer("brand_id").references(() => brands.id), // null = global user-level, non-null = brand-specific
  collectionId: integer("collection_id").references(() => knowledgebaseCollections.id), // Optional grouping
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

// Storage Usage Tracking
export const storageUsage = pgTable("storage_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fileName: varchar("file_name").notNull(),
  fileType: varchar("file_type").notNull(), // 'video', 'audio', 'pdf', 'image'
  fileSizeMB: decimal("file_size_mb", { precision: 12, scale: 2 }).notNull(),
  fileUrl: varchar("file_url"),
  storageProvider: varchar("storage_provider").default("replit"), // 'replit', 's3', 'user_provided'
  storageCostUSD: decimal("storage_cost_usd", { precision: 8, scale: 4 }).default("0"),
  processedAt: timestamp("processed_at"), // When file was processed (transcript extracted, etc.)
  deletedAt: timestamp("deleted_at"), // When file was deleted to save costs
  retentionDays: integer("retention_days").default(30), // How long to keep the file
  guideId: integer("guide_id").references(() => guides.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Storage Billing Records
export const storageBilling = pgTable("storage_billing", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  billingMonth: varchar("billing_month").notNull(), // 'YYYY-MM'
  totalStorageUsedMB: decimal("total_storage_used_mb", { precision: 12, scale: 2 }).notNull(),
  totalCostUSD: decimal("total_cost_usd", { precision: 8, scale: 2 }).notNull(),
  stripeChargeId: varchar("stripe_charge_id"), // If charged via Stripe
  status: varchar("status").default("pending"), // 'pending', 'charged', 'failed'
  chargedAt: timestamp("charged_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription Tiers and Storage Quotas
export const subscriptionTiers = pgTable("subscription_tiers", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // 'free', 'basic', 'pro', 'enterprise'
  displayName: varchar("display_name").notNull(),
  monthlyPriceUSD: decimal("monthly_price_usd", { precision: 8, scale: 2 }).notNull(),
  storageQuotaGB: decimal("storage_quota_gb", { precision: 10, scale: 2 }).notNull(),
  storageOveragePricePerGB: decimal("storage_overage_price_per_gb", { precision: 6, scale: 4 }).notNull(),
  maxFileSizeMB: decimal("max_file_size_mb", { precision: 10, scale: 2 }).notNull(),
  maxGuidesPerMonth: integer("max_guides_per_month").default(10),
  retentionDays: integer("retention_days").default(30), // How long files are kept
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// File Cleanup Jobs
export const fileCleanupJobs = pgTable("file_cleanup_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  storageUsageId: integer("storage_usage_id").references(() => storageUsage.id, { onDelete: "cascade" }).notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: varchar("status").default("pending"), // 'pending', 'completed', 'failed'
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  brands: many(brands),
  currentBrand: one(brands, { fields: [users.currentBrandId], references: [brands.id] }),
  guides: many(guides),
  landingPages: many(landingPages),
  leads: many(leads),
  qrCodes: many(qrCodes),
  analyticsEvents: many(analyticsEvents),
  brandingSettings: many(brandingSettings),
  trainingSettings: many(trainingSettings),
  knowledgebaseEntries: many(knowledgebaseEntries),
  personalizationProfiles: many(personalizationProfiles),
  personalizationRules: many(personalizationRules),
  promptTemplates: many(promptTemplates),
  mediaAssets: many(mediaAssets),
  benefitAssets: many(benefitAssets),
  quizzes: many(quizzes),
  googleConnection: one(googleConnections),
  brandUsers: many(brandUsers),
  userSubscription: one(userSubscriptions),
}));

export const brandsRelations = relations(brands, ({ one, many }) => ({
  user: one(users, { fields: [brands.userId], references: [users.id] }),
  guides: many(guides),
  brandingSettings: one(brandingSettings),
  trainingSettings: one(trainingSettings),
  knowledgebaseEntries: many(knowledgebaseEntries),
  promptTemplates: many(promptTemplates),
  mediaAssets: many(mediaAssets),
  benefitAssets: many(benefitAssets),
  quizzes: many(quizzes),
  brandUsers: many(brandUsers),
}));

export const guidesRelations = relations(guides, ({ one, many }) => ({
  user: one(users, { fields: [guides.userId], references: [users.id] }),
  brand: one(brands, { fields: [guides.brandId], references: [brands.id] }),
  landingPages: many(landingPages),
  leads: many(leads),
  qrCodes: many(qrCodes),
  analyticsEvents: many(analyticsEvents),
  contentVariants: many(contentVariants),
  quiz: one(quizzes, {
    fields: [guides.id],
    references: [quizzes.guideId],
    relationName: "guideQuiz",
  }),
}));

export const landingPagesRelations = relations(landingPages, ({ one, many }) => ({
  guide: one(guides, { fields: [landingPages.guideId], references: [guides.id] }),
  user: one(users, { fields: [landingPages.userId], references: [users.id] }),
  leads: many(leads),
  analyticsEvents: many(analyticsEvents),
  quizAttempts: many(quizAttempts),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  landingPage: one(landingPages, { fields: [leads.landingPageId], references: [landingPages.id] }),
  guide: one(guides, { fields: [leads.guideId], references: [guides.id] }),
  user: one(users, { fields: [leads.userId], references: [users.id] }),
}));

export const benefitAssetsRelations = relations(benefitAssets, ({ one, many }) => ({
  user: one(users, { fields: [benefitAssets.userId], references: [users.id] }),
  brand: one(brands, { fields: [benefitAssets.brandId], references: [brands.id] }),
  attempts: many(quizAttempts),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  guide: one(guides, {
    fields: [quizzes.guideId],
    references: [guides.id],
    relationName: "guideQuiz",
  }),
  user: one(users, { fields: [quizzes.userId], references: [users.id] }),
  brand: one(brands, { fields: [quizzes.brandId], references: [brands.id] }),
  attempts: many(quizAttempts),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizAttempts.quizId], references: [quizzes.id] }),
  landingPage: one(landingPages, { fields: [quizAttempts.landingPageId], references: [landingPages.id] }),
  lead: one(leads, { fields: [quizAttempts.leadId], references: [leads.id] }),
  clickedAsset: one(benefitAssets, { fields: [quizAttempts.clickedAssetId], references: [benefitAssets.id] }),
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
  brand: one(brands, { fields: [brandingSettings.brandId], references: [brands.id] }),
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

export const promptTemplatesRelations = relations(promptTemplates, ({ one }) => ({
  user: one(users, { fields: [promptTemplates.userId], references: [users.id] }),
  brand: one(brands, { fields: [promptTemplates.brandId], references: [brands.id] }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  user: one(users, { fields: [mediaAssets.userId], references: [users.id] }),
  brand: one(brands, { fields: [mediaAssets.brandId], references: [brands.id] }),
}));

export const googleConnectionsRelations = relations(googleConnections, ({ one }) => ({
  user: one(users, {
    fields: [googleConnections.userId],
    references: [users.id],
  }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  userSubscriptions: many(userSubscriptions),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, { fields: [userSubscriptions.userId], references: [users.id] }),
  plan: one(subscriptionPlans, { fields: [userSubscriptions.planId], references: [subscriptionPlans.id] }),
}));

export const brandUsersRelations = relations(brandUsers, ({ one }) => ({
  brand: one(brands, { fields: [brandUsers.brandId], references: [brands.id] }),
  user: one(users, { fields: [brandUsers.userId], references: [users.id] }),
  inviter: one(users, { fields: [brandUsers.invitedBy], references: [users.id] }),
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

export const insertBenefitAssetSchema = createInsertSchema(benefitAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  startedAt: true,
  updatedAt: true,
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

// Email Templates - Customizable transactional emails
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  brandId: integer("brand_id").references(() => brands.id), // null = global user template
  templateType: varchar("template_type").notNull(), // 'guide_delivery', 'welcome', 'password_reset'
  subject: varchar("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  logoType: varchar("logo_type").default('default'), // 'default', 'custom', 'text', 'none'
  customLogoUrl: varchar("custom_logo_url"),
  textLogo: varchar("text_logo"),
  isActive: boolean("is_active").default(true),
  requiredVariables: jsonb("required_variables").notNull(), // Array of required variables like ['firstName', 'guideTitle']
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email Integrations - Connected email marketing tools
export const emailIntegrations = pgTable("email_integrations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  brandId: integer("brand_id").references(() => brands.id), // null = global user integration
  provider: varchar("provider").notNull(), // 'zapier', 'mailchimp', 'convertkit', 'activecampaign', 'hubspot'
  webhookUrl: varchar("webhook_url"), // For Zapier webhooks
  apiKey: varchar("api_key"), // Encrypted API key for direct integrations
  listId: varchar("list_id"), // For email marketing lists
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings"), // Provider-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  user: one(users, { fields: [emailTemplates.userId], references: [users.id] }),
  brand: one(brands, { fields: [emailTemplates.brandId], references: [brands.id] }),
}));

export const emailIntegrationsRelations = relations(emailIntegrations, ({ one }) => ({
  user: one(users, { fields: [emailIntegrations.userId], references: [users.id] }),
  brand: one(brands, { fields: [emailIntegrations.brandId], references: [brands.id] }),
}));

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailIntegrationSchema = createInsertSchema(emailIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGoogleConnectionSchema = createInsertSchema(googleConnections).omit({
  id: true,
  connectedAt: true,
  updatedAt: true,
});

export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBrandUserSchema = createInsertSchema(brandUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptTemplateSchema = createInsertSchema(promptTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMediaAssetSchema = createInsertSchema(mediaAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKnowledgebaseCollectionSchema = createInsertSchema(knowledgebaseCollections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKnowledgebaseUsageSettingsSchema = createInsertSchema(knowledgebaseUsageSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type KnowledgebaseCollection = typeof knowledgebaseCollections.$inferSelect;
export type InsertKnowledgebaseCollection = z.infer<typeof insertKnowledgebaseCollectionSchema>;
export type KnowledgebaseUsageSettings = typeof knowledgebaseUsageSettings.$inferSelect;
export type InsertKnowledgebaseUsageSettings = z.infer<typeof insertKnowledgebaseUsageSettingsSchema>;
export type Guide = typeof guides.$inferSelect;
export type InsertGuide = z.infer<typeof insertGuideSchema>;
export type LandingPage = typeof landingPages.$inferSelect;
export type InsertLandingPage = z.infer<typeof insertLandingPageSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type BenefitAsset = typeof benefitAssets.$inferSelect;
export type InsertBenefitAsset = z.infer<typeof insertBenefitAssetSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
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
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailIntegration = typeof emailIntegrations.$inferSelect;
export type InsertEmailIntegration = z.infer<typeof insertEmailIntegrationSchema>;
export type GoogleConnection = typeof googleConnections.$inferSelect;
export type InsertGoogleConnection = z.infer<typeof insertGoogleConnectionSchema>;
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type BrandUser = typeof brandUsers.$inferSelect;
export type InsertBrandUser = z.infer<typeof insertBrandUserSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;

// Storage Management Types
export type StorageUsage = typeof storageUsage.$inferSelect;
export type InsertStorageUsage = typeof storageUsage.$inferInsert;
export type StorageBilling = typeof storageBilling.$inferSelect;
export type InsertStorageBilling = typeof storageBilling.$inferInsert;
export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type InsertSubscriptionTier = typeof subscriptionTiers.$inferInsert;
export type FileCleanupJob = typeof fileCleanupJobs.$inferSelect;
export type InsertFileCleanupJob = typeof fileCleanupJobs.$inferInsert;

// Notification Types
export const insertNotificationSchema = createInsertSchema(notifications);
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
