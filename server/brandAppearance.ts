import { and, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  brandingSettings,
  brands,
  users,
  type BrandingSettings,
  type Guide,
  type InsertBrandingSettings,
} from "@shared/schema";
import {
  flattenBrandAppearanceUpdate,
  normalizeBrandAppearance,
  toPublicBrandAppearance,
  type BrandAppearance,
  type BrandAppearanceUpdate,
  type BrandingEnvelope,
  type PublicBrandAppearance,
} from "@shared/branding";
import { resolveCurrentBrandScope } from "./brandAccess";

async function getPersonalFallbackName(userId: string): Promise<string> {
  const [user] = await db
    .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return fullName || user?.email?.split("@")[0] || "My Brand";
}

export async function getBrandingRowForScope(
  userId: string,
  brandId: number | null,
): Promise<BrandingSettings | undefined> {
  const condition = brandId === null
    ? and(eq(brandingSettings.userId, userId), isNull(brandingSettings.brandId))
    : eq(brandingSettings.brandId, brandId);
  const [row] = await db.select().from(brandingSettings).where(condition);
  return row;
}

export async function resolveAppearanceForScope(
  userId: string,
  brandId: number | null,
): Promise<BrandAppearance> {
  const row = await getBrandingRowForScope(userId, brandId);
  if (brandId === null) {
    return normalizeBrandAppearance(row, await getPersonalFallbackName(userId));
  }

  const [brand] = await db
    .select({ name: brands.name, logoUrl: brands.logoUrl })
    .from(brands)
    .where(eq(brands.id, brandId));
  if (!brand) return normalizeBrandAppearance(row, "VidMagnet");
  return normalizeBrandAppearance(row || { logoUrl: brand.logoUrl }, brand.name);
}

export async function resolvePublicAppearanceForGuide(
  guide: Pick<Guide, "userId" | "brandId">,
): Promise<PublicBrandAppearance> {
  return toPublicBrandAppearance(
    await resolveAppearanceForScope(guide.userId, guide.brandId),
  );
}

export async function resolveBrandingEnvelope(userId: string): Promise<BrandingEnvelope> {
  const scope = await resolveCurrentBrandScope(userId, "read");
  const appearance = await resolveAppearanceForScope(scope.ownerUserId, scope.brandId);
  return {
    scope: {
      kind: scope.kind,
      brandId: scope.brandId,
      workspaceName: scope.workspaceName,
      role: scope.role,
      canEdit: scope.canEditBranding,
    },
    appearance,
    capabilities: {
      customBranding: true,
      canHidePoweredBy: false,
    },
  };
}

export function mergeBrandAppearance(
  current: BrandAppearance,
  update: BrandAppearanceUpdate,
  fallbackDisplayName: string,
): BrandAppearance {
  const flattened = flattenBrandAppearanceUpdate(update);
  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(flattened)) {
    if (value !== undefined) merged[key] = value;
  }

  const requestedDisplayName = flattened.displayName ?? flattened.companyName;
  if (requestedDisplayName !== undefined) {
    merged.displayName = requestedDisplayName;
    merged.companyName = requestedDisplayName;
  }
  const requestedBodyFont = flattened.bodyFontFamily ?? flattened.fontFamily;
  if (requestedBodyFont !== undefined) {
    merged.bodyFontFamily = requestedBodyFont;
    merged.fontFamily = requestedBodyFont;
  }

  return normalizeBrandAppearance(merged, fallbackDisplayName);
}

export function toBrandingPersistence(
  appearance: BrandAppearance,
  userId: string,
  brandId: number | null,
): InsertBrandingSettings {
  return {
    userId,
    brandId,
    displayName: appearance.displayName,
    companyName: appearance.displayName,
    tagline: appearance.tagline,
    logoUrl: appearance.logoUrl,
    logoMarkUrl: appearance.logoMarkUrl,
    logoAltText: appearance.logoAltText,
    faviconUrl: appearance.faviconUrl,
    socialImageUrl: appearance.socialImageUrl,
    primaryColor: appearance.primaryColor,
    secondaryColor: appearance.secondaryColor,
    accentColor: appearance.accentColor,
    backgroundColor: appearance.backgroundColor,
    surfaceColor: appearance.surfaceColor,
    textColor: appearance.textColor,
    headingFontFamily: appearance.headingFontFamily,
    bodyFontFamily: appearance.bodyFontFamily,
    fontFamily: appearance.bodyFontFamily,
    websiteUrl: appearance.websiteUrl,
    privacyUrl: appearance.privacyUrl,
    termsUrl: appearance.termsUrl,
    brandVoice: appearance.brandVoice,
    targetAudience: appearance.targetAudience,
  };
}
