ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS presentation_profile jsonb;

UPDATE guides
SET presentation_profile = '{"version":1,"mode":"auto","preset":"editorial"}'::jsonb
WHERE presentation_profile IS NULL;

ALTER TABLE guides
  ALTER COLUMN presentation_profile
  SET DEFAULT '{"version":1,"mode":"auto","preset":"editorial"}'::jsonb,
  ALTER COLUMN presentation_profile SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guides_presentation_profile_check'
  ) THEN
    ALTER TABLE guides
      ADD CONSTRAINT guides_presentation_profile_check CHECK (
        jsonb_typeof(presentation_profile) = 'object'
        AND presentation_profile->>'version' = '1'
        AND presentation_profile->>'mode' IN ('auto', 'manual')
        AND presentation_profile->>'preset' IN ('editorial', 'basketball', 'golf', 'performance')
      );
  END IF;
END $$;
