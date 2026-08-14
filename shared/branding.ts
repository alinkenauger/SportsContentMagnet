import { z } from "zod";

export const SUPPORTED_BRAND_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Lato",
  "Poppins",
] as const;

export const supportedBrandFontSchema = z.enum(SUPPORTED_BRAND_FONTS);
export type SupportedBrandFont = z.infer<typeof supportedBrandFontSchema>;

export const brandRoleSchema = z.enum(["owner", "admin", "editor", "viewer"]);
export type BrandRole = z.infer<typeof brandRoleSchema>;

export const brandScopeExpectationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("personal"), brandId: z.null() }).strict(),
  z.object({ kind: z.literal("brand"), brandId: z.number().int().positive() }).strict(),
]);
export type BrandScopeExpectation = z.infer<typeof brandScopeExpectationSchema>;

export function brandScopeMatches(
  expected: BrandScopeExpectation,
  actual: { kind: "personal" | "brand"; brandId: number | null },
): boolean {
  return expected.kind === actual.kind && expected.brandId === actual.brandId;
}

export const brandHexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color")
  .transform((value) => value.toUpperCase());

const nullableText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(max).nullable(),
);

function isSafePublicAssetUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 2048 || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return false;
  }
  if (trimmed.startsWith("/")) {
    return /^\/uploads\/branding\/[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/.test(trimmed);
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isSafeWebsiteUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 2048 || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const nullablePublicUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(2048).refine(
    isSafePublicAssetUrl,
    "Use an http(s) URL or an uploaded asset path",
  ).nullable(),
);

const nullableWebsiteUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(2048).url().refine(
    isSafeWebsiteUrl,
    "Use an http(s) URL",
  ).nullable(),
);

const optionalColorFields = z.object({
  primary: brandHexColorSchema.optional(),
  secondary: brandHexColorSchema.optional(),
  accent: brandHexColorSchema.optional(),
  background: brandHexColorSchema.optional(),
  surface: brandHexColorSchema.optional(),
  text: brandHexColorSchema.optional(),
}).strict();

const optionalTypographyFields = z.object({
  headingFontFamily: supportedBrandFontSchema.optional(),
  bodyFontFamily: supportedBrandFontSchema.optional(),
}).strict();

const optionalLinkFields = z.object({
  websiteUrl: nullableWebsiteUrl.optional(),
  privacyUrl: nullableWebsiteUrl.optional(),
  termsUrl: nullableWebsiteUrl.optional(),
}).strict();

/**
 * Accepted authenticated update shape. Flat fields keep existing clients
 * compatible; grouped fields give new clients a clearer authoring contract.
 */
export const brandAppearanceUpdateSchema = z.object({
  displayName: nullableText(160).optional(),
  companyName: nullableText(160).optional(),
  tagline: nullableText(500).optional(),
  logoUrl: nullablePublicUrl.optional(),
  logoMarkUrl: nullablePublicUrl.optional(),
  logoAltText: nullableText(240).optional(),
  faviconUrl: nullablePublicUrl.optional(),
  socialImageUrl: nullablePublicUrl.optional(),
  primaryColor: brandHexColorSchema.optional(),
  secondaryColor: brandHexColorSchema.optional(),
  accentColor: brandHexColorSchema.optional(),
  backgroundColor: brandHexColorSchema.optional(),
  surfaceColor: brandHexColorSchema.optional(),
  textColor: brandHexColorSchema.optional(),
  headingFontFamily: supportedBrandFontSchema.optional(),
  bodyFontFamily: supportedBrandFontSchema.optional(),
  fontFamily: supportedBrandFontSchema.optional(),
  websiteUrl: nullableWebsiteUrl.optional(),
  privacyUrl: nullableWebsiteUrl.optional(),
  termsUrl: nullableWebsiteUrl.optional(),
  brandVoice: nullableText(4000).optional(),
  targetAudience: nullableText(2000).optional(),
  colors: optionalColorFields.optional(),
  typography: optionalTypographyFields.optional(),
  links: optionalLinkFields.optional(),
}).strict();

export type BrandAppearanceUpdate = z.infer<typeof brandAppearanceUpdateSchema>;

export type BrandAppearance = {
  displayName: string;
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
  logoMarkUrl: string | null;
  logoAltText: string;
  faviconUrl: string | null;
  socialImageUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  headingFontFamily: SupportedBrandFont;
  bodyFontFamily: SupportedBrandFont;
  fontFamily: SupportedBrandFont;
  websiteUrl: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  brandVoice: string | null;
  targetAudience: string | null;
};

export type PublicBrandAppearance = Omit<BrandAppearance, "brandVoice" | "targetAudience"> & {
  onPrimaryColor: "#000000" | "#FFFFFF";
  onSecondaryColor: "#000000" | "#FFFFFF";
  showPoweredBy: boolean;
};

export type BrandingEnvelope = {
  scope: {
    kind: "personal" | "brand";
    brandId: number | null;
    workspaceName: string;
    role: BrandRole;
    canEdit: boolean;
  };
  appearance: BrandAppearance;
  capabilities: {
    customBranding: true;
    canHidePoweredBy: false;
  };
};

export type BrandAccessAction = "read" | "write_content" | "manage_brand";

export function brandRoleAllows(role: BrandRole, action: BrandAccessAction): boolean {
  if (action === "read") return true;
  if (action === "write_content") return role !== "viewer";
  return role === "owner" || role === "admin";
}

type BrandingLike = Partial<{
  displayName: string | null;
  companyName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  logoMarkUrl: string | null;
  logoAltText: string | null;
  faviconUrl: string | null;
  socialImageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  surfaceColor: string | null;
  textColor: string | null;
  headingFontFamily: string | null;
  bodyFontFamily: string | null;
  fontFamily: string | null;
  websiteUrl: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  brandVoice: string | null;
  targetAudience: string | null;
}>;

const DEFAULT_COLORS = {
  primaryColor: "#2563EB",
  secondaryColor: "#10B981",
  accentColor: "#F59E0B",
  backgroundColor: "#F8FAFC",
  surfaceColor: "#FFFFFF",
  textColor: "#0F172A",
} as const;

function safeColor(value: string | null | undefined, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value || "") ? value!.toUpperCase() : fallback;
}

function safeFont(value: string | null | undefined): SupportedBrandFont {
  return SUPPORTED_BRAND_FONTS.includes(value as SupportedBrandFont)
    ? value as SupportedBrandFont
    : "Inter";
}

function safePublicAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isSafePublicAssetUrl(trimmed) ? trimmed : null;
}

function safeWebsiteUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isSafeWebsiteUrl(trimmed) ? trimmed : null;
}

export function normalizeBrandAppearance(
  value: BrandingLike | null | undefined,
  fallbackDisplayName = "VidMagnet",
): BrandAppearance {
  const displayName = value?.displayName?.trim()
    || value?.companyName?.trim()
    || fallbackDisplayName.trim()
    || "VidMagnet";
  const bodyFontFamily = safeFont(value?.bodyFontFamily || value?.fontFamily);

  return {
    displayName,
    companyName: displayName,
    tagline: value?.tagline?.trim() || null,
    logoUrl: safePublicAssetUrl(value?.logoUrl),
    logoMarkUrl: safePublicAssetUrl(value?.logoMarkUrl),
    logoAltText: value?.logoAltText?.trim() || `${displayName} logo`,
    faviconUrl: safePublicAssetUrl(value?.faviconUrl),
    socialImageUrl: safePublicAssetUrl(value?.socialImageUrl),
    primaryColor: safeColor(value?.primaryColor, DEFAULT_COLORS.primaryColor),
    secondaryColor: safeColor(value?.secondaryColor, DEFAULT_COLORS.secondaryColor),
    accentColor: safeColor(value?.accentColor, DEFAULT_COLORS.accentColor),
    backgroundColor: safeColor(value?.backgroundColor, DEFAULT_COLORS.backgroundColor),
    surfaceColor: safeColor(value?.surfaceColor, DEFAULT_COLORS.surfaceColor),
    textColor: safeColor(value?.textColor, DEFAULT_COLORS.textColor),
    headingFontFamily: safeFont(value?.headingFontFamily || bodyFontFamily),
    bodyFontFamily,
    fontFamily: bodyFontFamily,
    websiteUrl: safeWebsiteUrl(value?.websiteUrl),
    privacyUrl: safeWebsiteUrl(value?.privacyUrl),
    termsUrl: safeWebsiteUrl(value?.termsUrl),
    brandVoice: value?.brandVoice?.trim() || null,
    targetAudience: value?.targetAudience?.trim() || null,
  };
}

function readableTextColor(background: string): "#000000" | "#FFFFFF" {
  const channel = (start: number) => {
    const value = Number.parseInt(background.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? "#000000" : "#FFFFFF";
}

export function toPublicBrandAppearance(appearance: BrandAppearance): PublicBrandAppearance {
  const { brandVoice: _brandVoice, targetAudience: _targetAudience, ...safeAppearance } = appearance;
  return {
    ...safeAppearance,
    onPrimaryColor: readableTextColor(appearance.primaryColor),
    onSecondaryColor: readableTextColor(appearance.secondaryColor),
    showPoweredBy: true,
  };
}

export function flattenBrandAppearanceUpdate(input: BrandAppearanceUpdate): BrandAppearanceUpdate {
  return {
    ...input,
    primaryColor: input.primaryColor ?? input.colors?.primary,
    secondaryColor: input.secondaryColor ?? input.colors?.secondary,
    accentColor: input.accentColor ?? input.colors?.accent,
    backgroundColor: input.backgroundColor ?? input.colors?.background,
    surfaceColor: input.surfaceColor ?? input.colors?.surface,
    textColor: input.textColor ?? input.colors?.text,
    headingFontFamily: input.headingFontFamily ?? input.typography?.headingFontFamily,
    bodyFontFamily: input.bodyFontFamily ?? input.typography?.bodyFontFamily ?? input.fontFamily,
    websiteUrl: input.websiteUrl ?? input.links?.websiteUrl,
    privacyUrl: input.privacyUrl ?? input.links?.privacyUrl,
    termsUrl: input.termsUrl ?? input.links?.termsUrl,
    colors: undefined,
    typography: undefined,
    links: undefined,
  };
}
