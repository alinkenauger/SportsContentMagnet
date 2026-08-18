import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  SUPPORTED_BRAND_FONTS as SUPPORTED_BRAND_FONT_VALUES,
  type SupportedBrandFont,
} from "@shared/branding";

const BRAND_FONT_METADATA: Record<SupportedBrandFont, {
  description: string;
  stack: string;
  googleFamily: string;
}> = {
  Inter: {
    description: "Clean product sans",
    stack: "Inter, Arial, sans-serif",
    googleFamily: "Inter:wght@400;500;600;700",
  },
  "Barlow Condensed": {
    description: "Athletic condensed display",
    stack: "'Barlow Condensed', Arial, sans-serif",
    googleFamily: "Barlow+Condensed:wght@400;500;600;700;800;900",
  },
  Roboto: {
    description: "Neutral, highly readable",
    stack: "Roboto, Arial, sans-serif",
    googleFamily: "Roboto:wght@400;500;700",
  },
  "Open Sans": {
    description: "Friendly and practical",
    stack: "'Open Sans', Arial, sans-serif",
    googleFamily: "Open+Sans:wght@400;500;600;700",
  },
  Montserrat: {
    description: "Bold geometric sans",
    stack: "Montserrat, Arial, sans-serif",
    googleFamily: "Montserrat:wght@400;500;600;700",
  },
  Lato: {
    description: "Humanist and versatile",
    stack: "Lato, Arial, sans-serif",
    googleFamily: "Lato:wght@400;700;900",
  },
  Poppins: {
    description: "Approachable geometric sans",
    stack: "Poppins, Arial, sans-serif",
    googleFamily: "Poppins:wght@400;500;600;700",
  },
};

export const SUPPORTED_BRAND_FONTS = SUPPORTED_BRAND_FONT_VALUES.map((value) => ({
  value,
  label: value,
  ...BRAND_FONT_METADATA[value],
}));

export type BrandingRole = "owner" | "admin" | "editor" | "viewer";

export interface BrandingScope {
  kind: "personal" | "brand";
  brandId: number | null;
  workspaceName: string;
  role: BrandingRole;
  canEdit: boolean;
}

export interface BrandingCapabilities {
  customBranding: boolean;
  canHidePoweredBy: boolean;
  whiteLabeling: boolean;
}

export interface BrandAppearance {
  displayName: string;
  companyName: string;
  tagline: string;
  logoUrl: string;
  logoMarkUrl: string;
  logoAltText: string;
  faviconUrl: string;
  socialImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  headingFontFamily: SupportedBrandFont;
  bodyFontFamily: SupportedBrandFont;
  fontFamily: SupportedBrandFont;
  websiteUrl: string;
  privacyUrl: string;
  termsUrl: string;
  brandVoice: string;
  targetAudience: string;
}

export interface BrandingEnvelope {
  scope: BrandingScope;
  appearance: BrandAppearance;
  capabilities: BrandingCapabilities;
}

export const DEFAULT_BRAND_APPEARANCE: BrandAppearance = {
  displayName: "",
  companyName: "",
  tagline: "",
  logoUrl: "",
  logoMarkUrl: "",
  logoAltText: "",
  faviconUrl: "",
  socialImageUrl: "",
  primaryColor: "#2563EB",
  secondaryColor: "#10B981",
  accentColor: "#F59E0B",
  backgroundColor: "#F8FAFC",
  surfaceColor: "#FFFFFF",
  textColor: "#0F172A",
  headingFontFamily: "Inter",
  bodyFontFamily: "Inter",
  fontFamily: "Inter",
  websiteUrl: "",
  privacyUrl: "",
  termsUrl: "",
  brandVoice: "",
  targetAudience: "",
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string") return value;
  }
  return "";
}

function firstBoolean(fallback: boolean, ...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return fallback;
}

function isSupportedFont(value: string): value is SupportedBrandFont {
  return SUPPORTED_BRAND_FONTS.some((font) => font.value === value);
}

function supportedFont(value: unknown, fallback: SupportedBrandFont): SupportedBrandFont {
  return typeof value === "string" && isSupportedFont(value) ? value : fallback;
}

function normalizeRole(value: unknown): BrandingRole {
  if (value === "admin" || value === "editor" || value === "viewer") return value;
  return "owner";
}

export function getBrandFontStack(value: string): string {
  return SUPPORTED_BRAND_FONTS.find((font) => font.value === value)?.stack
    ?? SUPPORTED_BRAND_FONTS.find((font) => font.value === DEFAULT_BRAND_APPEARANCE.bodyFontFamily)?.stack
    ?? "Arial, sans-serif";
}

/**
 * Normalize the brand-scoped envelope while accepting the original flat response
 * during the API transition. The client can therefore ship before every consumer
 * has moved to the new contract.
 */
export function normalizeBrandingResponse(
  response: unknown,
  currentBrandId: number | null,
): BrandingEnvelope {
  const root = asRecord(response);
  const hasEnvelope = Object.prototype.hasOwnProperty.call(root, "appearance");
  const appearanceSource = hasEnvelope ? asRecord(root.appearance) : root;
  const colors = asRecord(appearanceSource.colors);
  const typography = asRecord(appearanceSource.typography);
  const links = asRecord(appearanceSource.links);
  const scopeSource = asRecord(root.scope);
  const capabilitiesSource = asRecord(root.capabilities);

  const legacyFont = firstString(appearanceSource.fontFamily);
  const bodyFontFamily = supportedFont(
    firstString(typography.bodyFontFamily, typography.body, appearanceSource.bodyFontFamily, legacyFont),
    DEFAULT_BRAND_APPEARANCE.bodyFontFamily,
  );
  const headingFontFamily = supportedFont(
    firstString(typography.headingFontFamily, typography.heading, appearanceSource.headingFontFamily, legacyFont),
    DEFAULT_BRAND_APPEARANCE.headingFontFamily,
  );
  const displayName = firstString(appearanceSource.displayName, appearanceSource.companyName);

  const appearance: BrandAppearance = {
    displayName,
    companyName: firstString(appearanceSource.companyName, displayName),
    tagline: firstString(appearanceSource.tagline),
    logoUrl: firstString(appearanceSource.logoUrl),
    logoMarkUrl: firstString(appearanceSource.logoMarkUrl),
    logoAltText: firstString(appearanceSource.logoAltText),
    faviconUrl: firstString(appearanceSource.faviconUrl),
    socialImageUrl: firstString(appearanceSource.socialImageUrl),
    primaryColor: firstString(colors.primary, appearanceSource.primaryColor) || DEFAULT_BRAND_APPEARANCE.primaryColor,
    secondaryColor: firstString(colors.secondary, appearanceSource.secondaryColor) || DEFAULT_BRAND_APPEARANCE.secondaryColor,
    accentColor: firstString(colors.accent, appearanceSource.accentColor) || DEFAULT_BRAND_APPEARANCE.accentColor,
    backgroundColor: firstString(colors.background, appearanceSource.backgroundColor) || DEFAULT_BRAND_APPEARANCE.backgroundColor,
    surfaceColor: firstString(colors.surface, appearanceSource.surfaceColor) || DEFAULT_BRAND_APPEARANCE.surfaceColor,
    textColor: firstString(colors.text, appearanceSource.textColor) || DEFAULT_BRAND_APPEARANCE.textColor,
    headingFontFamily,
    bodyFontFamily,
    fontFamily: bodyFontFamily,
    websiteUrl: firstString(links.websiteUrl, links.website, appearanceSource.websiteUrl),
    privacyUrl: firstString(links.privacyUrl, links.privacy, appearanceSource.privacyUrl),
    termsUrl: firstString(links.termsUrl, links.terms, appearanceSource.termsUrl),
    brandVoice: firstString(appearanceSource.brandVoice),
    targetAudience: firstString(appearanceSource.targetAudience, appearanceSource.audience),
  };

  const resolvedBrandId = typeof scopeSource.brandId === "number"
    ? scopeSource.brandId
    : currentBrandId;
  const kind = scopeSource.kind === "brand" || resolvedBrandId !== null
    ? "brand"
    : "personal";

  return {
    scope: {
      kind,
      brandId: kind === "brand" ? resolvedBrandId : null,
      workspaceName: firstString(scopeSource.workspaceName, scopeSource.name)
        || (kind === "brand" ? "Current brand" : "Personal workspace"),
      role: normalizeRole(scopeSource.role),
      canEdit: firstBoolean(true, scopeSource.canEdit),
    },
    appearance,
    capabilities: {
      customBranding: firstBoolean(true, capabilitiesSource.customBranding),
      canHidePoweredBy: firstBoolean(
        false,
        capabilitiesSource.canHidePoweredBy,
        capabilitiesSource.whiteLabeling,
      ),
      whiteLabeling: firstBoolean(
        false,
        capabilitiesSource.whiteLabeling,
        capabilitiesSource.canHidePoweredBy,
      ),
    },
  };
}

/** Build the canonical save payload while retaining flat aliases for migration. */
export function toBrandingAppearancePayload(appearance: BrandAppearance) {
  const displayName = appearance.displayName.trim();
  const companyName = displayName || appearance.companyName.trim();

  return {
    displayName,
    companyName,
    tagline: appearance.tagline.trim(),
    logoUrl: appearance.logoUrl.trim(),
    logoMarkUrl: appearance.logoMarkUrl.trim(),
    logoAltText: appearance.logoAltText.trim(),
    faviconUrl: appearance.faviconUrl.trim(),
    socialImageUrl: appearance.socialImageUrl.trim(),
    primaryColor: appearance.primaryColor,
    secondaryColor: appearance.secondaryColor,
    accentColor: appearance.accentColor,
    backgroundColor: appearance.backgroundColor,
    surfaceColor: appearance.surfaceColor,
    textColor: appearance.textColor,
    headingFontFamily: appearance.headingFontFamily,
    bodyFontFamily: appearance.bodyFontFamily,
    fontFamily: appearance.bodyFontFamily,
    websiteUrl: appearance.websiteUrl.trim(),
    privacyUrl: appearance.privacyUrl.trim(),
    termsUrl: appearance.termsUrl.trim(),
    brandVoice: appearance.brandVoice.trim(),
    targetAudience: appearance.targetAudience.trim(),
    colors: {
      primary: appearance.primaryColor,
      secondary: appearance.secondaryColor,
      accent: appearance.accentColor,
      background: appearance.backgroundColor,
      surface: appearance.surfaceColor,
      text: appearance.textColor,
    },
    typography: {
      headingFontFamily: appearance.headingFontFamily,
      bodyFontFamily: appearance.bodyFontFamily,
    },
    links: {
      websiteUrl: appearance.websiteUrl.trim(),
      privacyUrl: appearance.privacyUrl.trim(),
      termsUrl: appearance.termsUrl.trim(),
    },
  };
}

export function useBranding() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const currentBrandId = typeof user?.currentBrandId === "number"
    ? user.currentBrandId
    : null;
  const scopeCacheKey = currentBrandId ?? "personal";
  const queryKey = ["/api/branding", scopeCacheKey] as const;

  const query = useQuery<unknown>({
    queryKey,
    enabled: !isAuthLoading,
    retry: false,
  });

  const envelope = useMemo(
    () => normalizeBrandingResponse(query.data, currentBrandId),
    [query.data, currentBrandId],
  );

  // Compatibility projection for older consumers that still expect a flat row.
  const brandingSettings = useMemo(() => ({
    logoUrl: envelope.appearance.logoUrl || null,
    faviconUrl: envelope.appearance.faviconUrl || null,
    primaryColor: envelope.appearance.primaryColor,
    secondaryColor: envelope.appearance.secondaryColor,
    accentColor: envelope.appearance.accentColor,
    fontFamily: envelope.appearance.bodyFontFamily,
    companyName: envelope.appearance.displayName || null,
    tagline: envelope.appearance.tagline || null,
  }), [envelope.appearance]);

  return {
    ...query,
    queryKey,
    currentBrandId,
    envelope,
    scope: envelope.scope,
    appearance: envelope.appearance,
    capabilities: envelope.capabilities,
    canEdit: envelope.scope.canEdit && envelope.capabilities.customBranding,
    brandingSettings,
    isLoading: isAuthLoading || query.isLoading,
    logoUrl: envelope.appearance.logoUrl || envelope.appearance.logoMarkUrl || undefined,
    faviconUrl: envelope.appearance.faviconUrl || undefined,
    companyName: envelope.appearance.displayName || "VidMagnet",
    primaryColor: envelope.appearance.primaryColor,
    secondaryColor: envelope.appearance.secondaryColor,
    accentColor: envelope.appearance.accentColor,
    fontFamily: envelope.appearance.bodyFontFamily,
  };
}
