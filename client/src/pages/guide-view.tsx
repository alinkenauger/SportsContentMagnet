import { useEffect } from "react";
import { useParams, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Eye,
  Magnet,
  Share2,
} from "lucide-react";
import GuideContentRenderer from "@/components/guide-content-renderer";
import { PublicLibraryLink } from "@/components/public-library-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ensureReadableTextColor } from "@/lib/color-contrast";
import { apiRequest } from "@/lib/queryClient";
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

interface GuideViewData {
  guide: {
    id: number;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    youtubeUrl?: string | null;
    youtubeVideoId?: string | null;
    channelTitle?: string | null;
    views?: number | null;
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
  brandingSettings?: PublicBrandAppearance;
  branding?: PublicBrandAppearance | { appearance?: PublicBrandAppearance };
  library?: LibraryContext | null;
}

function resolvedBranding(data?: GuideViewData): PublicBrandAppearance {
  if (!data) return {};
  if (data.branding && "appearance" in data.branding) {
    return data.branding.appearance || {};
  }
  return (data.branding as PublicBrandAppearance | undefined) || data.brandingSettings || {};
}

function publicBrandName(branding: PublicBrandAppearance) {
  return branding.displayName || branding.companyName || "VidMagnet";
}

export default function GuideView() {
  const { guideId } = useParams<{ guideId: string }>();
  const search = useSearch();
  const isCreatorPreview = new URLSearchParams(search).get("preview") === "1";
  const { data, isLoading, isError } = useQuery<GuideViewData>({
    queryKey: ["/api/guide", guideId, isCreatorPreview ? "creator-preview" : "public"],
    queryFn: async () => {
      const endpoint = isCreatorPreview
        ? `/api/guides/${guideId}/preview`
        : `/api/guide/${guideId}/public`;
      const response = await fetch(endpoint, { credentials: "include" });
      if (!response.ok) throw new Error("Guide not found");
      return response.json();
    },
    enabled: Boolean(guideId),
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
    if (!data || !guideId) return;
    document.title = (isCreatorPreview ? "Preview: " : "") + data.guide.title + " — " + publicBrandName(resolvedBranding(data));
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
    if (!isCreatorPreview) {
      apiRequest("/api/guides/" + guideId + "/view", "POST", {}).catch(() => undefined);
    }
  }, [data, guideId, isCreatorPreview]);

  const handleShare = async () => {
    if (!guide) return;
    const shareUrl = isCreatorPreview
      ? new URL(`/guide/${guideId}`, window.location.origin).toString()
      : window.location.href;
    if (navigator.share) {
      await navigator.share({ title: guide.title, text: guide.description || undefined, url: shareUrl });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
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
          <p className="mt-4 text-sm text-slate-600">Loading your guide…</p>
        </div>
      </div>
    );
  }

  if (isError || !guide) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-slate-400" />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              {isCreatorPreview ? "Preview unavailable" : "Guide not found"}
            </h1>
            <p className="mt-2 text-slate-600">
              {isCreatorPreview
                ? "Sign in with access to this Guide, then try the preview again."
                : "This guide is unavailable or has not been published."}
            </p>
            <Button className="mt-5" variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go back
            </Button>
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
      {isCreatorPreview ? (
        <aside className="border-b border-violet-200 bg-violet-50 text-violet-950 print:hidden" aria-label="Creator preview">
          <div className="mx-auto flex min-h-11 max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8">
            <p className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
              <span>
                <strong>Creator preview.</strong>{" "}
                You&apos;re viewing the current draft as a lead. This visit is not counted.
              </span>
            </p>
            <a
              href={`/guide-editor/${guideId}`}
              className="rounded-md px-2 py-1 text-sm font-semibold text-violet-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            >
              Back to editor
            </a>
          </div>
        </aside>
      ) : null}

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
            {guide.views !== undefined && guide.views !== null ? (
              <span className="hidden items-center gap-1 text-xs opacity-50 lg:flex">
                <Eye className="h-4 w-4" />
                {guide.views} views
              </span>
            ) : null}
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
