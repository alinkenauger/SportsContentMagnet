-- Brand-scoped appearance and quiz theme inheritance.
-- Existing branding rows are preserved, then used as seeds for personal and
-- owned-brand scopes. Historical guides remain personal because their original
-- brand cannot be inferred safely.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM branding_settings
    WHERE brand_id IS NULL
    GROUP BY user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'branding_settings contains duplicate personal rows; resolve them before migration 0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM branding_settings
    WHERE brand_id IS NOT NULL
    GROUP BY brand_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'branding_settings contains duplicate brand rows; resolve them before migration 0002';
  END IF;
END $$;

ALTER TABLE branding_settings
  DROP CONSTRAINT IF EXISTS branding_settings_user_id_unique;
DROP INDEX IF EXISTS branding_settings_user_id_unique;

ALTER TABLE branding_settings
  ADD COLUMN IF NOT EXISTS display_name varchar(160),
  ADD COLUMN IF NOT EXISTS logo_mark_url varchar,
  ADD COLUMN IF NOT EXISTS logo_alt_text varchar(240),
  ADD COLUMN IF NOT EXISTS social_image_url varchar,
  ADD COLUMN IF NOT EXISTS background_color varchar DEFAULT '#F8FAFC',
  ADD COLUMN IF NOT EXISTS surface_color varchar DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS text_color varchar DEFAULT '#0F172A',
  ADD COLUMN IF NOT EXISTS heading_font_family varchar(100) DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS body_font_family varchar(100) DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS website_url varchar,
  ADD COLUMN IF NOT EXISTS privacy_url varchar,
  ADD COLUMN IF NOT EXISTS terms_url varchar,
  ADD COLUMN IF NOT EXISTS brand_voice text,
  ADD COLUMN IF NOT EXISTS target_audience text;

-- Normalize compatibility aliases before cloning scope rows.
UPDATE branding_settings
SET
  display_name = COALESCE(NULLIF(btrim(display_name), ''), NULLIF(btrim(company_name), ''), 'My Brand'),
  company_name = COALESCE(NULLIF(btrim(company_name), ''), NULLIF(btrim(display_name), ''), 'My Brand'),
  primary_color = COALESCE(primary_color, '#2563EB'),
  secondary_color = COALESCE(secondary_color, '#10B981'),
  accent_color = COALESCE(accent_color, '#F59E0B'),
  background_color = COALESCE(background_color, '#F8FAFC'),
  surface_color = COALESCE(surface_color, '#FFFFFF'),
  text_color = COALESCE(text_color, '#0F172A'),
  heading_font_family = COALESCE(NULLIF(btrim(heading_font_family), ''), NULLIF(btrim(font_family), ''), 'Inter'),
  body_font_family = COALESCE(NULLIF(btrim(body_font_family), ''), NULLIF(btrim(font_family), ''), 'Inter'),
  font_family = COALESCE(NULLIF(btrim(font_family), ''), NULLIF(btrim(body_font_family), ''), 'Inter');

UPDATE branding_settings AS settings
SET
  user_id = brands.user_id,
  display_name = COALESCE(NULLIF(settings.display_name, ''), brands.name),
  company_name = COALESCE(NULLIF(settings.company_name, ''), brands.name),
  logo_url = COALESCE(settings.logo_url, brands.logo_url)
FROM brands
WHERE settings.brand_id = brands.id;

-- A legacy row may already point at one brand. Preserve it and create a
-- personal seed when that user does not yet have one.
INSERT INTO branding_settings (
  user_id, brand_id, display_name, company_name, tagline,
  logo_url, logo_mark_url, logo_alt_text, favicon_url, social_image_url,
  primary_color, secondary_color, accent_color, background_color, surface_color, text_color,
  heading_font_family, body_font_family, font_family,
  website_url, privacy_url, terms_url, brand_voice, target_audience,
  created_at, updated_at
)
SELECT DISTINCT ON (source.user_id)
  source.user_id, NULL, source.display_name, source.company_name, source.tagline,
  source.logo_url, source.logo_mark_url, source.logo_alt_text, source.favicon_url, source.social_image_url,
  source.primary_color, source.secondary_color, source.accent_color,
  source.background_color, source.surface_color, source.text_color,
  source.heading_font_family, source.body_font_family, source.font_family,
  source.website_url, source.privacy_url, source.terms_url, source.brand_voice, source.target_audience,
  source.created_at, source.updated_at
FROM branding_settings AS source
WHERE source.brand_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM branding_settings AS personal
    WHERE personal.user_id = source.user_id
      AND personal.brand_id IS NULL
  )
ORDER BY source.user_id, source.updated_at DESC NULLS LAST, source.id DESC;

-- Users who never opened the legacy branding screen still receive an explicit
-- personal scope so future upserts have a stable conflict target.
INSERT INTO branding_settings (
  user_id, brand_id, display_name, company_name,
  primary_color, secondary_color, accent_color, background_color, surface_color, text_color,
  heading_font_family, body_font_family, font_family,
  created_at, updated_at
)
SELECT
  users.id,
  NULL,
  COALESCE(
    NULLIF(btrim(concat_ws(' ', users.first_name, users.last_name)), ''),
    NULLIF(split_part(COALESCE(users.email, ''), '@', 1), ''),
    'My Brand'
  ),
  COALESCE(
    NULLIF(btrim(concat_ws(' ', users.first_name, users.last_name)), ''),
    NULLIF(split_part(COALESCE(users.email, ''), '@', 1), ''),
    'My Brand'
  ),
  '#2563EB', '#10B981', '#F59E0B', '#F8FAFC', '#FFFFFF', '#0F172A',
  'Inter', 'Inter', 'Inter', now(), now()
FROM users
WHERE NOT EXISTS (
  SELECT 1
  FROM branding_settings AS personal
  WHERE personal.user_id = users.id
    AND personal.brand_id IS NULL
);

-- Seed every owned brand from its owner's personal appearance. This is a copy,
-- not inheritance, so future edits remain isolated by brand.
INSERT INTO branding_settings (
  user_id, brand_id, display_name, company_name, tagline,
  logo_url, logo_mark_url, logo_alt_text, favicon_url, social_image_url,
  primary_color, secondary_color, accent_color, background_color, surface_color, text_color,
  heading_font_family, body_font_family, font_family,
  website_url, privacy_url, terms_url, brand_voice, target_audience,
  created_at, updated_at
)
SELECT
  brands.user_id, brands.id, brands.name, brands.name,
  personal.tagline,
  COALESCE(brands.logo_url, personal.logo_url), personal.logo_mark_url,
  concat(brands.name, ' logo'), personal.favicon_url, personal.social_image_url,
  personal.primary_color, personal.secondary_color, personal.accent_color,
  personal.background_color, personal.surface_color, personal.text_color,
  personal.heading_font_family, personal.body_font_family, personal.font_family,
  personal.website_url, personal.privacy_url, personal.terms_url,
  personal.brand_voice, personal.target_audience,
  now(), now()
FROM brands
JOIN branding_settings AS personal
  ON personal.user_id = brands.user_id
 AND personal.brand_id IS NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM branding_settings AS scoped
  WHERE scoped.brand_id = brands.id
);

CREATE UNIQUE INDEX IF NOT EXISTS branding_settings_personal_unique
  ON branding_settings (user_id)
  WHERE brand_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS branding_settings_brand_unique
  ON branding_settings (brand_id)
  WHERE brand_id IS NOT NULL;

-- Replace the historical no-action foreign keys with lifecycle-safe ones.
ALTER TABLE branding_settings
  DROP CONSTRAINT IF EXISTS branding_settings_user_id_users_id_fk,
  DROP CONSTRAINT IF EXISTS branding_settings_brand_id_brands_id_fk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'branding_settings_user_id_users_id_fk'
  ) THEN
    ALTER TABLE branding_settings
      ADD CONSTRAINT branding_settings_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'branding_settings_brand_id_brands_id_fk'
  ) THEN
    ALTER TABLE branding_settings
      ADD CONSTRAINT branding_settings_brand_id_brands_id_fk
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Clear stale selections before enforcing the active-brand reference.
UPDATE users
SET current_brand_id = NULL
WHERE current_brand_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM brands WHERE brands.id = users.current_brand_id);

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_current_brand_id_brands_id_fk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_current_brand_id_brands_id_fk'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_current_brand_id_brands_id_fk
      FOREIGN KEY (current_brand_id) REFERENCES brands(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Existing quiz colors were explicit persisted values; keep those quizzes in
-- custom mode. Quizzes created after this migration inherit brand defaults.
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS theme_mode varchar(20);

UPDATE quizzes
SET theme_mode = 'custom'
WHERE theme_mode IS NULL;

ALTER TABLE quizzes
  ALTER COLUMN theme_mode SET DEFAULT 'brand',
  ALTER COLUMN theme_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quizzes_theme_mode_check'
  ) THEN
    ALTER TABLE quizzes
      ADD CONSTRAINT quizzes_theme_mode_check
      CHECK (theme_mode IN ('brand', 'custom'));
  END IF;
END $$;
