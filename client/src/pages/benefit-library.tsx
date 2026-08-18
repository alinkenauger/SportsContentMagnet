import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  FileDown,
  Gift,
  Link2,
  Loader2,
  MousePointerClick,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Video,
} from "lucide-react";

import Sidebar from "@/components/sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

type BenefitAssetType = "free_gift" | "cta";

interface BenefitAsset {
  id: string | number;
  type?: BenefitAssetType;
  kind?: BenefitAssetType;
  title: string;
  benefitSummary?: string | null;
  description?: string | null;
  url: string;
  buttonLabel?: string | null;
  tags?: string[] | string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface BenefitAssetForm {
  type: BenefitAssetType;
  title: string;
  benefitSummary: string;
  url: string;
  buttonLabel: string;
  tags: string;
  status: string;
}

const EMPTY_FORM: BenefitAssetForm = {
  type: "free_gift",
  title: "",
  benefitSummary: "",
  url: "",
  buttonLabel: "Get the free gift",
  tags: "",
  status: "active",
};

const BASE_STATUSES = ["active", "archived"];

async function fetchBenefitAssets(brandScope: number | "personal"): Promise<BenefitAsset[]> {
  const response = await fetch(
    `/api/benefit-assets?brandId=${encodeURIComponent(String(brandScope))}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    const message = (await response.text()) || response.statusText;
    throw new Error(message || "Unable to load benefit assets.");
  }

  const payload: BenefitAsset[] | { assets?: BenefitAsset[] } = await response.json();
  return Array.isArray(payload) ? payload : payload.assets || [];
}

function getAssetType(asset: BenefitAsset): BenefitAssetType {
  return asset.kind || asset.type || "free_gift";
}

function getAssetSummary(asset: BenefitAsset) {
  return asset.benefitSummary || asset.description || "";
}

function getTags(tags: BenefitAsset["tags"]): string[] {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (!tags) return [];

  const trimmed = tags.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // Fall through to comma-separated values for legacy records.
    }
  }

  return trimmed
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function displayStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function urlLabel(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}

function typeLabel(type: BenefitAssetType) {
  return type === "free_gift" ? "Free gift" : "Call to action";
}

export default function BenefitLibrary() {
  const { toast } = useToast();
  const { user } = useAuth();
  const brandScope = user?.currentBrandId ?? "personal";
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | BenefitAssetType>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<BenefitAsset | null>(null);
  const [form, setForm] = useState<BenefitAssetForm>(EMPTY_FORM);

  const assetsQuery = useQuery<BenefitAsset[], Error>({
    queryKey: ["/api/benefit-assets", brandScope],
    queryFn: () => fetchBenefitAssets(brandScope),
    retry: false,
  });

  const createMutation = useMutation<BenefitAsset, Error, BenefitAssetForm>({
    mutationFn: async (values) => {
      const response = await apiRequest("/api/benefit-assets", "POST", toPayload(values));
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/benefit-assets"] });
      closeDialog();
      toast({
        title: "Benefit saved",
        description: "Your new library asset is ready to use in quiz outcomes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to create asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation<BenefitAsset, Error, BenefitAssetForm>({
    mutationFn: async (values) => {
      if (!editingAsset) throw new Error("Choose an asset to edit first.");
      const response = await apiRequest(
        `/api/benefit-assets/${encodeURIComponent(String(editingAsset.id))}`,
        "PUT",
        toPayload(values),
      );
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/benefit-assets"] });
      closeDialog();
      toast({
        title: "Benefit updated",
        description: "Your changes will apply anywhere this asset is used.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to update asset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assets = assetsQuery.data || [];
  const availableStatuses = useMemo(() => {
    const statuses = assets
      .map((asset) => asset.status)
      .filter((status): status is string => Boolean(status));
    return Array.from(new Set([...BASE_STATUSES, ...statuses]));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...assets]
      .filter((asset) => typeFilter === "all" || getAssetType(asset) === typeFilter)
      .filter((asset) => statusFilter === "all" || (asset.status || "active") === statusFilter)
      .filter((asset) => {
        if (!query) return true;
        const searchText = [
          asset.title,
          getAssetSummary(asset),
          asset.url,
          asset.buttonLabel || "",
          ...getTags(asset.tags),
        ]
          .join(" ")
          .toLowerCase();
        return searchText.includes(query);
      })
      .sort((first, second) => first.title.localeCompare(second.title));
  }, [assets, searchQuery, statusFilter, typeFilter]);

  const counts = useMemo(
    () => ({
      total: assets.length,
      gifts: assets.filter((asset) => getAssetType(asset) === "free_gift").length,
      ctas: assets.filter((asset) => getAssetType(asset) === "cta").length,
      active: assets.filter((asset) => (asset.status || "active") === "active").length,
    }),
    [assets],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function toPayload(values: BenefitAssetForm) {
    return {
      kind: values.type,
      title: values.title.trim(),
      description: values.benefitSummary.trim(),
      benefitSummary: values.benefitSummary.trim(),
      url: values.url.trim(),
      buttonLabel: values.buttonLabel.trim(),
      tags: values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: values.status,
    };
  }

  function openCreateDialog() {
    setEditingAsset(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(asset: BenefitAsset) {
    const type = getAssetType(asset);
    setEditingAsset(asset);
    setForm({
      type,
      title: asset.title,
      benefitSummary: getAssetSummary(asset),
      url: asset.url,
      buttonLabel:
        asset.buttonLabel || (type === "free_gift" ? "Get the free gift" : "Take the next step"),
      tags: getTags(asset.tags).join(", "),
      status: asset.status || "active",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingAsset(null);
    setForm(EMPTY_FORM);
  }

  function updateForm<Field extends keyof BenefitAssetForm>(
    field: Field,
    value: BenefitAssetForm[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleTypeChange(type: BenefitAssetType) {
    setForm((current) => {
      const previousDefault =
        current.type === "free_gift" ? "Get the free gift" : "Take the next step";
      const nextDefault = type === "free_gift" ? "Get the free gift" : "Take the next step";
      return {
        ...current,
        type,
        buttonLabel:
          !current.buttonLabel || current.buttonLabel === previousDefault
            ? nextDefault
            : current.buttonLabel,
      };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingAsset) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden shrink-0 lg:block">
        <Sidebar />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Video className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-foreground">VidMagnet</p>
            <p className="text-xs text-muted-foreground">Benefit Library</p>
          </div>
        </div>

        <header className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-6">
            <div>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">Reusable value library</p>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Benefit Library
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Keep your best free gifts and calls to action organized, then match them to quiz outcomes.
              </p>
            </div>
            <Button onClick={openCreateDialog} className="w-full gradient-primary text-white sm:w-auto">
              <Plus className="h-4 w-4" />
              Add benefit
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <section aria-label="Library summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Total assets" value={counts.total} icon={Sparkles} iconClass="bg-blue-50 text-blue-600" />
            <SummaryCard label="Free gifts" value={counts.gifts} icon={FileDown} iconClass="bg-amber-50 text-amber-600" />
            <SummaryCard label="Calls to action" value={counts.ctas} icon={MousePointerClick} iconClass="bg-emerald-50 text-emerald-600" />
            <SummaryCard label="Active" value={counts.active} icon={Link2} iconClass="bg-violet-50 text-violet-600" />
          </section>

          <Card className="mt-6 border-border shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Search benefit library"
                    placeholder="Search titles, benefits, URLs, or tags…"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | BenefitAssetType)}>
                  <SelectTrigger aria-label="Filter by asset type">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="free_gift">Free gifts</SelectItem>
                    <SelectItem value="cta">Calls to action</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger aria-label="Filter by status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {displayStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {filteredAssets.length} {filteredAssets.length === 1 ? "asset" : "assets"}
            </p>
            {(searchQuery || typeFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {assetsQuery.isLoading && (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading benefit library">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <Card key={item} className="h-64 animate-pulse border-border bg-card">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-xl bg-muted" />
                    <div className="mt-5 h-5 w-2/3 rounded bg-muted" />
                    <div className="mt-3 h-4 w-full rounded bg-muted" />
                    <div className="mt-2 h-4 w-4/5 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {assetsQuery.isError && (
            <Alert variant="destructive" className="mt-6">
              <AlertTitle>Unable to load the Benefit Library</AlertTitle>
              <AlertDescription>{assetsQuery.error.message}</AlertDescription>
            </Alert>
          )}

          {!assetsQuery.isLoading && !assetsQuery.isError && filteredAssets.length === 0 && (
            <Card className="mt-6 border-dashed border-border bg-card/70">
              <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  {assets.length === 0 ? <Gift className="h-6 w-6" /> : <Search className="h-6 w-6" />}
                </div>
                <h2 className="mt-5 text-xl font-bold text-foreground">
                  {assets.length === 0 ? "Build your benefit library" : "No assets match these filters"}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {assets.length === 0
                    ? "Add a free resource or next-step offer once, then reuse it across your lead magnets and quiz results."
                    : "Try a broader search, choose another type, or clear your filters."}
                </p>
                {assets.length === 0 && (
                  <Button onClick={openCreateDialog} className="mt-6 gradient-primary text-white">
                    <Plus className="h-4 w-4" />
                    Add your first benefit
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {!assetsQuery.isLoading && !assetsQuery.isError && filteredAssets.length > 0 && (
            <section aria-label="Benefit assets" className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} onEdit={() => openEditDialog(asset)} />
              ))}
            </section>
          )}
        </main>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !isSaving) closeDialog();
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Edit benefit" : "Add a benefit"}</DialogTitle>
            <DialogDescription>
              Create a reusable free gift or call to action for your lead magnet outcomes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="asset-type">Asset type</Label>
              <Select value={form.type} onValueChange={(value) => handleTypeChange(value as BenefitAssetType)}>
                <SelectTrigger id="asset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_gift">Free gift</SelectItem>
                  <SelectItem value="cta">Call to action</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="asset-title">Title</Label>
                <Input
                  id="asset-title"
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  placeholder={form.type === "free_gift" ? "7-Day Practice Plan" : "Book a Strategy Call"}
                  required
                  maxLength={160}
                  autoFocus
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="asset-benefit">Benefit summary</Label>
                <Textarea
                  id="asset-benefit"
                  value={form.benefitSummary}
                  onChange={(event) => updateForm("benefitSummary", event.target.value)}
                  placeholder="Explain the specific win this gives the lead."
                  required
                  maxLength={600}
                  className="min-h-24 resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  This copy helps creators choose the right benefit and may appear on public result pages.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="asset-url">Destination URL</Label>
                <Input
                  id="asset-url"
                  type="url"
                  inputMode="url"
                  value={form.url}
                  onChange={(event) => updateForm("url", event.target.value)}
                  placeholder="https://example.com/your-resource"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-button-label">Button label</Label>
                <Input
                  id="asset-button-label"
                  value={form.buttonLabel}
                  onChange={(event) => updateForm("buttonLabel", event.target.value)}
                  placeholder="Get the free gift"
                  required
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-status">Status</Label>
                <Select value={form.status} onValueChange={(value) => updateForm("status", value)}>
                  <SelectTrigger id="asset-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BASE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {displayStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="asset-tags">Tags</Label>
                <Input
                  id="asset-tags"
                  value={form.tags}
                  onChange={(event) => updateForm("tags", event.target.value)}
                  placeholder="golf, beginner, lead generation"
                />
                <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gradient-primary text-white">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? "Saving…" : editingAsset ? "Save changes" : "Add to library"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: typeof Gift;
  iconClass: string;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex items-center gap-3 p-4 sm:p-5">
        <div className={cn("hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex", iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AssetCard({ asset, onEdit }: { asset: BenefitAsset; onEdit: () => void }) {
  const type = getAssetType(asset);
  const summary = getAssetSummary(asset);
  const tags = getTags(asset.tags);
  const status = asset.status || "active";
  const isGift = type === "free_gift";

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn("h-1 w-full", isGift ? "bg-amber-400" : "bg-emerald-500")} />
      <CardContent className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              isGift ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600",
            )}
          >
            {isGift ? <FileDown className="h-5 w-5" /> : <MousePointerClick className="h-5 w-5" />}
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Badge variant="outline" className={isGift ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
              {typeLabel(type)}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                status === "active" && "border-blue-200 bg-blue-50 text-blue-700",
                status === "draft" && "border-slate-200 bg-slate-50 text-slate-600",
                status === "archived" && "border-violet-200 bg-violet-50 text-violet-700",
              )}
            >
              {displayStatus(status)}
            </Badge>
          </div>
        </div>

        <h2 className="mt-5 line-clamp-2 text-lg font-bold leading-6 text-foreground">{asset.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {summary || "No benefit summary has been added yet."}
        </p>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">
                {tag}
              </Badge>
            ))}
            {tags.length > 4 && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">
                +{tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-auto pt-5">
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{urlLabel(asset.url)}</span>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="ghost" size="icon" asChild title="Open destination">
              <a href={asset.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${asset.title}`}>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
