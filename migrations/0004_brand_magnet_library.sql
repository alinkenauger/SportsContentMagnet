-- Brand-owned public Magnet Libraries.
-- Existing magnets deliberately remain NULL so this migration cannot make a
-- previously-created record discoverable. New inserts default to included,
-- but discovery still requires an explicit published status and active
-- landing page at query time.

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS library_slug varchar(100);

CREATE UNIQUE INDEX IF NOT EXISTS brands_library_slug_unique
  ON brands (library_slug)
  WHERE library_slug IS NOT NULL;

ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS include_in_library boolean;

ALTER TABLE guides
  ALTER COLUMN include_in_library SET DEFAULT true;

CREATE INDEX IF NOT EXISTS guides_brand_library_discovery_idx
  ON guides (brand_id, category, updated_at DESC)
  WHERE include_in_library IS TRUE
    AND status = 'published';
