import { createHash } from "node:crypto";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import coreBaselineSql from "../migrations/0000_core_baseline.sql";
import quizLeadMagnetsSql from "../migrations/0001_quiz_lead_magnets.sql";
import brandScopedAppearanceSql from "../migrations/0002_brand_scoped_appearance.sql";
import magnetPresentationSql from "../migrations/0003_magnet_presentation.sql";
import brandMagnetLibrarySql from "../migrations/0004_brand_magnet_library.sql";
import durableBrandAssetsSql from "../migrations/0005_durable_brand_assets.sql";
import guideRevisionSql from "../migrations/0006_guide_revision.sql";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set before database migrations can run");
}

const migrations = [
  { id: "0000_core_baseline", sql: coreBaselineSql },
  { id: "0001_quiz_lead_magnets", sql: quizLeadMagnetsSql },
  { id: "0002_brand_scoped_appearance", sql: brandScopedAppearanceSql },
  { id: "0003_magnet_presentation", sql: magnetPresentationSql },
  { id: "0004_brand_magnet_library", sql: brandMagnetLibrarySql },
  { id: "0005_durable_brand_assets", sql: durableBrandAssetsSql },
  { id: "0006_guide_revision", sql: guideRevisionSql },
] as const;

const MIGRATION_LOCK_ID = 860_792_957;
const pool = new Pool({ connectionString });

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    lockAcquired = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS vidmagnet_schema_migrations (
        id varchar(160) PRIMARY KEY,
        checksum varchar(64) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const migration of migrations) {
      const migrationChecksum = checksum(migration.sql);
      const existing = await client.query<{ checksum: string }>(
        "SELECT checksum FROM vidmagnet_schema_migrations WHERE id = $1",
        [migration.id],
      );

      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== migrationChecksum) {
          throw new Error(
            `Migration ${migration.id} changed after it was applied; refusing to start`,
          );
        }
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO vidmagnet_schema_migrations (id, checksum) VALUES ($1, $2)",
          [migration.id, migrationChecksum],
        );
        await client.query("COMMIT");
        console.info(`Applied database migration ${migration.id}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    if (lockAcquired) {
      await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
    }
    client.release();
  }
}

async function main(): Promise<void> {
  try {
    await runMigrations();
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
});
