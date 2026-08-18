import { useEffect } from "react";
import { useParams, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Magnet,
  Share2,
} from "lucide-react";
import GuideContentRenderer from "@/components/guide-content-renderer";
import { PublicLibraryLink } from "@/components/public-library-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ensureReadableTextColor } from "@/lib/color-contrast";
import { safeHttpUrl, safePublicAssetUrl } from "@/lib/safe-url";
import type { LibraryContext } from "@shared/library";

interface PublicBrandAppearance {
  displayName?: string | null;
  companyName?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  surfaceColor?: string | null;
  textColor?: string | null;
  headingFontFamily?: string | null;
  bodyFontFamily?: string | null;
  fontFamily?: string | null;
  websiteUrl?: string | null;
  privacyUrl?: string | null;
  termsUrl?: string | null;
  onPrimaryColor?: string | null;
  showPoweredBy?: boolean;
}

interface DeliveryData {
  guide: {
    id: number;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    youtubeUrl?: string | null;
    youtubeVideoId?: string | null;
    channelTitle?: string | null;
    ctaLink?: string | null;
    ctaText?: string | null;
    content: unknown;
    category?: string | null;
    presentationProfile?: {
      version: 1;
      mode: "auto" | "manual";
      preset: "editorial" | "basketball" | "golf" | "performance";
    };
    sourceVideo?: { canonicalUrl: string; videoId: string; channelTitle?: string } | null;
  };
  lead: {
    firstName?: string | null;
    customFieldData?: Record<string, unknown> | null;
  };
  brandingSettings?: PublicBrandAppearance;
  branding?: PublicBrandAppearance | { appearance?: PublicBrandAppearance };
  library?: LibraryContext | null;
}

function resolvedBranding(data?: DeliveryData): PublicBrandAppearance {
  if (!data) return {};
  if (data.branding && "appearance" in data.branding) {
    return data.branding.appearance || {};
  }
  return (data.branding as PublicBrandAppearance | undefined) || data.brandingSettings || {};
}

function publicBrandName(branding: PublicBrandAppearance) {
  return branding.displayName || branding.companyName || "VidMagnet";
}

export default function GuideDelivery() {
  const { customUrl, leadId } = useParams<{ customUrl: string; leadId: string }>();
  const search = useSearch();
  const accessToken = new URLSearchParams(search).get("access");
  const { data, isLoading, isError } = useQuery<DeliveryData>({
    queryKey: ["/api/delivery", customUrl, leadId, accessToken],
    queryFn: async () => {
      const accessQuery = accessToken ? `?access=${encodeURIComponent(accessToken)}` : "";
      const response = await fetch("/api/delivery/" + customUrl + "/" + leadId + accessQuery);
      if (!response.ok) throw new Error("Guide delivery not found");
      return response.json();
    },
    enabled: Boolean(customUrl && leadId),
    retry: false,
  });

  const branding = resolvedBranding(data);
  const guide = data?.guide;
  const primaryColor = branding.primaryColor || "#2563EB";
  const secondaryColor = branding.secondaryColor || "#10B981";
  const accentColor = branding.accentColor || "#F59E0B";
  const backgroundColor = branding.backgroundColor || "#F8FAFC";
  const surfaceColor = branding.surfaceColor || "#FFFFFF";
  const textColor = branding.textColor || "#0F172A";
  const bodyFont = branding.bodyFontFamily || branding.fontFamily || "DM Sans, sans-serif";
  const headingFont = branding.headingFontFamily || bodyFont;
  const presentationPreset = guide?.presentationProfile?.preset || "editorial";
  const basketballMode = presentationPreset === "basketball";
  const recipientBackground = backgroundColor;
  const recipientSurface = surfaceColor;
  const recipientText = ensureReadableTextColor(textColor, recipientSurface);
  const utilityBarSurface = basketballMode ? "#050505" : recipientSurface;
  const utilityBarText = basketballMode ? "#FFFAF0" : recipientText;

  useEffect(() => {
    if (!data) return;
    document.title = data.guide.title + " — " + publicBrandName(resolvedBranding(data));
    const favicon = safePublicAssetUrl(resolvedBranding(data).faviconUrl);
    if (favicon) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = favicon;
    }
  }, [data]);

  const handleShare = async () => {
    if (!guide) return;
    if (navigator.share) {
      await navigator.share({
        title: guide.title,
        text: guide.description || undefined,
        url: window.location.href,
      });
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
  };

  const ctaUrl = safeHttpUrl(guide?.ctaLink);
  const websiteUrl = safeHttpUrl(branding.websiteUrl);
  const privacyUrl = safeHttpUrl(branding.privacyUrl);
  const termsUrl = safeHttpUrl(branding.termsUrl);
  const logoUrl = safePublicAssetUrl(branding.logoUrl);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-slate-600">Preparing your guide…</p>
        </div>
      </div>
    );
  }

  if (isError || !data || !guide) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900">This guide is unavailable</h1>
            <p className="mt-2 text-slate-600">
              Check the delivery link or request a fresh copy from the publisher.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      data-presentation={presentationPreset}
      style={{
        backgroundColor: recipientBackground,
        color: recipientText,
        fontFamily: bodyFont,
        backgroundImage: basketballMode
          ? `radial-gradient(circle at 82% 6%, ${primaryColor}14, transparent 30%)`
          : presentationPreset === "golf"
            ? `radial-gradient(ellipse at 90% 4%, ${primaryColor}12 0%, transparent 36%)`
            : undefined,
      }}
    >
      <header
        className="border-b print:hidden"
        style={{ backgroundColor: utilityBarSurface, borderColor: primaryColor + "55", color: utilityBarText }}
      >
        <div className="mx-auto flex min-h-14 max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={publicBrandName(branding) + " logo"}
                className="h-8 max-w-[160px] object-contain"
              />
            ) : (
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <Magnet className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ fontFamily: headingFont }}>
                {publicBrandName(branding)}
              </p>
              {branding.tagline ? <p className="hidden truncate text-[11px] opacity-55 lg:block">{branding.tagline}</p> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <PublicLibraryLink
              library={data.library}
              className="h-8 min-w-8 rounded-full border-transparent px-0 opacity-75 hover:opacity-100 sm:px-2.5"
              style={{ backgroundColor: "transparent", color: utilityBarText, borderColor: primaryColor + "55" }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-8 w-8 rounded-full border-transparent p-0 opacity-75 hover:opacity-100 sm:w-auto sm:px-2.5"
              style={{ backgroundColor: "transparent", color: utilityBarText, borderColor: primaryColor + "55" }}
            >
              <Share2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            {ctaUrl ? (
              <Button
                size="sm"
                className="hidden h-8 rounded-full px-3 md:inline-flex"
                style={{ backgroundColor: primaryColor, color: branding.onPrimaryColor || "#FFFFFF" }}
                onClick={() => window.open(ctaUrl, "_blank", "noopener,noreferrer")}
              >
                {guide.ctaText || "Take the next step"}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-3 py-4 print:max-w-none print:p-0 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <section
          className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full px-3 py-2 print:hidden"
          style={{
            backgroundColor: secondaryColor + "18",
          }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: secondaryColor }} aria-hidden="true" />
          <p className="min-w-0 truncate text-xs sm:text-sm">
            <span className="font-semibold" style={{ fontFamily: headingFont }}>
              {data.lead.firstName ? "Ready for you, " + data.lead.firstName + "." : "Your guide is ready."}
            </span>{" "}
            <span className="hidden opacity-60 sm:inline">Your progress stays with this link.</span>
          </p>
        </section>

        <div className="min-w-0 print:p-0">
          <GuideContentRenderer
            content={guide.content}
            youtubeUrl={guide.sourceVideo?.canonicalUrl || guide.youtubeUrl}
            youtubeChannelTitle={guide.sourceVideo?.channelTitle || guide.channelTitle}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            accentColor={accentColor}
            headingFontFamily={headingFont}
            fontFamily={bodyFont}
            surfaceColor={recipientSurface}
            textColor={recipientText}
            presentationPreset={presentationPreset}
          />
        </div>
      </main>

      <footer className="border-t print:hidden" style={{ backgroundColor: recipientSurface, borderColor: primaryColor + "32" }}>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-6 text-xs opacity-65 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Published by {publicBrandName(branding)}</p>
          <div className="flex flex-wrap items-center gap-4">
            {websiteUrl ? <a href={websiteUrl} target="_blank" rel="noreferrer">Website</a> : null}
            {privacyUrl ? <a href={privacyUrl} target="_blank" rel="noreferrer">Privacy</a> : null}
            {termsUrl ? <a href={termsUrl} target="_blank" rel="noreferrer">Terms</a> : null}
            {branding.showPoweredBy !== false ? <span>Powered by VidMagnet</span> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
