-- VidMagnet core schema baseline.
--
-- The table and column definitions below were generated from the complete
-- Drizzle schema at fc9db9336fe320f210ce3d3f72351dba35feb801^, immediately
-- before quiz and brand-scoped appearance migrations 0001 and 0002 landed.
-- This migration is additive: it never drops or rewrites existing data.
-- A partially-created legacy schema fails closed so the migration cannot
-- silently guess how to repair an unknown production database.

DO $$
DECLARE
  present_count integer;
  expected_count constant integer := 29;
BEGIN
  SELECT count(*)::integer
  INTO present_count
  FROM (VALUES
      ('analytics_events'),
      ('brand_users'),
      ('branding_settings'),
      ('brands'),
      ('content_variants'),
      ('email_integrations'),
      ('email_templates'),
      ('file_cleanup_jobs'),
      ('google_connections'),
      ('guides'),
      ('knowledgebase_collections'),
      ('knowledgebase_entries'),
      ('knowledgebase_usage_settings'),
      ('landing_pages'),
      ('leads'),
      ('media_assets'),
      ('notifications'),
      ('personalization_profiles'),
      ('personalization_rules'),
      ('prompt_templates'),
      ('qr_codes'),
      ('sessions'),
      ('storage_billing'),
      ('storage_usage'),
      ('subscription_plans'),
      ('subscription_tiers'),
      ('training_settings'),
      ('user_subscriptions'),
      ('users')
  ) AS expected(table_name)
  WHERE to_regclass(format('public.%I', expected.table_name)) IS NOT NULL;

  IF present_count <> 0 AND present_count <> expected_count THEN
    RAISE EXCEPTION
      'VidMagnet core schema is partial: found % of % expected tables; refusing automatic repair',
      present_count,
      expected_count;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"guide_id" integer,
	"landing_page_id" integer,
	"event_type" varchar NOT NULL,
	"event_data" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"referrer" text,
	"created_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "brand_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(20) NOT NULL,
	"invited_by" varchar,
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "brand_users_brand_id_user_id_unique" UNIQUE("brand_id","user_id")
);


CREATE TABLE IF NOT EXISTS "branding_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"brand_id" integer,
	"logo_url" varchar,
	"favicon_url" varchar,
	"primary_color" varchar DEFAULT '#2563EB',
	"secondary_color" varchar DEFAULT '#10B981',
	"accent_color" varchar DEFAULT '#F59E0B',
	"font_family" varchar DEFAULT 'Inter',
	"company_name" varchar,
	"tagline" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "branding_settings_user_id_unique" UNIQUE("user_id")
);


CREATE TABLE IF NOT EXISTS "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"logo_url" varchar,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "content_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"guide_id" integer NOT NULL,
	"profile_id" integer NOT NULL,
	"variant_name" varchar NOT NULL,
	"personalized_content" jsonb NOT NULL,
	"generation_prompt" text,
	"performance_metrics" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "email_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"brand_id" integer,
	"provider" varchar NOT NULL,
	"webhook_url" varchar,
	"api_key" varchar,
	"list_id" varchar,
	"is_active" boolean DEFAULT true,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"brand_id" integer,
	"template_type" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"html_content" text NOT NULL,
	"logo_type" varchar DEFAULT 'default',
	"custom_logo_url" varchar,
	"text_logo" varchar,
	"is_active" boolean DEFAULT true,
	"required_variables" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "file_cleanup_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"storage_usage_id" integer NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"status" varchar DEFAULT 'pending',
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "google_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"google_id" varchar NOT NULL,
	"google_access_token" text NOT NULL,
	"google_refresh_token" text,
	"google_email" varchar,
	"google_name" varchar,
	"google_picture" varchar,
	"connected_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "guides" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"brand_id" integer,
	"title" varchar NOT NULL,
	"description" text,
	"youtube_url" varchar NOT NULL,
	"youtube_video_id" varchar NOT NULL,
	"channel_title" varchar,
	"thumbnail_url" varchar,
	"transcript" text,
	"ai_analysis" jsonb,
	"content" jsonb,
	"screenshots" jsonb,
	"category" varchar,
	"tags" text[],
	"lead_tags" text[],
	"status" varchar DEFAULT 'draft',
	"slug" varchar,
	"views" integer DEFAULT 0,
	"downloads" integer DEFAULT 0,
	"conversion_rate" numeric(5, 2) DEFAULT '0',
	"cta_link" varchar,
	"cta_text" varchar,
	"navigation_links" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "guides_slug_unique" UNIQUE("slug")
);


CREATE TABLE IF NOT EXISTS "knowledgebase_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"brand_id" integer,
	"name" varchar NOT NULL,
	"description" text,
	"color" varchar DEFAULT '#3B82F6',
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "knowledgebase_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"brand_id" integer,
	"collection_id" integer,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"content_type" varchar NOT NULL,
	"source_url" varchar,
	"source_type" varchar,
	"file_type" varchar,
	"tags" text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "knowledgebase_usage_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"brand_id" integer,
	"use_knowledge_base" boolean DEFAULT true,
	"selected_collection_ids" jsonb DEFAULT '[]'::jsonb,
	"inherit_from_global" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "landing_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"guide_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"headline" varchar,
	"subheadline" varchar(200),
	"description" text,
	"bullet_points" text[],
	"social_proof" text,
	"urgency_text" text,
	"button_text" varchar(50) DEFAULT 'Get Free Guide',
	"disclaimer" text,
	"custom_fields" jsonb,
	"custom_url" varchar,
	"tracking_pixel" text,
	"collect_sms" boolean DEFAULT false,
	"sms_consent_text" text DEFAULT 'I consent to receive text messages from this business. Message and data rates may apply. Reply STOP to opt out.',
	"is_active" boolean DEFAULT true,
	"views" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "landing_pages_custom_url_unique" UNIQUE("custom_url")
);


CREATE TABLE IF NOT EXISTS "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"landing_page_id" integer NOT NULL,
	"guide_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"phone" varchar(20),
	"sms_consent" boolean DEFAULT false,
	"tags" text[],
	"custom_field_data" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"referrer" text,
	"created_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "media_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"brand_id" integer,
	"name" varchar(200) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"mime_type" varchar(100),
	"file_url" text NOT NULL,
	"thumbnail_url" text,
	"embed_code" text,
	"file_size" integer,
	"dimensions" jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"folder" varchar(100) DEFAULT '',
	"is_public" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"type" varchar NOT NULL,
	"entity_type" varchar,
	"entity_id" integer,
	"read" boolean DEFAULT false,
	"data" jsonb,
	"created_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "personalization_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"skill_level" varchar NOT NULL,
	"goals" text[] DEFAULT '{}',
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"demographics" jsonb DEFAULT '{}'::jsonb,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "personalization_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"conditions" jsonb NOT NULL,
	"modifications" jsonb NOT NULL,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "prompt_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"brand_id" integer,
	"name" varchar(100) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"template_type" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"analysis_prompt" text NOT NULL,
	"guide_prompt" text NOT NULL,
	"personalization_prompt" text,
	"special_features" text,
	"minimum_guides" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "qr_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"guide_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"qr_code_url" varchar NOT NULL,
	"target_url" varchar NOT NULL,
	"scans" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);


CREATE TABLE IF NOT EXISTS "storage_billing" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"billing_month" varchar NOT NULL,
	"total_storage_used_mb" numeric(12, 2) NOT NULL,
	"total_cost_usd" numeric(8, 2) NOT NULL,
	"stripe_charge_id" varchar,
	"status" varchar DEFAULT 'pending',
	"charged_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "storage_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"file_name" varchar NOT NULL,
	"file_type" varchar NOT NULL,
	"file_size_mb" numeric(12, 2) NOT NULL,
	"file_url" varchar,
	"storage_provider" varchar DEFAULT 'replit',
	"storage_cost_usd" numeric(8, 4) DEFAULT '0',
	"processed_at" timestamp,
	"deleted_at" timestamp,
	"retention_days" integer DEFAULT 30,
	"guide_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar DEFAULT 'USD',
	"billing_cycle" varchar DEFAULT 'monthly',
	"max_leads" integer,
	"max_visits" integer,
	"max_brands" integer DEFAULT 1,
	"custom_branding" boolean DEFAULT false,
	"white_labeling" boolean DEFAULT false,
	"features" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "subscription_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"monthly_price_usd" numeric(8, 2) NOT NULL,
	"storage_quota_gb" numeric(10, 2) NOT NULL,
	"storage_overage_price_per_gb" numeric(6, 4) NOT NULL,
	"max_file_size_mb" numeric(10, 2) NOT NULL,
	"max_guides_per_month" integer DEFAULT 10,
	"retention_days" integer DEFAULT 30,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "training_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"brand_id" integer,
	"custom_instructions" text,
	"analysis_prompt" text,
	"guide_generation_prompt" text,
	"personalization_prompt" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" integer NOT NULL,
	"status" varchar DEFAULT 'active',
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"trial_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"temp_password" varchar,
	"reset_token" varchar,
	"reset_token_expiry" timestamp,
	"email_verification_token" varchar,
	"is_email_verified" boolean DEFAULT false,
	"current_brand_id" integer,
	"role" varchar(50) DEFAULT 'user',
	"subscription_tier" varchar DEFAULT 'free',
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"billing_cycle" varchar DEFAULT 'monthly',
	"additional_brands" integer DEFAULT 0,
	"account_status" varchar DEFAULT 'active',
	"paused_at" timestamp,
	"storage_quota_gb" numeric(10, 2) DEFAULT '1.0',
	"storage_used_mb" numeric(12, 2) DEFAULT '0',
	"monthly_storage_cost_usd" numeric(8, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('analytics_events_user_id_users_id_fk', 63)
      AND conrelid = 'public.analytics_events'::regclass
  ) THEN
    ALTER TABLE "analytics_events"
      ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('analytics_events_guide_id_guides_id_fk', 63)
      AND conrelid = 'public.analytics_events'::regclass
  ) THEN
    ALTER TABLE "analytics_events"
      ADD CONSTRAINT "analytics_events_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('analytics_events_landing_page_id_landing_pages_id_fk', 63)
      AND conrelid = 'public.analytics_events'::regclass
  ) THEN
    ALTER TABLE "analytics_events"
      ADD CONSTRAINT "analytics_events_landing_page_id_landing_pages_id_fk" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('brand_users_brand_id_brands_id_fk', 63)
      AND conrelid = 'public.brand_users'::regclass
  ) THEN
    ALTER TABLE "brand_users"
      ADD CONSTRAINT "brand_users_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('brand_users_user_id_users_id_fk', 63)
      AND conrelid = 'public.brand_users'::regclass
  ) THEN
    ALTER TABLE "brand_users"
      ADD CONSTRAINT "brand_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('brand_users_invited_by_users_id_fk', 63)
      AND conrelid = 'public.brand_users'::regclass
  ) THEN
    ALTER TABLE "brand_users"
      ADD CONSTRAINT "brand_users_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('branding_settings_user_id_users_id_fk', 63)
      AND conrelid = 'public.branding_settings'::regclass
  ) THEN
    ALTER TABLE "branding_settings"
      ADD CONSTRAINT "branding_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('branding_settings_brand_id_brands_id_fk', 63)
      AND conrelid = 'public.branding_settings'::regclass
  ) THEN
    ALTER TABLE "branding_settings"
      ADD CONSTRAINT "branding_settings_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('content_variants_guide_id_guides_id_fk', 63)
      AND conrelid = 'public.content_variants'::regclass
  ) THEN
    ALTER TABLE "content_variants"
      ADD CONSTRAINT "content_variants_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('content_variants_profile_id_personalization_profiles_id_fk', 63)
      AND conrelid = 'public.content_variants'::regclass
  ) THEN
    ALTER TABLE "content_variants"
      ADD CONSTRAINT "content_variants_profile_id_personalization_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."personalization_profiles"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('email_integrations_user_id_users_id_fk', 63)
      AND conrelid = 'public.email_integrations'::regclass
  ) THEN
    ALTER TABLE "email_integrations"
      ADD CONSTRAINT "email_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('email_integrations_brand_id_brands_id_fk', 63)
      AND conrelid = 'public.email_integrations'::regclass
  ) THEN
    ALTER TABLE "email_integrations"
      ADD CONSTRAINT "email_integrations_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('email_templates_user_id_users_id_fk', 63)
      AND conrelid = 'public.email_templates'::regclass
  ) THEN
    ALTER TABLE "email_templates"
      ADD CONSTRAINT "email_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('email_templates_brand_id_brands_id_fk', 63)
      AND conrelid = 'public.email_templates'::regclass
  ) THEN
    ALTER TABLE "email_templates"
      ADD CONSTRAINT "email_templates_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('file_cleanup_jobs_user_id_users_id_fk', 63)
      AND conrelid = 'public.file_cleanup_jobs'::regclass
  ) THEN
    ALTER TABLE "file_cleanup_jobs"
      ADD CONSTRAINT "file_cleanup_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('file_cleanup_jobs_storage_usage_id_storage_usage_id_fk', 63)
      AND conrelid = 'public.file_cleanup_jobs'::regclass
  ) THEN
    ALTER TABLE "file_cleanup_jobs"
      ADD CONSTRAINT "file_cleanup_jobs_storage_usage_id_storage_usage_id_fk" FOREIGN KEY ("storage_usage_id") REFERENCES "public"."storage_usage"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('google_connections_user_id_users_id_fk', 63)
      AND conrelid = 'public.google_connections'::regclass
  ) THEN
    ALTER TABLE "google_connections"
      ADD CONSTRAINT "google_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('guides_user_id_users_id_fk', 63)
      AND conrelid = 'public.guides'::regclass
  ) THEN
    ALTER TABLE "guides"
      ADD CONSTRAINT "guides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('guides_brand_id_brands_id_fk', 63)
      AND conrelid = 'public.guides'::regclass
  ) THEN
    ALTER TABLE "guides"
      ADD CONSTRAINT "guides_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('knowledgebase_collections_user_id_users_id_fk', 63)
      AND conrelid = 'public.knowledgebase_collections'::regclass
  ) THEN
    ALTER TABLE "knowledgebase_collections"
      ADD CONSTRAINT "knowledgebase_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('knowledgebase_collections_brand_id_brands_id_fk', 63)
      AND conrelid = 'public.knowledgebase_collections'::regclass
  ) THEN
    ALTER TABLE "knowledgebase_collections"
      ADD CONSTRAINT "knowledgebase_collections_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('knowledgebase_entries_user_id_users_id_fk', 63)
      AND conrelid = 'public.knowledgebase_entries'::regclass
  ) THEN
    ALTER TABLE "knowledgebase_entries"
      ADD CONSTRAINT "knowledgebase_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('knowledgebase_entries_brand_id_brands_id_fk', 63)
      AND conrelid = 'public.knowledgebase_entries'::regclass
  ) THEN
    ALTER TABLE "knowledgebase_entries"
      ADD CONSTRAINT "knowledgebase_entries_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('knowledgebase_entries_collection_id_knowledgebase_collections_i', 63)
      AND conrelid = 'public.knowledgebase_entries'::regclass
  ) THEN
    ALTER TABLE "knowledgebase_entries"
      ADD CONSTRAINT "knowledgebase_entries_collection_id_knowledgebase_collections_i" FOREIGN KEY ("collection_id") REFERENCES "public"."knowledgebase_collections"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('knowledgebase_usage_settings_user_id_users_id_fk', 63)
      AND conrelid = 'public.knowledgebase_usage_settings'::regclass
  ) THEN
    ALTER TABLE "knowledgebase_usage_settings"
      ADD CONSTRAINT "knowledgebase_usage_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('knowledgebase_usage_settings_brand_id_brands_id_fk', 63)
      AND conrelid = 'public.knowledgebase_usage_settings'::regclass
  ) THEN
    ALTER TABLE "knowledgebase_usage_settings"
      ADD CONSTRAINT "knowledgebase_usage_settings_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('landing_pages_guide_id_guides_id_fk', 63)
      AND conrelid = 'public.landing_pages'::regclass
  ) THEN
    ALTER TABLE "landing_pages"
      ADD CONSTRAINT "landing_pages_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('landing_pages_user_id_users_id_fk', 63)
      AND conrelid = 'public.landing_pages'::regclass
  ) THEN
    ALTER TABLE "landing_pages"
      ADD CONSTRAINT "landing_pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('leads_landing_page_id_landing_pages_id_fk', 63)
      AND conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_landing_page_id_landing_pages_id_fk" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('leads_guide_id_guides_id_fk', 63)
      AND conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('leads_user_id_users_id_fk', 63)
      AND conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('media_assets_user_id_users_id_fk', 63)
      AND conrelid = 'public.media_assets'::regclass
  ) THEN
    ALTER TABLE "media_assets"
      ADD CONSTRAINT "media_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('media_assets_brand_id_brands_id_fk', 63)
      AND conrelid = 'public.media_assets'::regclass
  ) THEN
    ALTER TABLE "media_assets"
      ADD CONSTRAINT "media_assets_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('notifications_user_id_users_id_fk', 63)
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('personalization_profiles_user_id_users_id_fk', 63)
      AND conrelid = 'public.personalization_profiles'::regclass
  ) THEN
    ALTER TABLE "personalization_profiles"
      ADD CONSTRAINT "personalization_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('personalization_rules_user_id_users_id_fk', 63)
      AND conrelid = 'public.personalization_rules'::regclass
  ) THEN
    ALTER TABLE "personalization_rules"
      ADD CONSTRAINT "personalization_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('prompt_templates_user_id_users_id_fk', 63)
      AND conrelid = 'public.prompt_templates'::regclass
  ) THEN
    ALTER TABLE "prompt_templates"
      ADD CONSTRAINT "prompt_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('prompt_templates_brand_id_brands_id_fk', 63)
      AND conrelid = 'public.prompt_templates'::regclass
  ) THEN
    ALTER TABLE "prompt_templates"
      ADD CONSTRAINT "prompt_templates_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('qr_codes_guide_id_guides_id_fk', 63)
      AND conrelid = 'public.qr_codes'::regclass
  ) THEN
    ALTER TABLE "qr_codes"
      ADD CONSTRAINT "qr_codes_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('qr_codes_user_id_users_id_fk', 63)
      AND conrelid = 'public.qr_codes'::regclass
  ) THEN
    ALTER TABLE "qr_codes"
      ADD CONSTRAINT "qr_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('storage_billing_user_id_users_id_fk', 63)
      AND conrelid = 'public.storage_billing'::regclass
  ) THEN
    ALTER TABLE "storage_billing"
      ADD CONSTRAINT "storage_billing_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('storage_usage_user_id_users_id_fk', 63)
      AND conrelid = 'public.storage_usage'::regclass
  ) THEN
    ALTER TABLE "storage_usage"
      ADD CONSTRAINT "storage_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('storage_usage_guide_id_guides_id_fk', 63)
      AND conrelid = 'public.storage_usage'::regclass
  ) THEN
    ALTER TABLE "storage_usage"
      ADD CONSTRAINT "storage_usage_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('training_settings_user_id_users_id_fk', 63)
      AND conrelid = 'public.training_settings'::regclass
  ) THEN
    ALTER TABLE "training_settings"
      ADD CONSTRAINT "training_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('training_settings_brand_id_brands_id_fk', 63)
      AND conrelid = 'public.training_settings'::regclass
  ) THEN
    ALTER TABLE "training_settings"
      ADD CONSTRAINT "training_settings_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('user_subscriptions_user_id_users_id_fk', 63)
      AND conrelid = 'public.user_subscriptions'::regclass
  ) THEN
    ALTER TABLE "user_subscriptions"
      ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = left('user_subscriptions_plan_id_subscription_plans_id_fk', 63)
      AND conrelid = 'public.user_subscriptions'::regclass
  ) THEN
    ALTER TABLE "user_subscriptions"
      ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" USING btree ("expire");
