-- Small public brand images must survive autoscale restarts and be available
-- from every application replica. PostgreSQL is already required by the app,
-- so production stores the processed image bytes here instead of relying on
-- an ephemeral container filesystem.

CREATE TABLE IF NOT EXISTS brand_assets (
  asset_key varchar(255) PRIMARY KEY,
  owner_user_id varchar NOT NULL,
  brand_id integer,
  content_type varchar(32) NOT NULL,
  byte_size integer NOT NULL,
  content_sha256 char(64) NOT NULL,
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_assets_owner_user_id_users_id_fk
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT brand_assets_brand_id_brands_id_fk
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  CONSTRAINT brand_assets_content_type_check
    CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
  CONSTRAINT brand_assets_byte_size_check
    CHECK (byte_size > 0 AND byte_size <= 5242880),
  CONSTRAINT brand_assets_content_size_check
    CHECK (octet_length(content) = byte_size),
  CONSTRAINT brand_assets_sha256_check
    CHECK (content_sha256 ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS brand_assets_owner_created_idx
  ON brand_assets (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS brand_assets_brand_created_idx
  ON brand_assets (brand_id, created_at DESC)
  WHERE brand_id IS NOT NULL;
