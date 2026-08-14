import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Eye,
  Magnet,
  PlayCircle,
  Share2,
} from "lucide-react";
import GuideContentRenderer from "@/components/guide-content-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { safeHttpUrl, safePublicAssetUrl } from "@/lib/safe-url";

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
  };
  brandingSettings?: PublicBrandAppearance;
  branding?: PublicBrandAppearance | { appearance?: PublicBrandAppearance };
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
  const { data, isLoading, isError } = useQuery<GuideViewData>({
    queryKey: ["/api/guide", guideId, "public"],
    queryFn: async () => {
      const response = await fetch("/api/guide/" + guideId + "/public");
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

  useEffect(() => {
    if (!data || !guideId) return;
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
    apiRequest("/api/guides/" + guideId + "/view", "POST", {}).catch(() => undefined);
  }, [data, guideId]);

  const handleShare = async () => {
    if (!guide) return;
    if (navigator.share) {
      await navigator.share({ title: guide.title, text: guide.description || undefined, url: window.location.href });
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
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Guide not found</h1>
            <p className="mt-2 text-slate-600">This guide is unavailable or has not been published.</p>
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
    <div className="min-h-screen" style={{ backgroundColor, color: textColor, fontFamily: bodyFont }}>
      <header className="border-b" style={{ backgroundColor: surfaceColor, borderColor: primaryColor + "22" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={publicBrandName(branding) + " logo"}
                className="h-10 max-w-[180px] object-contain"
              />
            ) : (
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <Magnet className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold" style={{ fontFamily: headingFont }}>
                {publicBrandName(branding)}
              </p>
              {branding.tagline ? <p className="hidden truncate text-xs opacity-60 sm:block">{branding.tagline}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {guide.views !== undefined && guide.views !== null ? (
              <span className="hidden items-center gap-1 text-xs opacity-60 sm:flex">
                <Eye className="h-4 w-4" />
                {guide.views} views
              </span>
            ) : null}
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            {ctaUrl ? (
              <Button
                size="sm"
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

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div
          className="border p-5 shadow-sm sm:p-8 lg:p-12"
          style={{ backgroundColor: surfaceColor, borderColor: primaryColor + "20", borderRadius: "24px" }}
        >
          <GuideContentRenderer
            content={guide.content}
            youtubeUrl={guide.youtubeUrl}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            accentColor={accentColor}
            headingFontFamily={headingFont}
            fontFamily={bodyFont}
            surfaceColor={surfaceColor}
            textColor={textColor}
          />
        </div>

        {guide.youtubeVideoId ? (
          <details
            className="group mt-6 border"
            style={{ backgroundColor: surfaceColor, borderColor: primaryColor + "20", borderRadius: "16px" }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold">
              <span className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" style={{ color: primaryColor }} />
                Source video and references
              </span>
              <span className="text-xs font-normal opacity-60 group-open:hidden">Open</span>
            </summary>
            <div className="border-t p-4 sm:p-5" style={{ borderColor: primaryColor + "18" }}>
              <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={"https://www.youtube.com/embed/" + guide.youtubeVideoId + "?rel=0"}
                  title={guide.title + " source video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {guide.channelTitle ? <p className="mt-3 text-xs opacity-60">Source: {guide.channelTitle}</p> : null}
            </div>
          </details>
        ) : null}
      </main>

      <footer className="border-t" style={{ backgroundColor: surfaceColor, borderColor: primaryColor + "20" }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-xs opacity-65 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
