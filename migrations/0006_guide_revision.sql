-- Optimistic concurrency token for Guide authoring and publish transitions.
-- Integer revisions round-trip exactly across PostgreSQL and JavaScript,
-- unlike timestamp microseconds.

ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS revision integer;

UPDATE guides
SET revision = 0
WHERE revision IS NULL;

ALTER TABLE guides
  ALTER COLUMN revision SET DEFAULT 0,
  ALTER COLUMN revision SET NOT NULL;
