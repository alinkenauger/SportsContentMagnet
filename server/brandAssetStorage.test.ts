import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BRAND_ASSET_URL_PREFIX,
  BrandAssetQuotaError,
  MAX_BRAND_ASSETS_PER_OWNER,
  MAX_BRAND_ASSET_TOTAL_BYTES_PER_OWNER,
  BrandAssetStorageConfigurationError,
  createBrandAssetStore,
  type BrandAssetSqlClient,
} from "./brandAssetStorage";

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  Buffer.from("brand-asset"),
]);

function environment(values: Record<string, string>): NodeJS.ProcessEnv {
  return { ...values };
}

test("production defaults to the shared PostgreSQL brand asset store", () => {
  const database = { query: async () => ({ rows: [] }) } satisfies BrandAssetSqlClient;
  const store = createBrandAssetStore({
    environment: environment({ NODE_ENV: "production" }),
    database,
  });

  assert.equal(store.mode, "database");
});

test("production filesystem mode fails closed without an explicit durable absolute mount", () => {
  assert.throws(
    () => createBrandAssetStore({
      environment: environment({
        NODE_ENV: "production",
        BRAND_ASSET_STORAGE: "filesystem",
        BRAND_ASSET_FILESYSTEM_DIR: "public/uploads/branding",
      }),
    }),
    BrandAssetStorageConfigurationError,
  );

  const configured = createBrandAssetStore({
    environment: environment({
      NODE_ENV: "production",
      BRAND_ASSET_STORAGE: "filesystem",
      BRAND_ASSET_FILESYSTEM_DIR: "/var/lib/vidmagnet/brand-assets",
      BRAND_ASSET_FILESYSTEM_IS_DURABLE: "true",
    }),
  });
  assert.equal(configured.mode, "filesystem");
});

test("development filesystem fallback round-trips an immutable public asset", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "vidmagnet-brand-assets-"));
  try {
    const store = createBrandAssetStore({
      environment: environment({
        NODE_ENV: "development",
        BRAND_ASSET_STORAGE: "filesystem",
        BRAND_ASSET_FILESYSTEM_DIR: root,
      }),
    });
    const key = "wordmark-123-test.png";
    const url = await store.put({
      key,
      ownerUserId: "user-1",
      brandId: 42,
      contentType: "image/png",
      content: png,
    });
    const stored = await store.get(key);

    assert.equal(url, `${BRAND_ASSET_URL_PREFIX}/${key}`);
    assert.equal(stored?.contentType, "image/png");
    assert.deepEqual(stored?.content, png);
    assert.match(stored?.sha256 || "", /^[a-f0-9]{64}$/);
    assert.equal(await store.get("../private.txt"), null);
    await assert.rejects(() => store.put({
      key,
      ownerUserId: "user-1",
      brandId: 42,
      contentType: "image/png",
      content: png,
    }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("database mode persists ownership, type, bytes, and checksum with parameters", async () => {
  let inserted: unknown[] | undefined;
  const database: BrandAssetSqlClient = {
    async query(text, values) {
      if (text.includes("INSERT INTO brand_assets")) {
        inserted = values;
        return { rows: [{ asset_key: values?.[0] }] };
      }
      return {
        rows: [{
          asset_key: "mark-123-test.webp",
          content_type: "image/webp",
          byte_size: png.length,
          content_sha256: inserted?.[5],
          content: png,
        }],
      };
    },
    async transaction(work) {
      return await work(this);
    },
  };
  const store = createBrandAssetStore({
    environment: environment({ NODE_ENV: "production" }),
    database,
  });
  const key = "mark-123-test.webp";

  assert.equal(await store.put({
    key,
    ownerUserId: "owner-1",
    brandId: null,
    contentType: "image/webp",
    content: png,
  }), `${BRAND_ASSET_URL_PREFIX}/${key}`);
  assert.equal(inserted?.[0], key);
  assert.equal(inserted?.[1], "owner-1");
  assert.equal(inserted?.[2], null);
  assert.equal(inserted?.[3], "image/webp");
  assert.equal(inserted?.[4], png.length);
  assert.match(String(inserted?.[5]), /^[a-f0-9]{64}$/);
  assert.deepEqual(inserted?.[6], png);
  assert.deepEqual((await store.get(key))?.content, png);
});

test("database mode serializes and bounds aggregate owner storage", async () => {
  const statements: string[] = [];
  const database: BrandAssetSqlClient = {
    async query(text) {
      statements.push(text);
      if (text.includes("COUNT(*)::integer")) {
        return {
          rows: [{
            asset_count: MAX_BRAND_ASSETS_PER_OWNER,
            total_bytes: MAX_BRAND_ASSET_TOTAL_BYTES_PER_OWNER,
          }],
        };
      }
      return { rows: [] };
    },
    async transaction(work) {
      return await work(this);
    },
  };
  const store = createBrandAssetStore({
    environment: environment({ NODE_ENV: "production" }),
    database,
  });

  await assert.rejects(() => store.put({
    key: "wordmark-quota.png",
    ownerUserId: "owner-quota",
    brandId: 16,
    contentType: "image/png",
    content: png,
  }), BrandAssetQuotaError);
  assert.match(statements[0], /pg_advisory_xact_lock/);
  assert.match(statements[1], /COUNT\(\*\)::integer AS asset_count/);
  assert.equal(statements.some((statement) => statement.includes("INSERT INTO brand_assets")), false);
});

test("durable asset migration and public route enforce the production contract", () => {
  const migration = readFileSync(
    new URL("../migrations/0005_durable_brand_assets.sql", import.meta.url),
    "utf8",
  );
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS brand_assets/);
  assert.match(migration, /content bytea NOT NULL/);
  assert.match(migration, /octet_length\(content\) = byte_size/);
  assert.match(migration, /byte_size <= 5242880/);
  assert.match(migration, /ON DELETE CASCADE/);
  assert.match(routes, /brandAssetStore\.put\(\{/);
  assert.match(routes, /brandAssetUploadRateLimit/);
  assert.match(routes, /brand_asset_quota_reached/);
  assert.match(routes, /Cache-Control": "public, max-age=31536000, immutable"/);
  assert.match(routes, /X-Content-Type-Options": "nosniff"/);
});
