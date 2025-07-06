import { useQuery } from "@tanstack/react-query";
import { BrandingSettings } from "@shared/schema";

export function useBranding() {
  const { data: brandingSettings, isLoading } = useQuery<BrandingSettings>({
    queryKey: ["/api/branding"],
    retry: false,
  });

  return {
    brandingSettings,
    isLoading,
    logoUrl: brandingSettings?.logoUrl,
    faviconUrl: brandingSettings?.faviconUrl,
    companyName: brandingSettings?.companyName || "VidMagnet",
    primaryColor: brandingSettings?.primaryColor || "#2563EB",
    secondaryColor: brandingSettings?.secondaryColor || "#10B981",
    accentColor: brandingSettings?.accentColor || "#F59E0B",
    fontFamily: brandingSettings?.fontFamily || "Inter",
  };
}