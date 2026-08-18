import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createLibrarySlug,
  includeInLibraryInputSchema,
  isIncludedInLibrary,
  libraryInclusionUpdateSchema,
  publicLibraryQuerySchema,
} from "@shared/library";
import { generateQuizRequestSchema, updateQuizRequestSchema } from "@shared/quiz";
import { insertBrandSchema, insertGuideSchema } from "@shared/schema";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/vidmagnet_test";
const { projectPublicLibraryItems } = await import("./magnetLibrary");

test("library request contracts normalize only explicit booleans and bound public filters", () => {
  assert.equal(includeInLibraryInputSchema.parse(true), true);
  assert.equal(includeInLibraryInputSchema.parse("false"), false);
  assert.throws(() => includeInLibraryInputSchema.parse("yes"));
  assert.deepEqual(libraryInclusionUpdateSchema.parse({ includeInLibrary: "true" }), {
    includeInLibrary: true,
  });
  assert.deepEqual(publicLibraryQuerySchema.parse({
    search: "  shooting  ",
    category: " Basketball ",
    type: "guide",
  }), {
    search: "shooting",
    category: "Basketball",
    type: "guide",
  });
  assert.throws(() => publicLibraryQuerySchema.parse({ search: ["one", "two"] }));
  assert.throws(() => publicLibraryQuerySchema.parse({ internal: "content" }));
});

test("legacy null inclusion stays private while new write schemas reject null and slug injection", () => {
  assert.equal(isIncludedInLibrary(true), true);
  assert.equal(isIncludedInLibrary(false), false);
  assert.equal(isIncludedInLibrary(null), false);
  assert.equal(isIncludedInLibrary(undefined), false);

  const brand = insertBrandSchema.parse({
    userId: "user-1",
    name: "Stable Brand",
    librarySlug: "caller-controlled-123",
  });
  assert.equal("librarySlug" in brand, false);

  assert.throws(() => insertGuideSchema.parse({
    userId: "user-1",
    title: "New guide",
    presentationProfile: { version: 1, mode: "auto", preset: "editorial" },
    includeInLibrary: null,
  }));
});

test("quiz creation and updates accept the raw library preference without nesting it", () => {
  const generated = generateQuizRequestSchema.parse({
    title: "Find your next workout",
    sourceContent: "A detailed source about basketball development, practice decisions, and player progress.".repeat(2),
    questionCount: 5,
    outcomeCount: 3,
    includeInLibrary: "false",
  });
  assert.equal(generated.includeInLibrary, false);
  assert.equal(generateQuizRequestSchema.parse({
    title: "Default library quiz",
    sourceContent: "A useful source with enough grounded detail for an Interactive Quiz and recommendations.".repeat(2),
    questionCount: 5,
    outcomeCount: 2,
  }).includeInLibrary, true);
  assert.deepEqual(updateQuizRequestSchema.parse({ includeInLibrary: "true" }), {
    includeInLibrary: true,
  });
});

test("public library projection is deduplicated, searchable, categorized, typed, and minimal", () => {
  const candidates: Parameters<typeof projectPublicLibraryItems>[0] = [
    {
      id: 11,
      magnetType: "guide",
      title: "Build a repeatable release",
      description: "A three-day workout",
      category: "Basketball",
      tags: ["shooting", "form", "shooting"],
      thumbnailUrl: "javascript:alert(1)",
      createdAt: new Date("2026-08-01T12:00:00.000Z"),
      landingCustomUrl: "release-guide",
    },
    {
      id: 11,
      magnetType: "guide",
      title: "Duplicate landing row",
      description: null,
      category: "Other",
      tags: [],
      thumbnailUrl: null,
      createdAt: null,
      landingCustomUrl: "duplicate",
    },
    {
      id: 12,
      magnetType: "quiz",
      title: "What is limiting your follow-through?",
      description: "Get a focused next step.",
      category: "Basketball",
      tags: ["diagnostic"],
      thumbnailUrl: "https://i.ytimg.com/vi/example/hqdefault.jpg",
      createdAt: new Date("2026-08-02T12:00:00.000Z"),
      landingCustomUrl: "follow-through",
    },
    {
      id: 13,
      magnetType: "guide",
      title: "No active URL",
      description: "Must not project",
      category: "Basketball",
      tags: [],
      thumbnailUrl: null,
      createdAt: null,
      landingCustomUrl: null,
    },
  ];

  const all = projectPublicLibraryItems(candidates, {});
  assert.equal(all.total, 2);
  assert.deepEqual(all.categories, [{ name: "Basketball", count: 2 }]);
  assert.deepEqual(Object.keys(all.items[0]).sort(), [
    "category",
    "createdAt",
    "description",
    "href",
    "id",
    "tags",
    "thumbnailUrl",
    "title",
    "type",
  ]);
  assert.equal(all.items[0].thumbnailUrl, null);
  assert.equal(all.items[0].href, "/guide/11");
  assert.equal(all.items[1].href, "/quiz/follow-through");

  const searched = projectPublicLibraryItems(candidates, { search: "shooting" });
  assert.deepEqual(searched.items.map((item) => item.id), [11]);
  const quizzes = projectPublicLibraryItems(candidates, {
    category: "basketball",
    type: "quiz",
  });
  assert.deepEqual(quizzes.items.map((item) => item.id), [12]);

  const unsafeUpload = projectPublicLibraryItems([{
    ...candidates[0],
    id: 99,
    thumbnailUrl: "/uploads/../private.txt",
  }], {});
  assert.equal(unsafeUpload.items[0].thumbnailUrl, null);
});

test("library migration preserves legacy privacy while opting only future inserts in", () => {
  const migration = readFileSync(
    new URL("../migrations/0004_brand_magnet_library.sql", import.meta.url),
    "utf8",
  );
  const addColumn = migration.indexOf("ADD COLUMN IF NOT EXISTS include_in_library boolean");
  const setDefault = migration.indexOf("ALTER COLUMN include_in_library SET DEFAULT true");
  assert.ok(addColumn >= 0 && setDefault > addColumn);
  assert.doesNotMatch(migration, /UPDATE\s+guides[\s\S]*include_in_library/i);
  assert.match(migration, /WHERE include_in_library IS TRUE\s+AND status = 'published'/);
  assert.doesNotMatch(migration, /UPDATE\s+brands[\s\S]*library_slug/i);
});

test("library mutation routes are authenticated and enforce tenant-aware permissions", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const quizStorage = readFileSync(new URL("./quizStorage.ts", import.meta.url), "utf8");
  const inclusionStart = routes.indexOf("app.patch('/api/guides/:id/library', isAuthenticated");
  const inclusionEnd = routes.indexOf("// PDF download route", inclusionStart);
  const inclusionRoute = routes.slice(inclusionStart, inclusionEnd);
  assert.ok(inclusionStart >= 0 && inclusionEnd > inclusionStart);
  assert.match(inclusionRoute, /assertGuideAccess\(userId, guide, "write_content"\)/);
  assert.match(inclusionRoute, /libraryInclusionUpdateSchema\.parse\(req\.body\)/);

  const provisionStart = routes.indexOf("app.post('/api/brands/:id/library', isAuthenticated");
  const provisionEnd = routes.indexOf("app.post('/api/brands/:id/set-current'", provisionStart);
  const provisionRoute = routes.slice(provisionStart, provisionEnd);
  assert.ok(provisionStart >= 0 && provisionEnd > provisionStart);
  assert.match(provisionRoute, /provisionBrandLibrary\(userId, brandId\)/);
  assert.match(routes, /app\.get\('\/api\/public\/libraries\/:slug'/);
  assert.match(routes, /guide\.includeInLibrary === true[\s\S]*ensureBrandLibraryForWriter\(userId, guide\.brandId\)/);
  assert.match(inclusionRoute, /ensureBrandLibraryForWriter\(userId, updated\.brandId\)/);
  assert.match(quizStorage, /\(params\.includeInLibrary \?\? true\)[\s\S]*ensureBrandLibraryForWriter\(params\.userId, brandId\)/);
  assert.match(quizStorage, /if \(includeInLibrary[\s\S]*ensureBrandLibraryForWriter\(userId, bundle\.guide\.brandId\)/);
});

test("legacy public discovery honors Library opt-out and keeps workspace notes private", () => {
  const storageSource = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
  const globalCatalogStart = storageSource.indexOf("async getPublicGuides()");
  const globalCatalogEnd = storageSource.indexOf("// Landing page operations", globalCatalogStart);
  const globalCatalog = storageSource.slice(globalCatalogStart, globalCatalogEnd);
  assert.ok(globalCatalogStart >= 0 && globalCatalogEnd > globalCatalogStart);
  assert.match(globalCatalog, /eq\(guides\.includeInLibrary, true\)/);
  assert.match(globalCatalog, /eq\(landingPages\.isActive, true\)/);
  assert.match(globalCatalog, /isNotNull\(brands\.librarySlug\)/);

  const librarySource = readFileSync(new URL("./magnetLibrary.ts", import.meta.url), "utf8");
  const publicLibraryStart = librarySource.indexOf("export async function getPublicMagnetLibrary");
  const publicLibraryEnd = librarySource.indexOf("export async function resolvePublicLibraryContextForGuide", publicLibraryStart);
  const publicLibrary = librarySource.slice(publicLibraryStart, publicLibraryEnd);
  assert.match(publicLibrary, /description: appearance\.tagline \|\| null/);
  assert.doesNotMatch(publicLibrary, /description: brands\.description/);
});

test("generated library slugs are normalized and stable for the same seed", () => {
  const slug = createLibrarySlug("Coach Élite Basketball!", "ABC-123-XYZ");
  assert.equal(slug, "coach-elite-basketball-abc123xyz");
  assert.equal(createLibrarySlug("Renamed? No", "short7"), "renamed-no-short7");
});
