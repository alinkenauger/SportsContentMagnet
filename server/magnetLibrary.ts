import { randomUUID } from "crypto";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";

import { toPublicBrandAppearance } from "@shared/branding";
import {
  createLibrarySlug,
  libraryPath,
  librarySlugSchema,
  type LibraryContext,
  type PublicLibraryItem,
  type PublicLibraryQuery,
  type PublicMagnetLibrary,
} from "@shared/library";
import { brands, guides, landingPages, quizzes } from "@shared/schema";
import { assertBrandAccess } from "./brandAccess";
import { resolveAppearanceForScope } from "./brandAppearance";
import { db } from "./db";
import {
  buildLibraryKnowledgeContext,
  type LibraryKnowledgeQuery,
  type PreparedLibraryKnowledge,
} from "./services/libraryKnowledge";

type PublicLibraryCandidate = {
  id: number;
  magnetType: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  thumbnailUrl: string | null;
  createdAt: Date | null;
  landingCustomUrl: string | null;
};

type ProjectedLibraryItems = Pick<PublicMagnetLibrary, "items" | "categories" | "total">;
const MAX_LIBRARY_KNOWLEDGE_CANDIDATES = 200;

function safePublicImageUrl(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (
    trimmed.length === 0
    || trimmed.length > 2048
    || /[\u0000-\u001F\u007F]/.test(trimmed)
  ) return null;
  if (trimmed.startsWith("/uploads/")) {
    return /^\/uploads\/[A-Za-z0-9][A-Za-z0-9._/-]{0,500}$/.test(trimmed)
      && !trimmed.includes("..")
      && !trimmed.includes("//")
      ? trimmed
      : null;
  }
  try {
    const url = new URL(trimmed);
    return (url.protocol === "https:" || url.protocol === "http:")
      && !url.username
      && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function cleanTags(tags: string[] | null): string[] {
  return Array.from(new Set((tags || [])
    .map((tag) => cleanPublicText(tag, 80))
    .filter((tag) => tag.length > 0)))
    .slice(0, 24);
}

function cleanPublicText(value: string | null | undefined, maxLength: number): string {
  return (value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function projectCandidate(candidate: PublicLibraryCandidate): PublicLibraryItem | null {
  const type = candidate.magnetType === "quiz"
    ? "quiz"
    : candidate.magnetType === "guide"
      ? "guide"
      : null;
  const customUrl = candidate.landingCustomUrl?.trim();
  if (!type || !customUrl) return null;
  if (type === "quiz" && !/^[A-Za-z0-9_-]{1,255}$/.test(customUrl)) return null;

  return {
    id: candidate.id,
    type,
    title: cleanPublicText(candidate.title, 240) || "Untitled magnet",
    description: cleanPublicText(candidate.description, 1_000),
    category: cleanPublicText(candidate.category, 100) || "Uncategorized",
    tags: cleanTags(candidate.tags),
    thumbnailUrl: safePublicImageUrl(candidate.thumbnailUrl),
    createdAt: candidate.createdAt?.toISOString() || null,
    href: type === "quiz"
      ? `/quiz/${encodeURIComponent(customUrl)}`
      : `/guide/${candidate.id}`,
  };
}

/**
 * Applies user-controlled filters after the database has selected only safe,
 * discoverable columns. Keeping this transformation pure makes projection and
 * search behavior straightforward to test without a database fixture.
 */
export function projectPublicLibraryItems(
  candidates: PublicLibraryCandidate[],
  query: PublicLibraryQuery,
): ProjectedLibraryItems {
  const deduplicated = new Map<number, PublicLibraryItem>();
  for (const candidate of candidates) {
    if (deduplicated.has(candidate.id)) continue;
    const item = projectCandidate(candidate);
    if (item) deduplicated.set(item.id, item);
  }

  const search = query.search?.toLowerCase();
  const category = query.category?.toLowerCase();
  const searched = Array.from(deduplicated.values()).filter((item) => {
    if (query.type && item.type !== query.type) return false;
    if (!search) return true;
    return [item.title, item.description, item.category, ...item.tags]
      .some((value) => value.toLowerCase().includes(search));
  });

  const categoryCounts = new Map<string, { name: string; count: number }>();
  for (const item of searched) {
    const key = item.category.toLowerCase();
    const current = categoryCounts.get(key);
    categoryCounts.set(key, {
      name: current?.name || item.category,
      count: (current?.count || 0) + 1,
    });
  }

  const items = category
    ? searched.filter((item) => item.category.toLowerCase() === category)
    : searched;

  return {
    items,
    categories: Array.from(categoryCounts.values())
      .sort((a, b) => a.name.localeCompare(b.name)),
    total: items.length,
  };
}

function contextFromSlug(slug: string): LibraryContext {
  const parsedSlug = librarySlugSchema.parse(slug);
  return { slug: parsedSlug, path: libraryPath(parsedSlug) };
}

async function provisionBrandLibrarySlug(
  brandId: number,
): Promise<{ library: LibraryContext; created: boolean }> {
  const [brand] = await db.select().from(brands).where(eq(brands.id, brandId));
  if (!brand) {
    // assertBrandAccess normally handles this, but keep the lookup fail-closed.
    throw new Error("Brand not found");
  }
  if (brand.librarySlug) {
    return { library: contextFromSlug(brand.librarySlug), created: false };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = createLibrarySlug(
      brand.name,
      `${brand.id.toString(36)}${randomUUID().replace(/-/g, "")}`,
    );
    try {
      const [updated] = await db.update(brands).set({
        librarySlug: candidate,
        updatedAt: new Date(),
      }).where(and(eq(brands.id, brandId), isNull(brands.librarySlug))).returning({
        librarySlug: brands.librarySlug,
      });

      if (updated?.librarySlug) {
        return { library: contextFromSlug(updated.librarySlug), created: true };
      }

      // A concurrent request may have provisioned the library first.
      const [settled] = await db.select({ librarySlug: brands.librarySlug })
        .from(brands)
        .where(eq(brands.id, brandId));
      if (settled?.librarySlug) {
        return { library: contextFromSlug(settled.librarySlug), created: false };
      }
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
      if (code !== "23505" || attempt === 2) throw error;
    }
  }

  throw new Error("Unable to provision the Magnet Library");
}

/** Explicit brand administration endpoint; an existing slug is never changed. */
export async function provisionBrandLibrary(
  userId: string,
  brandId: number,
): Promise<{ library: LibraryContext; created: boolean }> {
  await assertBrandAccess(userId, brandId, "manage_brand");
  return provisionBrandLibrarySlug(brandId);
}

/**
 * Creating or opting a magnet into a brand Library is itself an explicit
 * content action. Editors may therefore initialize the stable slug after the
 * same write-content authorization used for that magnet mutation.
 */
export async function ensureBrandLibraryForWriter(
  userId: string,
  brandId: number,
): Promise<{ library: LibraryContext; created: boolean }> {
  await assertBrandAccess(userId, brandId, "write_content");
  return provisionBrandLibrarySlug(brandId);
}

export async function getPublicMagnetLibrary(
  slug: string,
  query: PublicLibraryQuery,
): Promise<PublicMagnetLibrary | null> {
  const parsedSlug = librarySlugSchema.parse(slug);
  const [brand] = await db.select({
    id: brands.id,
    userId: brands.userId,
    name: brands.name,
    librarySlug: brands.librarySlug,
  }).from(brands).where(eq(brands.librarySlug, parsedSlug));
  if (!brand?.librarySlug) return null;

  const candidates = await db.select({
    id: guides.id,
    magnetType: guides.magnetType,
    title: guides.title,
    description: guides.description,
    category: guides.category,
    tags: guides.tags,
    thumbnailUrl: guides.thumbnailUrl,
    createdAt: guides.createdAt,
    landingCustomUrl: landingPages.customUrl,
  })
    .from(guides)
    .innerJoin(landingPages, eq(landingPages.guideId, guides.id))
    .where(and(
      eq(guides.brandId, brand.id),
      eq(guides.includeInLibrary, true),
      eq(guides.status, "published"),
      eq(landingPages.isActive, true),
      isNotNull(landingPages.customUrl),
    ))
    .orderBy(desc(guides.createdAt), desc(landingPages.updatedAt));

  const appearance = toPublicBrandAppearance(
    await resolveAppearanceForScope(brand.userId, brand.id),
  );
  const projection = projectPublicLibraryItems(candidates, query);
  const context = contextFromSlug(brand.librarySlug);

  return {
    library: {
      ...context,
      name: brand.name,
      // Brand descriptions are authored as private workspace notes. Reuse
      // only the explicitly public tagline until Library-specific copy exists.
      description: appearance.tagline || null,
      branding: appearance,
    },
    ...projection,
  };
}

/**
 * Public pages advertise a Library button only when this exact magnet is
 * currently discoverable through an active brand library.
 */
export async function resolvePublicLibraryContextForGuide(
  guideId: number,
): Promise<LibraryContext | null> {
  const [row] = await db.select({ librarySlug: brands.librarySlug })
    .from(guides)
    .innerJoin(brands, eq(guides.brandId, brands.id))
    .innerJoin(landingPages, eq(landingPages.guideId, guides.id))
    .where(and(
      eq(guides.id, guideId),
      eq(guides.includeInLibrary, true),
      eq(guides.status, "published"),
      eq(landingPages.isActive, true),
      isNotNull(landingPages.customUrl),
      isNotNull(brands.librarySlug),
    ));

  return row?.librarySlug
    ? contextFromSlug(row.librarySlug)
    : null;
}

/**
 * Loads a bounded, tenant-authorized set of real library magnets and delegates
 * prompt hardening, relevance ranking, and final character limits to the
 * library-knowledge service. Personal workspaces intentionally return no
 * context because Magnet Libraries are brand-owned public surfaces.
 */
export async function prepareBrandLibraryKnowledge(params: {
  userId: string;
  brandId: number | null;
  query?: LibraryKnowledgeQuery;
  currentMagnet?: { type: "guide" | "quiz"; id: number | string } | null;
}): Promise<PreparedLibraryKnowledge> {
  if (params.brandId === null) {
    return { prompt: "", sources: [], charCount: 0 };
  }
  await assertBrandAccess(params.userId, params.brandId, "read");

  const rows = await db.select({
    id: guides.id,
    type: guides.magnetType,
    userId: guides.userId,
    brandId: guides.brandId,
    status: guides.status,
    includeInLibrary: guides.includeInLibrary,
    title: guides.title,
    description: guides.description,
    category: guides.category,
    tags: guides.tags,
    guideContent: guides.content,
    quizQuestions: quizzes.questions,
    quizOutcomes: quizzes.outcomes,
    updatedAt: guides.updatedAt,
  })
    .from(guides)
    .innerJoin(brands, eq(guides.brandId, brands.id))
    .innerJoin(landingPages, eq(landingPages.guideId, guides.id))
    .leftJoin(quizzes, eq(quizzes.guideId, guides.id))
    .where(and(
      eq(guides.brandId, params.brandId),
      eq(guides.includeInLibrary, true),
      eq(guides.status, "published"),
      eq(landingPages.isActive, true),
      isNotNull(landingPages.customUrl),
      isNotNull(brands.librarySlug),
    ))
    .orderBy(desc(guides.updatedAt), desc(landingPages.updatedAt))
    .limit(MAX_LIBRARY_KNOWLEDGE_CANDIDATES);

  const candidates = new Map<number, Parameters<typeof buildLibraryKnowledgeContext>[1][number]>();
  for (const row of rows) {
    if (candidates.has(row.id)) continue;
    const type = row.type === "quiz" ? "quiz" : row.type === "guide" ? "guide" : null;
    if (!type) continue;
    candidates.set(row.id, {
      id: row.id,
      type,
      userId: row.userId,
      brandId: row.brandId,
      status: row.status,
      includeInLibrary: row.includeInLibrary,
      title: row.title,
      description: row.description,
      category: row.category,
      tags: row.tags,
      body: type === "quiz"
        ? { questions: row.quizQuestions || [], outcomes: row.quizOutcomes || [] }
        : row.guideContent,
      publishedAt: row.updatedAt,
    });
  }

  return buildLibraryKnowledgeContext({
    userId: params.userId,
    brandId: params.brandId,
    currentMagnet: params.currentMagnet,
    query: params.query,
  }, Array.from(candidates.values()));
}
