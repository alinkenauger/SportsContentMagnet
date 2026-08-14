import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  brandAppearanceUpdateSchema,
  brandScopeMatches,
  brandRoleAllows,
  flattenBrandAppearanceUpdate,
  normalizeBrandAppearance,
  toPublicBrandAppearance,
} from "@shared/branding";
import { resolveQuizTheme, type QuizTheme } from "@shared/quiz";
import { hasAllowedBrandImageSignature } from "./brandAssetValidation";

test("normalizes aliases, fonts, colors, and legacy URLs safely", () => {
  const appearance = normalizeBrandAppearance({
    companyName: "  Acme Golf  ",
    primaryColor: "#abcdef",
    headingFontFamily: "Papyrus",
    bodyFontFamily: "Poppins",
    logoUrl: "javascript:alert(1)",
    logoMarkUrl: "//attacker.example/mark.png",
    faviconUrl: "/uploads/branding/favicon.png",
    socialImageUrl: "https://cdn.example/social.png",
    websiteUrl: "data:text/html,unsafe",
    privacyUrl: "https://example.com/privacy",
  });

  assert.equal(appearance.displayName, "Acme Golf");
  assert.equal(appearance.companyName, "Acme Golf");
  assert.equal(appearance.primaryColor, "#ABCDEF");
  assert.equal(appearance.headingFontFamily, "Inter");
  assert.equal(appearance.bodyFontFamily, "Poppins");
  assert.equal(appearance.logoUrl, null);
  assert.equal(appearance.logoMarkUrl, null);
  assert.equal(appearance.faviconUrl, "/uploads/branding/favicon.png");
  assert.equal(appearance.socialImageUrl, "https://cdn.example/social.png");
  assert.equal(appearance.websiteUrl, null);
  assert.equal(appearance.privacyUrl, "https://example.com/privacy");
});

test("accepts the grouped update contract and rejects scope injection", () => {
  const parsed = brandAppearanceUpdateSchema.parse({
    colors: { primary: "#123456", background: "#FFFFFF" },
    typography: { headingFontFamily: "Montserrat", bodyFontFamily: "Open Sans" },
    links: { websiteUrl: "https://example.com", privacyUrl: null },
  });
  const flattened = flattenBrandAppearanceUpdate(parsed);

  assert.equal(flattened.primaryColor, "#123456");
  assert.equal(flattened.headingFontFamily, "Montserrat");
  assert.equal(flattened.bodyFontFamily, "Open Sans");
  assert.equal(flattened.websiteUrl, "https://example.com");
  assert.equal(flattened.privacyUrl, null);
  assert.throws(() => brandAppearanceUpdateSchema.parse({ brandId: 123 }));
});

test("public projection strips prompting context and chooses readable text", () => {
  const privateAppearance = normalizeBrandAppearance({
    displayName: "Contrast Co",
    primaryColor: "#FFFFFF",
    secondaryColor: "#000000",
    brandVoice: "Private system instructions",
    targetAudience: "Private audience notes",
  });
  const publicAppearance = toPublicBrandAppearance(privateAppearance);

  assert.equal("brandVoice" in publicAppearance, false);
  assert.equal("targetAudience" in publicAppearance, false);
  assert.equal(publicAppearance.onPrimaryColor, "#000000");
  assert.equal(publicAppearance.onSecondaryColor, "#FFFFFF");
  assert.equal(publicAppearance.showPoweredBy, true);
});

test("brand permissions keep branding administration owner/admin only", () => {
  assert.equal(brandRoleAllows("owner", "manage_brand"), true);
  assert.equal(brandRoleAllows("admin", "manage_brand"), true);
  assert.equal(brandRoleAllows("editor", "manage_brand"), false);
  assert.equal(brandRoleAllows("editor", "write_content"), true);
  assert.equal(brandRoleAllows("viewer", "write_content"), false);
  assert.equal(brandRoleAllows("viewer", "read"), true);
});

test("scope expectations detect cross-tab brand changes without retargeting", () => {
  const expected = { kind: "brand" as const, brandId: 42 };

  assert.equal(brandScopeMatches(expected, { kind: "brand", brandId: 42 }), true);
  assert.equal(brandScopeMatches(expected, { kind: "brand", brandId: 7 }), false);
  assert.equal(brandScopeMatches(expected, { kind: "personal", brandId: null }), false);
});

test("quiz themes inherit brand values unless explicitly custom", () => {
  const appearance = toPublicBrandAppearance(normalizeBrandAppearance({
    displayName: "Quiz Brand",
    primaryColor: "#111111",
    secondaryColor: "#222222",
    accentColor: "#333333",
    backgroundColor: "#FAFAFA",
    bodyFontFamily: "Lato",
  }));
  const customTheme: QuizTheme = {
    primaryColor: "#AA0000",
    secondaryColor: "#00AA00",
    accentColor: "#0000AA",
    backgroundColor: "#FFFFFF",
    fontFamily: "Roboto",
  };

  assert.deepEqual(resolveQuizTheme(appearance, customTheme, "brand"), {
    primaryColor: "#111111",
    secondaryColor: "#222222",
    accentColor: "#333333",
    backgroundColor: "#FAFAFA",
    fontFamily: "Lato",
  });
  assert.deepEqual(resolveQuizTheme(appearance, customTheme, "custom"), customTheme);
});

test("branding migration preserves legacy quiz themes and establishes isolated scopes", () => {
  const migration = readFileSync(
    new URL("../migrations/0002_brand_scoped_appearance.sql", import.meta.url),
    "utf8",
  );
  const legacyQuizBackfill = migration.indexOf("SET theme_mode = 'custom'");
  const brandDefault = migration.indexOf("ALTER COLUMN theme_mode SET DEFAULT 'brand'");
  const oldUniqueDrop = migration.indexOf("DROP CONSTRAINT IF EXISTS branding_settings_user_id_unique");
  const personalUnique = migration.indexOf("CREATE UNIQUE INDEX IF NOT EXISTS branding_settings_personal_unique");
  const brandUnique = migration.indexOf("CREATE UNIQUE INDEX IF NOT EXISTS branding_settings_brand_unique");

  assert.ok(oldUniqueDrop >= 0 && oldUniqueDrop < personalUnique);
  assert.ok(personalUnique >= 0 && brandUnique > personalUnique);
  assert.ok(migration.includes("WHERE brand_id IS NULL"));
  assert.ok(migration.includes("WHERE brand_id IS NOT NULL"));
  assert.ok(migration.includes("brands.user_id, brands.id, brands.name, brands.name"));
  assert.ok(legacyQuizBackfill >= 0 && brandDefault > legacyQuizBackfill);
  assert.equal(/DROP\s+(TABLE|COLUMN)/i.test(migration), false);
});

test("same-origin uploads verify image signatures instead of trusting MIME alone", () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    Buffer.from("payload"),
  ]);
  const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  const webp = Buffer.from("RIFF0000WEBPpayload", "ascii");
  const disguisedHtml = Buffer.from("<script>alert(1)</script>");

  assert.equal(hasAllowedBrandImageSignature(png, "image/png"), true);
  assert.equal(hasAllowedBrandImageSignature(jpeg, "image/jpeg"), true);
  assert.equal(hasAllowedBrandImageSignature(webp, "image/webp"), true);
  assert.equal(hasAllowedBrandImageSignature(disguisedHtml, "image/png"), false);
  assert.equal(hasAllowedBrandImageSignature(png, "image/svg+xml"), false);
});
