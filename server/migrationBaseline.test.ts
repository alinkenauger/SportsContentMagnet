import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const baseline = readFileSync(
  new URL("../migrations/0000_core_baseline.sql", import.meta.url),
  "utf8",
);
const runner = readFileSync(new URL("./migrate.ts", import.meta.url), "utf8");

const legacyCoreTables = [
  "analytics_events",
  "brand_users",
  "branding_settings",
  "brands",
  "content_variants",
  "email_integrations",
  "email_templates",
  "file_cleanup_jobs",
  "google_connections",
  "guides",
  "knowledgebase_collections",
  "knowledgebase_entries",
  "knowledgebase_usage_settings",
  "landing_pages",
  "leads",
  "media_assets",
  "notifications",
  "personalization_profiles",
  "personalization_rules",
  "prompt_templates",
  "qr_codes",
  "sessions",
  "storage_billing",
  "storage_usage",
  "subscription_plans",
  "subscription_tiers",
  "training_settings",
  "user_subscriptions",
  "users",
] as const;

test("0000 is the complete additive pre-quiz schema baseline", () => {
  const createdTables = Array.from(
    baseline.matchAll(/CREATE TABLE IF NOT EXISTS "([^"]+)"/g),
    (match) => match[1],
  ).sort();

  assert.deepEqual(createdTables, [...legacyCoreTables].sort());
  assert.match(baseline, /fc9db9336fe320f210ce3d3f72351dba35feb801\^/);
  assert.match(baseline, /expected_count constant integer := 29/);
  assert.match(baseline, /present_count <> 0 AND present_count <> expected_count/);
  assert.match(baseline, /refusing automatic repair/);

  // These are the legacy handoff points consumed by migrations 0001 and 0002.
  assert.match(baseline, /"youtube_url" varchar NOT NULL/);
  assert.match(baseline, /"youtube_video_id" varchar NOT NULL/);
  assert.match(
    baseline,
    /CONSTRAINT "branding_settings_user_id_unique" UNIQUE\("user_id"\)/,
  );
  assert.doesNotMatch(baseline, /CREATE TABLE IF NOT EXISTS "(benefit_assets|quizzes|quiz_attempts)"/);
  assert.doesNotMatch(baseline, /"magnet_type"/);

  assert.doesNotMatch(baseline, /^\s*(DROP|TRUNCATE|DELETE|UPDATE|INSERT)\b/im);
  assert.doesNotMatch(baseline, /ALTER TABLE[^;]*\bDROP\b/i);
  assert.match(baseline, /CREATE INDEX IF NOT EXISTS "IDX_session_expire"/);
});

test("0000 foreign keys are replay-safe and preserve the legacy lifecycle rules", () => {
  const foreignKeys = Array.from(
    baseline.matchAll(/ADD CONSTRAINT "([^"]+)" FOREIGN KEY/g),
    (match) => match[1],
  );

  assert.ok(foreignKeys.length > 0);
  assert.equal(new Set(foreignKeys).size, foreignKeys.length);
  for (const constraint of foreignKeys) {
    assert.match(
      baseline,
      new RegExp(
        `WHERE conname = left\\('${constraint}', 63\\)[\\s\\S]*?ADD CONSTRAINT "${constraint}" FOREIGN KEY`,
      ),
    );
  }
  assert.match(
    baseline,
    /"brand_users_user_id_users_id_fk" FOREIGN KEY \("user_id"\)[^;]*ON DELETE cascade/,
  );
  assert.match(
    baseline,
    /"branding_settings_user_id_users_id_fk" FOREIGN KEY \("user_id"\)[^;]*ON DELETE no action/,
  );
});

test("the checksummed runner applies 0000 before every incremental migration", () => {
  const manifestStart = runner.indexOf("const migrations = [");
  const manifestEnd = runner.indexOf("] as const;", manifestStart);
  const manifest = runner.slice(manifestStart, manifestEnd);
  const ids = Array.from(
    manifest.matchAll(/id: "(\d{4}_[^"]+)"/g),
    (match) => match[1],
  );

  assert.deepEqual(ids, [
    "0000_core_baseline",
    "0001_quiz_lead_magnets",
    "0002_brand_scoped_appearance",
    "0003_magnet_presentation",
    "0004_brand_magnet_library",
    "0005_durable_brand_assets",
    "0006_guide_revision",
  ]);
  assert.match(runner, /import coreBaselineSql from "\.\.\/migrations\/0000_core_baseline\.sql"/);
  assert.match(runner, /const migrationChecksum = checksum\(migration\.sql\)/);
  assert.match(runner, /existing\.rows\[0\]\.checksum !== migrationChecksum/);
  assert.match(runner, /INSERT INTO vidmagnet_schema_migrations \(id, checksum\)/);
  assert.ok(
    runner.indexOf("SELECT pg_advisory_lock($1)") <
      runner.indexOf("CREATE TABLE IF NOT EXISTS vidmagnet_schema_migrations"),
    "the migration lock must serialize first-start migration table creation",
  );

  const digest = createHash("sha256").update(baseline).digest("hex");
  assert.match(digest, /^[a-f0-9]{64}$/);
});
