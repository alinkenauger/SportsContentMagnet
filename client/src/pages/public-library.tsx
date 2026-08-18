import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  FileText,
  LibraryBig,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Link, useParams } from "wouter";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureReadableTextColor, normalizeHexColor } from "@/lib/color-contrast";
import { safePublicAssetUrl } from "@/lib/safe-url";
import type { PublicLibraryItem, PublicMagnetLibrary } from "@shared/library";

type MagnetTypeFilter = "all" | "guide" | "quiz";

function readableLabel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeItemHref(item: PublicLibraryItem) {
  try {
    const parsed = new URL(item.href, window.location.origin);
    if (parsed.origin !== window.location.origin) return undefined;
    const expectedPrefix = item.type === "quiz" ? "/quiz/" : "/guide/";
    if (!parsed.pathname.startsWith(expectedPrefix)) return undefined;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return undefined;
  }
}

function LibrarySkeleton() {
  return (
    <div className="min-h-screen bg-[#F6F4EF] px-4 py-8 sm:px-6 sm:py-12" aria-busy="true">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PublicLibrary() {
  const { slug } = useParams<{ slug: string }>();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState<MagnetTypeFilter>("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const libraryQuery = useQuery<PublicMagnetLibrary, Error>({
    queryKey: ["/api/public/libraries", slug, search, category, type],
    enabled: Boolean(slug),
    retry: false,
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (category !== "all") query.set("category", category);
      if (type !== "all") query.set("type", type);
      const suffix = query.size ? `?${query.toString()}` : "";
      const response = await fetch(
        `/api/public/libraries/${encodeURIComponent(slug)}${suffix}`,
        { credentials: "include" },
      );
      if (!response.ok) {
        const message = (await response.text()) || response.statusText;
        throw new Error(message || "Unable to load this library.");
      }
      return response.json() as Promise<PublicMagnetLibrary>;
    },
  });

  const data = libraryQuery.data;
  const branding = data?.library.branding;
  const primaryColor = normalizeHexColor(branding?.primaryColor) || "#2563EB";
  const secondaryColor = normalizeHexColor(branding?.secondaryColor) || "#10B981";
  const accentColor = normalizeHexColor(branding?.accentColor) || "#F59E0B";
  const backgroundColor = normalizeHexColor(branding?.backgroundColor) || "#F6F4EF";
  const surfaceColor = normalizeHexColor(branding?.surfaceColor) || "#FFFFFF";
  const textColor = ensureReadableTextColor(branding?.textColor, backgroundColor);
  const surfaceTextColor = ensureReadableTextColor(branding?.textColor, surfaceColor);
  const primaryTextColor = ensureReadableTextColor(primaryColor, surfaceColor);
  const accentTextColor = ensureReadableTextColor(accentColor, surfaceColor);
  const headingFont = branding?.headingFontFamily || branding?.fontFamily || "Inter";
  const bodyFont = branding?.bodyFontFamily || branding?.fontFamily || "Inter";
  const logoUrl = safePublicAssetUrl(branding?.logoUrl);

  useEffect(() => {
    if (!data) return;
    document.title = `${data.library.name} — ${branding?.displayName || branding?.companyName || "Library"}`;
    const favicon = safePublicAssetUrl(branding?.faviconUrl);
    if (!favicon) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;
  }, [branding?.companyName, branding?.displayName, branding?.faviconUrl, data]);

  const categoryOptions = useMemo(
    () => data?.categories || [],
    [data?.categories],
  );
  const isFiltered = Boolean(search || category !== "all" || type !== "all");
  const pageStyles = {
    "--library-primary": primaryColor,
    "--library-secondary": secondaryColor,
    "--library-accent": accentColor,
    backgroundColor,
    color: textColor,
    fontFamily: bodyFont,
  } as CSSProperties;

  if (libraryQuery.isLoading) return <LibrarySkeleton />;

  if (libraryQuery.isError || !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F6F4EF] px-4">
        <section className="max-w-md text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm">
            <LibraryBig className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-slate-950">This library is unavailable</h1>
          <p className="mt-2 leading-7 text-slate-600">
            The link may have changed, or the business has not published any resources here yet.
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen" style={pageStyles}>
      <header
        className="relative overflow-hidden border-b"
        style={{ backgroundColor: surfaceColor, borderColor: `${primaryColor}24`, color: surfaceTextColor }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-40 h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: `${primaryColor}18` }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 left-1/3 h-56 w-56 rounded-full blur-3xl"
          style={{ backgroundColor: `${secondaryColor}15` }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={branding?.logoAltText || `${branding?.displayName || branding?.companyName || "Brand"} logo`}
                className="h-10 max-w-[180px] object-contain sm:h-12"
              />
            ) : (
              <span
                className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-sm"
                style={{ backgroundColor: primaryColor, color: branding?.onPrimaryColor || "#FFFFFF" }}
              >
                <LibraryBig className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold" style={{ fontFamily: headingFont }}>
                {branding?.displayName || branding?.companyName || "Resource library"}
              </p>
              {branding?.tagline ? (
                <p className="hidden truncate text-xs opacity-60 sm:block">{branding.tagline}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-10 max-w-3xl sm:mt-14">
            <Badge
              variant="outline"
              className="mb-4 rounded-full bg-white/70 px-3 py-1"
              style={{ borderColor: `${primaryTextColor}35`, color: primaryTextColor }}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Always growing
            </Badge>
            <h1
              className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
              style={{ fontFamily: headingFont }}
            >
              {data.library.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 opacity-70 sm:text-lg">
              {data.library.description ||
                "A growing collection of practical guides, workouts, and interactive quizzes created to help you make progress."}
            </p>
            <p className="mt-5 text-sm font-semibold opacity-60">
              {data.total} {data.total === 1 ? "resource" : "resources"} available
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <section aria-label="Find a resource" className="space-y-5">
          <div
            className="flex flex-col gap-3 rounded-3xl border p-3 shadow-sm sm:flex-row sm:items-center"
            style={{ backgroundColor: surfaceColor, borderColor: `${primaryColor}22`, color: surfaceTextColor }}
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-45" aria-hidden="true" />
              <Input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search workouts, topics, or skills…"
                aria-label="Search the library"
                className="h-12 border-0 bg-transparent pl-12 text-base shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-2 border-t pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0" style={{ borderColor: `${textColor}14` }}>
              <SlidersHorizontal className="ml-1 hidden h-4 w-4 opacity-45 sm:block" aria-hidden="true" />
              {(["all", "guide", "quiz"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    setType(filter);
                    setCategory("all");
                  }}
                  aria-pressed={type === filter}
                  className="flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:flex-none"
                  style={type === filter
                    ? { backgroundColor: primaryColor, color: branding?.onPrimaryColor || "#FFFFFF" }
                    : { backgroundColor: `${textColor}08`, color: textColor }}
                >
                  {filter === "all" ? "All" : filter === "quiz" ? "Interactive Quizzes" : "Guides"}
                </button>
              ))}
            </div>
          </div>

          {categoryOptions.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Filter by category">
              <button
                type="button"
                onClick={() => setCategory("all")}
                aria-pressed={category === "all"}
                className="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                style={category === "all"
                  ? { borderColor: primaryTextColor, backgroundColor: `${primaryColor}12`, color: primaryTextColor }
                  : { borderColor: `${textColor}20`, backgroundColor: surfaceColor }}
              >
                All topics
              </button>
              {categoryOptions.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => setCategory(option.name)}
                  aria-pressed={category === option.name}
                  className="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                  style={category === option.name
                    ? { borderColor: primaryTextColor, backgroundColor: `${primaryColor}12`, color: primaryTextColor }
                    : { borderColor: `${textColor}20`, backgroundColor: surfaceColor }}
                >
                  {readableLabel(option.name)} <span className="ml-1 opacity-55">{option.count}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-8" aria-live="polite" aria-busy={libraryQuery.isFetching}>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold opacity-55">Explore the collection</p>
              <h2 className="mt-1 text-2xl font-bold" style={{ fontFamily: headingFont }}>
                {isFiltered ? `${data.total} matching ${data.total === 1 ? "resource" : "resources"}` : "Newest resources"}
              </h2>
            </div>
            {isFiltered ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setCategory("all");
                  setType("all");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          {data.items.length === 0 ? (
            <div
              className="rounded-3xl border border-dashed px-6 py-16 text-center"
              style={{ backgroundColor: `${surfaceColor}AA`, borderColor: `${textColor}25` }}
            >
              <Search className="mx-auto h-8 w-8 opacity-35" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-bold" style={{ fontFamily: headingFont }}>No resources found</h3>
              <p className="mx-auto mt-2 max-w-md leading-7 opacity-60">
                Try a broader search, another topic, or view every resource in the library.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((item, index) => {
                const thumbnailUrl = safePublicAssetUrl(item.thumbnailUrl);
                const href = safeItemHref(item);
                const itemAccent = item.type === "quiz" ? accentTextColor : primaryTextColor;
                const card = (
                  <article
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
                    style={{ backgroundColor: surfaceColor, borderColor: `${surfaceTextColor}14`, color: surfaceTextColor }}
                  >
                    <div className="relative aspect-[16/9] overflow-hidden" style={{ backgroundColor: `${itemAccent}12` }}>
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 grid place-items-center"
                          style={{
                            backgroundImage: `radial-gradient(circle at 78% 20%, ${secondaryColor}30, transparent 30%), linear-gradient(135deg, ${itemAccent}20, ${surfaceColor})`,
                          }}
                        >
                          <span
                            className="grid h-14 w-14 place-items-center rounded-2xl shadow-sm"
                            style={{ backgroundColor: surfaceColor, color: itemAccent }}
                          >
                            {item.type === "quiz" ? <Sparkles className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                          </span>
                        </div>
                      )}
                      <Badge
                        className="absolute left-4 top-4 rounded-full border-0 px-3 py-1 shadow-sm"
                        style={{ backgroundColor: surfaceColor, color: itemAccent }}
                      >
                        {item.type === "quiz" ? "Interactive Quiz" : "Guide"}
                      </Badge>
                      {index < 2 && !isFiltered ? (
                        <Badge className="absolute right-4 top-4 border-0 bg-black/70 text-white hover:bg-black/70">New</Badge>
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <p className="text-xs font-bold" style={{ color: itemAccent }}>
                        {readableLabel(item.category || "General")}
                      </p>
                      <h3
                        className="mt-2 text-balance text-xl font-bold leading-snug"
                        style={{ fontFamily: headingFont }}
                      >
                        {item.title}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 opacity-65">
                        {item.description || (item.type === "quiz"
                          ? "Answer a few focused questions to get a personalized result."
                          : "Open this resource for practical guidance and next steps.")}
                      </p>

                      {item.tags.length > 0 ? (
                        <div className="mt-5 flex flex-wrap gap-1.5">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: `${textColor}08` }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-bold" style={{ color: itemAccent }}>
                        {item.type === "quiz" ? "Take the quiz" : "Open guide"}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </div>
                  </article>
                );

                return href ? (
                  <Link key={`${item.type}-${item.id}`} href={href} className="rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4">
                    {card}
                  </Link>
                ) : (
                  <div key={`${item.type}-${item.id}`}>{card}</div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 border-t" style={{ borderColor: `${surfaceTextColor}14`, backgroundColor: surfaceColor, color: surfaceTextColor }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-7 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-semibold">{branding?.displayName || branding?.companyName || data.library.name}</p>
          <div className="flex flex-col items-start gap-2 opacity-60 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-4">
            <span>New resources are added here as they are published.</span>
            {branding?.showPoweredBy ? (
              <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Powered by VidMagnet</span>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
