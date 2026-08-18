import { createHash } from "node:crypto";
import { mkdir, open, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const MAX_BRAND_ASSET_BYTES = 5 * 1024 * 1024;
export const MAX_BRAND_ASSETS_PER_OWNER = 64;
export const MAX_BRAND_ASSET_TOTAL_BYTES_PER_OWNER = 64 * 1024 * 1024;
export const BRAND_ASSET_URL_PREFIX = "/uploads/branding";

const ASSET_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;
const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type BrandAssetOwner = {
  ownerUserId: string;
  brandId: number | null;
};

export type BrandAssetWrite = BrandAssetOwner & {
  key: string;
  contentType: string;
  content: Buffer;
};

export type StoredBrandAsset = {
  key: string;
  contentType: string;
  content: Buffer;
  byteSize: number;
  sha256: string;
};

export interface BrandAssetStore {
  readonly mode: "database" | "filesystem";
  put(asset: BrandAssetWrite): Promise<string>;
  get(key: string): Promise<StoredBrandAsset | null>;
}

export type BrandAssetSqlClient = {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }>;
  transaction?<T>(work: (client: BrandAssetSqlClient) => Promise<T>): Promise<T>;
};

export class BrandAssetStorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrandAssetStorageConfigurationError";
  }
}

export class BrandAssetQuotaError extends Error {
  constructor() {
    super("Brand asset storage quota reached");
    this.name = "BrandAssetQuotaError";
  }
}

function assertAssetKey(key: string): void {
  if (!ASSET_KEY_PATTERN.test(key)) {
    throw new Error("Invalid brand asset key");
  }
}

function assertAssetWrite(asset: BrandAssetWrite): void {
  assertAssetKey(asset.key);
  if (!ALLOWED_CONTENT_TYPES.has(asset.contentType)) {
    throw new Error("Unsupported brand asset content type");
  }
  if (!asset.ownerUserId.trim()) {
    throw new Error("Brand asset owner is required");
  }
  if (asset.brandId !== null && (!Number.isSafeInteger(asset.brandId) || asset.brandId <= 0)) {
    throw new Error("Invalid brand asset brand ID");
  }
  if (asset.content.length === 0 || asset.content.length > MAX_BRAND_ASSET_BYTES) {
    throw new Error(`Brand assets must be between 1 and ${MAX_BRAND_ASSET_BYTES} bytes`);
  }
}

function publicAssetUrl(key: string): string {
  return `${BRAND_ASSET_URL_PREFIX}/${key}`;
}

function checksum(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

class DatabaseBrandAssetStore implements BrandAssetStore {
  readonly mode = "database" as const;

  constructor(private readonly client: BrandAssetSqlClient) {}

  async put(asset: BrandAssetWrite): Promise<string> {
    assertAssetWrite(asset);
    if (!this.client.transaction) {
      throw new BrandAssetStorageConfigurationError(
        "Database brand asset writes require transaction support",
      );
    }
    const digest = checksum(asset.content);
    await this.client.transaction(async (transaction) => {
      await transaction.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
        [asset.ownerUserId],
      );
      const usage = await transaction.query(
        `SELECT COUNT(*)::integer AS asset_count,
                COALESCE(SUM(byte_size), 0)::bigint AS total_bytes
         FROM brand_assets
         WHERE owner_user_id = $1`,
        [asset.ownerUserId],
      );
      const assetCount = Number(usage.rows[0]?.asset_count ?? 0);
      const totalBytes = Number(usage.rows[0]?.total_bytes ?? 0);
      if (
        !Number.isSafeInteger(assetCount) ||
        !Number.isSafeInteger(totalBytes) ||
        assetCount >= MAX_BRAND_ASSETS_PER_OWNER ||
        totalBytes + asset.content.length > MAX_BRAND_ASSET_TOTAL_BYTES_PER_OWNER
      ) {
        throw new BrandAssetQuotaError();
      }

      const result = await transaction.query(
        `INSERT INTO brand_assets
        (asset_key, owner_user_id, brand_id, content_type, byte_size, content_sha256, content)
       VALUES ($1, $2, $3, $4, $5::integer, $6, $7)
       ON CONFLICT (asset_key) DO NOTHING
       RETURNING asset_key`,
        [
          asset.key,
          asset.ownerUserId,
          asset.brandId,
          asset.contentType,
          asset.content.length,
          digest,
          asset.content,
        ],
      );
      if (result.rows.length !== 1) throw new Error("Brand asset key collision");
    });
    return publicAssetUrl(asset.key);
  }

  async get(key: string): Promise<StoredBrandAsset | null> {
    if (!ASSET_KEY_PATTERN.test(key)) return null;
    const result = await this.client.query(
      `SELECT asset_key, content_type, byte_size, content_sha256, content
       FROM brand_assets
       WHERE asset_key = $1`,
      [key],
    );
    const row = result.rows[0];
    if (!row) return null;

    const content = Buffer.isBuffer(row.content)
      ? row.content
      : row.content instanceof Uint8Array ? Buffer.from(row.content) : null;
    if (
      !content ||
      typeof row.content_type !== "string" ||
      !ALLOWED_CONTENT_TYPES.has(row.content_type) ||
      typeof row.byte_size !== "number" ||
      typeof row.content_sha256 !== "string" ||
      content.length !== row.byte_size ||
      !/^[a-f0-9]{64}$/.test(row.content_sha256) ||
      checksum(content) !== row.content_sha256
    ) {
      throw new Error("Stored brand asset is invalid");
    }

    return {
      key,
      contentType: row.content_type,
      content,
      byteSize: row.byte_size,
      sha256: row.content_sha256,
    };
  }
}

class FilesystemBrandAssetStore implements BrandAssetStore {
  readonly mode = "filesystem" as const;

  constructor(private readonly rootDirectory: string) {}

  private filePath(key: string): string {
    assertAssetKey(key);
    return path.join(this.rootDirectory, key);
  }

  async put(asset: BrandAssetWrite): Promise<string> {
    assertAssetWrite(asset);
    await mkdir(this.rootDirectory, { recursive: true });
    const file = await open(this.filePath(asset.key), "wx");
    try {
      await file.writeFile(asset.content);
    } finally {
      await file.close();
    }
    return publicAssetUrl(asset.key);
  }

  async get(key: string): Promise<StoredBrandAsset | null> {
    if (!ASSET_KEY_PATTERN.test(key)) return null;
    try {
      const filePath = this.filePath(key);
      const [content, fileStats] = await Promise.all([readFile(filePath), stat(filePath)]);
      if (!fileStats.isFile() || content.length === 0 || content.length > MAX_BRAND_ASSET_BYTES) {
        return null;
      }
      const extension = path.extname(key).toLowerCase();
      const contentType = extension === ".png"
        ? "image/png"
        : extension === ".jpg" || extension === ".jpeg"
          ? "image/jpeg"
          : extension === ".webp" ? "image/webp" : null;
      if (!contentType) return null;
      return {
        key,
        contentType,
        content,
        byteSize: content.length,
        sha256: checksum(content),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
}

export function createBrandAssetStore({
  environment = process.env,
  cwd = process.cwd(),
  database,
}: {
  environment?: NodeJS.ProcessEnv;
  cwd?: string;
  database?: BrandAssetSqlClient;
} = {}): BrandAssetStore {
  const production = environment.NODE_ENV === "production";
  const configuredMode = environment.BRAND_ASSET_STORAGE?.trim().toLowerCase();
  const mode = configuredMode || (production ? "database" : "filesystem");

  if (mode === "database") {
    if (!database) {
      throw new BrandAssetStorageConfigurationError(
        "BRAND_ASSET_STORAGE=database requires the PostgreSQL client",
      );
    }
    return new DatabaseBrandAssetStore(database);
  }

  if (mode !== "filesystem") {
    throw new BrandAssetStorageConfigurationError(
      "BRAND_ASSET_STORAGE must be database or filesystem",
    );
  }

  const configuredDirectory = environment.BRAND_ASSET_FILESYSTEM_DIR?.trim();
  const rootDirectory = configuredDirectory
    ? path.resolve(cwd, configuredDirectory)
    : path.join(cwd, "public", "uploads", "branding");

  if (production) {
    if (
      environment.BRAND_ASSET_FILESYSTEM_IS_DURABLE !== "true" ||
      !configuredDirectory ||
      !path.isAbsolute(configuredDirectory)
    ) {
      throw new BrandAssetStorageConfigurationError(
        "Production filesystem brand assets require an absolute BRAND_ASSET_FILESYSTEM_DIR " +
        "on shared persistent storage and BRAND_ASSET_FILESYSTEM_IS_DURABLE=true",
      );
    }
  }

  return new FilesystemBrandAssetStore(rootDirectory);
}
