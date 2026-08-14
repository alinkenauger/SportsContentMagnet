-- Additive VidMagnet quiz MVP migration.
-- This preserves guides as the parent lead-magnet record so existing landing
-- pages, leads, and analytics continue to work for guides and quizzes.

ALTER TABLE "guides"
  ADD COLUMN IF NOT EXISTS "magnet_type" varchar(20) NOT NULL DEFAULT 'guide';

-- Quizzes can be created from pasted text, so YouTube identifiers are optional.
ALTER TABLE "guides" ALTER COLUMN "youtube_url" DROP NOT NULL;
ALTER TABLE "guides" ALTER COLUMN "youtube_video_id" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "benefit_assets" (
  "id" serial PRIMARY KEY,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "brand_id" integer REFERENCES "brands"("id") ON DELETE CASCADE,
  "kind" varchar(20) NOT NULL,
  "title" varchar(200) NOT NULL,
  "description" text NOT NULL,
  "benefit_summary" text NOT NULL,
  "url" text NOT NULL,
  "button_label" varchar(100) NOT NULL,
  "tags" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "benefit_assets_user_brand_idx"
  ON "benefit_assets" ("user_id", "brand_id");
CREATE INDEX IF NOT EXISTS "benefit_assets_kind_idx"
  ON "benefit_assets" ("kind");

CREATE TABLE IF NOT EXISTS "quizzes" (
  "id" serial PRIMARY KEY,
  "guide_id" integer NOT NULL UNIQUE REFERENCES "guides"("id") ON DELETE CASCADE,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "brand_id" integer REFERENCES "brands"("id") ON DELETE CASCADE,
  "source_content" text NOT NULL,
  "questions" jsonb NOT NULL,
  "outcomes" jsonb NOT NULL,
  "lead_capture" jsonb NOT NULL,
  "theme" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "quizzes_user_brand_idx"
  ON "quizzes" ("user_id", "brand_id");

CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "quiz_id" integer NOT NULL REFERENCES "quizzes"("id") ON DELETE CASCADE,
  "landing_page_id" integer NOT NULL REFERENCES "landing_pages"("id") ON DELETE CASCADE,
  "lead_id" integer REFERENCES "leads"("id") ON DELETE SET NULL,
  "answer_map" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "score_map" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "outcome_id" varchar(80),
  "result_snapshot" jsonb,
  "result_viewed_at" timestamp,
  "first_clicked_at" timestamp,
  "last_clicked_at" timestamp,
  "click_count" integer NOT NULL DEFAULT 0,
  "clicked_asset_id" integer REFERENCES "benefit_assets"("id") ON DELETE SET NULL,
  "ip_address" varchar,
  "user_agent" text,
  "referrer" text,
  "started_at" timestamp DEFAULT now(),
  "completed_at" timestamp,
  "updated_at" timestamp DEFAULT now()
);

-- Existing development databases may already have the table from an earlier
-- manual schema push. Keep this additive migration safe to replay there.
ALTER TABLE "quiz_attempts"
  ADD COLUMN IF NOT EXISTS "result_snapshot" jsonb;

CREATE INDEX IF NOT EXISTS "quiz_attempts_quiz_idx"
  ON "quiz_attempts" ("quiz_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_landing_page_idx"
  ON "quiz_attempts" ("landing_page_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_lead_idx"
  ON "quiz_attempts" ("lead_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_rate_idx"
  ON "quiz_attempts" ("quiz_id", "ip_address", "started_at");
CREATE INDEX IF NOT EXISTS "quiz_attempts_stale_idx"
  ON "quiz_attempts" ("quiz_id", "started_at")
  WHERE "completed_at" IS NULL;

CREATE INDEX IF NOT EXISTS "analytics_events_quiz_view_dedupe_idx"
  ON "analytics_events" (
    "guide_id", "landing_page_id", "event_type", "ip_address", "created_at"
  );
