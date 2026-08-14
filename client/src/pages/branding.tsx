import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useMutation } from "@tanstack/react-query";
import {
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  Image as ImageIcon,
  Link2,
  ListChecks,
  Loader2,
  LockKeyhole,
  MessageSquareQuote,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Type,
  Upload,
  UserRound,
} from "lucide-react";
import Sidebar from "@/components/sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_BRAND_APPEARANCE,
  SUPPORTED_BRAND_FONTS,
  getBrandFontStack,
  toBrandingAppearancePayload,
  useBranding,
  type BrandAppearance,
  type BrandingRole,
  type BrandingScope,
} from "@/hooks/useBranding";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

type ColorFieldName =
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "backgroundColor"
  | "surfaceColor"
  | "textColor";

type AssetFieldName =
  | "logoUrl"
  | "logoMarkUrl"
  | "faviconUrl"
  | "socialImageUrl";

const COLOR_PRESETS: Array<{
  name: string;
  description: string;
  colors: Pick<BrandAppearance, ColorFieldName>;
}> = [
  {
    name: "Clear signal",
    description: "Confident blue with a warm conversion accent",
    colors: {
      primaryColor: "#2563EB",
      secondaryColor: "#10B981",
      accentColor: "#F59E0B",
      backgroundColor: "#F8FAFC",
      surfaceColor: "#FFFFFF",
      textColor: "#0F172A",
    },
  },
  {
    name: "Editorial warmth",
    description: "Warm paper, deep ink, and a coral action color",
    colors: {
      primaryColor: "#E5572F",
      secondaryColor: "#16806A",
      accentColor: "#D99C21",
      backgroundColor: "#F4EFE6",
      surfaceColor: "#FFFCF7",
      textColor: "#101419",
    },
  },
  {
    name: "Modern plum",
    description: "Premium purple balanced by fresh teal",
    colors: {
      primaryColor: "#7C3AED",
      secondaryColor: "#0F9F8F",
      accentColor: "#F97316",
      backgroundColor: "#FAF7FF",
      surfaceColor: "#FFFFFF",
      textColor: "#22152F",
    },
  },
  {
    name: "Field notes",
    description: "Grounded greens for coaching and education",
    colors: {
      primaryColor: "#167052",
      secondaryColor: "#3568A8",
      accentColor: "#D97706",
      backgroundColor: "#F2F6F1",
      surfaceColor: "#FFFFFF",
      textColor: "#17251E",
    },
  },
];

const COLOR_FIELDS: Array<{
  field: ColorFieldName;
  label: string;
  description: string;
}> = [
  { field: "primaryColor", label: "Primary", description: "Buttons and key actions" },
  { field: "secondaryColor", label: "Secondary", description: "Supporting emphasis" },
  { field: "accentColor", label: "Accent", description: "Highlights and progress" },
  { field: "backgroundColor", label: "Canvas", description: "Page background" },
  { field: "surfaceColor", label: "Surface", description: "Cards and form areas" },
  { field: "textColor", label: "Text", description: "Headlines and body copy" },
];

const ASSET_CONFIG: Record<AssetFieldName, {
  endpoint: string;
  formKey: string;
  title: string;
  description: string;
  buttonLabel: string;
  shape: "wide" | "square" | "favicon" | "social";
}> = {
  logoUrl: {
    endpoint: "/api/branding/logo",
    formKey: "logo",
    title: "Wordmark",
    description: "Your primary horizontal logo for guide and quiz headers.",
    buttonLabel: "Upload wordmark",
    shape: "wide",
  },
  logoMarkUrl: {
    endpoint: "/api/branding/logo-mark",
    formKey: "logoMark",
    title: "Brand mark",
    description: "A compact square mark for smaller placements.",
    buttonLabel: "Upload mark",
    shape: "square",
  },
  faviconUrl: {
    endpoint: "/api/branding/favicon",
    formKey: "favicon",
    title: "Favicon",
    description: "The browser-tab icon shown on public magnets.",
    buttonLabel: "Upload favicon",
    shape: "favicon",
  },
  socialImageUrl: {
    endpoint: "/api/branding/social-image",
    formKey: "socialImage",
    title: "Social image",
    description: "A 1200 × 630 preview image for shared links.",
    buttonLabel: "Upload social image",
    shape: "social",
  },
};

const ROLE_LABELS: Record<BrandingRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

function colorPickerValue(value: string, fallback = "#000000") {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function foregroundFor(background: string) {
  const normalized = colorPickerValue(background, "#2563EB").slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? "#0F172A" : "#FFFFFF";
}

function isValidLink(value: string) {
  if (!value.trim()) return true;
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function responseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function responseError(response: Response) {
  const body = await responseBody(response);
  const detail = typeof body === "string"
    ? body
    : body && typeof body === "object" && "message" in body
      ? String((body as { message: unknown }).message)
      : response.statusText;

  return new Error(`${response.status}: ${detail}`);
}

async function saveBranding({
  appearance,
  scope,
}: {
  appearance: BrandAppearance;
  scope: Pick<BrandingScope, "kind" | "brandId">;
}) {
  const payload = toBrandingAppearancePayload(appearance);
  const expectedScope = {
    kind: scope.kind,
    brandId: scope.brandId,
  };
  const putResponse = await fetch("/api/branding", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appearance: payload, expectedScope }),
  });

  if (putResponse.ok) return responseBody(putResponse);
  if (putResponse.status !== 404 && putResponse.status !== 405) {
    throw await responseError(putResponse);
  }

  // Compatibility path for the original account-wide endpoint. Only send the
  // fields it knows so an older Drizzle insert cannot choke on new appearance keys.
  const postResponse = await fetch("/api/branding", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      logoUrl: payload.logoUrl,
      faviconUrl: payload.faviconUrl,
      primaryColor: payload.primaryColor,
      secondaryColor: payload.secondaryColor,
      accentColor: payload.accentColor,
      fontFamily: payload.fontFamily,
      companyName: payload.companyName,
      tagline: payload.tagline,
      expectedScope,
    }),
  });

  if (!postResponse.ok) throw await responseError(postResponse);
  return responseBody(postResponse);
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{children}</p>;
}

function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60 text-foreground">
      {children}
    </span>
  );
}

function AssetField({
  field,
  value,
  alt,
  disabled,
  isUploading,
  onChange,
  onUpload,
}: {
  field: AssetFieldName;
  value: string;
  alt: string;
  disabled: boolean;
  isUploading: boolean;
  onChange: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const config = ASSET_CONFIG[field];
  const inputId = `${field}-upload`;
  const previewClass = {
    wide: "h-16 w-full max-w-[180px]",
    square: "h-16 w-16",
    favicon: "h-10 w-10",
    social: "aspect-[1.91/1] w-full max-w-[180px]",
  }[config.shape];

  return (
    <div className="rounded-xl border bg-muted/15 p-4">
      <div className="flex min-h-16 items-start gap-4">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background",
            previewClass,
          )}
        >
          {value ? (
            <img src={value} alt={alt || config.title} className="h-full w-full object-contain p-1.5" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{config.title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{config.description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor={`${field}-url`} className="text-xs">Image URL</Label>
        <Input
          id={`${field}-url`}
          type="text"
          inputMode="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://… or /uploads/…"
          disabled={disabled}
        />
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={onUpload}
          disabled={disabled || isUploading}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => document.getElementById(inputId)?.click()}
          disabled={disabled || isUploading}
        >
          {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {isUploading ? "Uploading…" : config.buttonLabel}
        </Button>
      </div>
    </div>
  );
}

function ColorField({
  field,
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  field: ColorFieldName;
  label: string;
  description: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={field}>{label}</Label>
      <div className="mt-2 flex items-center gap-2">
        <label
          htmlFor={`${field}-picker`}
          className="relative h-10 w-12 shrink-0 overflow-hidden rounded-md border bg-background shadow-sm"
          title={`Choose ${label.toLowerCase()} color`}
        >
          <span className="absolute inset-1 rounded" style={{ backgroundColor: colorPickerValue(value) }} />
          <input
            id={`${field}-picker`}
            type="color"
            value={colorPickerValue(value)}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            disabled={disabled}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </label>
        <Input
          id={field}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#000000"
          maxLength={7}
          disabled={disabled}
          className="font-mono uppercase"
        />
      </div>
      <FieldHint>{description}</FieldHint>
    </div>
  );
}

function BrandHeader({ appearance, compact = false }: { appearance: BrandAppearance; compact?: boolean }) {
  const name = appearance.displayName || "Your brand";
  const logo = appearance.logoUrl || appearance.logoMarkUrl;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {logo ? (
        <img
          src={logo}
          alt={appearance.logoAltText || `${name} logo`}
          className={cn("shrink-0 object-contain", compact ? "h-7 max-w-24" : "h-9 max-w-32")}
        />
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg font-bold",
            compact ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm",
          )}
          style={{
            backgroundColor: appearance.primaryColor,
            color: foregroundFor(appearance.primaryColor),
          }}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      {!appearance.logoUrl && (
        <span className="truncate text-sm font-semibold" style={{ color: appearance.textColor }}>
          {name}
        </span>
      )}
    </div>
  );
}

function GuidePreview({ appearance }: { appearance: BrandAppearance }) {
  const headingFont = getBrandFontStack(appearance.headingFontFamily);
  const bodyFont = getBrandFontStack(appearance.bodyFontFamily);
  const onPrimary = foregroundFor(appearance.primaryColor);

  return (
    <div
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{ backgroundColor: appearance.backgroundColor, color: appearance.textColor, fontFamily: bodyFont }}
    >
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: `${appearance.textColor}18` }}>
        <BrandHeader appearance={appearance} compact />
        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ backgroundColor: `${appearance.accentColor}22`, color: appearance.textColor }}>
          Free guide
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: appearance.secondaryColor }}>
          Your practical playbook
        </p>
        <h3 className="mt-2 text-2xl font-bold leading-tight" style={{ fontFamily: headingFont }}>
          Turn your best ideas into a repeatable growth system
        </h3>
        <p className="mt-3 text-sm leading-6 opacity-75">
          A focused implementation guide with quick wins, a clear sequence, and the next right action.
        </p>

        <div className="mt-5 space-y-2.5">
          {["Choose the highest-value outcome", "Build the three-step action plan", "Measure and refine the result"].map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-lg border p-3 text-xs font-medium"
              style={{ backgroundColor: appearance.surfaceColor, borderColor: `${appearance.textColor}16` }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ backgroundColor: `${appearance.secondaryColor}20`, color: appearance.secondaryColor }}
              >
                {index + 1}
              </span>
              {item}
            </div>
          ))}
        </div>

        <button
          type="button"
          tabIndex={-1}
          className="mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold shadow-sm"
          style={{ backgroundColor: appearance.primaryColor, color: onPrimary }}
        >
          Start the action plan
        </button>
      </div>
    </div>
  );
}

function QuizPreview({ appearance }: { appearance: BrandAppearance }) {
  const headingFont = getBrandFontStack(appearance.headingFontFamily);
  const bodyFont = getBrandFontStack(appearance.bodyFontFamily);
  const onPrimary = foregroundFor(appearance.primaryColor);

  return (
    <div
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{ backgroundColor: appearance.backgroundColor, color: appearance.textColor, fontFamily: bodyFont }}
    >
      <div className="px-5 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <BrandHeader appearance={appearance} compact />
          <span className="text-[11px] font-semibold opacity-60">2 of 5</span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: `${appearance.textColor}14` }}>
          <div className="h-full w-2/5 rounded-full" style={{ backgroundColor: appearance.accentColor }} />
        </div>
      </div>

      <div className="p-5 pt-4 sm:p-6 sm:pt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: appearance.secondaryColor }}>
          Find your best next move
        </p>
        <h3 className="mt-2 text-xl font-bold leading-snug" style={{ fontFamily: headingFont }}>
          What is the biggest obstacle between your content and consistent leads?
        </h3>

        <div className="mt-5 space-y-2.5">
          {["I need a stronger offer", "I need a repeatable funnel", "I need better follow-up"].map((answer, index) => (
            <button
              key={answer}
              type="button"
              tabIndex={-1}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-left text-xs font-medium"
              style={{
                backgroundColor: appearance.surfaceColor,
                borderColor: index === 0 ? appearance.primaryColor : `${appearance.textColor}18`,
                boxShadow: index === 0 ? `0 0 0 1px ${appearance.primaryColor}` : undefined,
              }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                style={{
                  borderColor: index === 0 ? appearance.primaryColor : `${appearance.textColor}35`,
                  backgroundColor: index === 0 ? appearance.primaryColor : "transparent",
                  color: index === 0 ? onPrimary : appearance.textColor,
                }}
              >
                {index === 0 ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + index)}
              </span>
              {answer}
            </button>
          ))}
        </div>

        <button
          type="button"
          tabIndex={-1}
          className="mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold shadow-sm"
          style={{ backgroundColor: appearance.primaryColor, color: onPrimary }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto grid max-w-[1440px] gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
      <div className="space-y-6">
        {[300, 420, 320].map((height) => <Skeleton key={height} className="w-full rounded-xl" style={{ height }} />)}
      </div>
      <Skeleton className="h-[620px] w-full rounded-xl" />
    </div>
  );
}

export default function Branding() {
  const { toast } = useToast();
  const branding = useBranding();
  const {
    appearance,
    scope,
    capabilities,
    canEdit,
    isLoading,
    error,
    queryKey,
  } = branding;
  const [formData, setFormData] = useState<BrandAppearance>({ ...DEFAULT_BRAND_APPEARANCE });

  useEffect(() => {
    if (!isLoading) setFormData({ ...appearance });
  }, [appearance, isLoading]);

  useEffect(() => {
    if (!error) return;
    const resolvedError = error instanceof Error ? error : new Error("Unable to load branding settings");

    if (isUnauthorizedError(resolvedError)) {
      toast({
        title: "Your session expired",
        description: "Sign in again to continue editing your brand.",
        variant: "destructive",
      });
      const redirect = window.setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return () => window.clearTimeout(redirect);
    }

    toast({
      title: "Brand settings unavailable",
      description: "We could not load this workspace's appearance settings.",
      variant: "destructive",
    });
  }, [error, toast]);

  useEffect(() => {
    const selectedFonts = [formData.headingFontFamily, formData.bodyFontFamily];
    const families = Array.from(new Set(selectedFonts))
      .map((fontName) => SUPPORTED_BRAND_FONTS.find((font) => font.value === fontName)?.googleFamily)
      .filter(Boolean) as string[];
    const elementId = "vidmagnet-brand-preview-fonts";
    document.getElementById(elementId)?.remove();
    if (!families.length) return;

    const link = document.createElement("link");
    link.id = elementId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families.map((family) => `family=${family}`).join("&")}&display=swap`;
    document.head.appendChild(link);

    return () => link.remove();
  }, [formData.bodyFontFamily, formData.headingFontFamily]);

  const savedFingerprint = useMemo(
    () => JSON.stringify(toBrandingAppearancePayload(appearance)),
    [appearance],
  );
  const currentFingerprint = useMemo(
    () => JSON.stringify(toBrandingAppearancePayload(formData)),
    [formData],
  );
  const isDirty = currentFingerprint !== savedFingerprint;
  const previewName = formData.displayName || scope.workspaceName || "Your brand";
  const readOnlyReason = !scope.canEdit
    ? `${ROLE_LABELS[scope.role]} access can preview this identity but cannot change it.`
    : !capabilities.customBranding
      ? "Custom branding is not included in this workspace's current plan."
      : null;

  const updateField = <Field extends keyof BrandAppearance>(field: Field, value: BrandAppearance[Field]) => {
    setFormData((current) => {
      if (field === "displayName") {
        return { ...current, displayName: String(value), companyName: String(value) };
      }
      if (field === "bodyFontFamily") {
        return { ...current, bodyFontFamily: value as BrandAppearance["bodyFontFamily"], fontFamily: value as BrandAppearance["fontFamily"] };
      }
      return { ...current, [field]: value };
    });
  };

  const saveMutation = useMutation({
    mutationFn: saveBranding,
    onSuccess: (response) => {
      if (response && typeof response === "object") {
        queryClient.setQueryData(queryKey, response);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
      toast({
        title: "Brand identity saved",
        description: `${scope.workspaceName} is ready for brand-aware guides and quizzes.`,
      });
    },
    onError: (mutationError) => {
      const resolvedError = mutationError instanceof Error ? mutationError : new Error("Brand settings could not be saved");
      if (isUnauthorizedError(resolvedError)) {
        toast({
          title: "Your session expired",
          description: "Sign in again to save your brand identity.",
          variant: "destructive",
        });
        window.setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Could not save brand identity",
        description: resolvedError.message.replace(/^\d+:\s*/, "") || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ field, file }: { field: AssetFieldName; file: File }) => {
      const config = ASSET_CONFIG[field];
      const payload = new FormData();
      payload.append(config.formKey, file);
      const response = await fetch(config.endpoint, {
        method: "POST",
        credentials: "include",
        body: payload,
      });
      if (!response.ok) throw await responseError(response);

      const body = await responseBody(response);
      const root = body && typeof body === "object" ? body as Record<string, unknown> : {};
      const nestedAppearance = root.appearance && typeof root.appearance === "object"
        ? root.appearance as Record<string, unknown>
        : {};
      const url = nestedAppearance[field] ?? root[field];
      if (typeof url !== "string" || !url) throw new Error("The upload completed without an asset URL.");
      return url;
    },
    onSuccess: (url, variables) => {
      updateField(variables.field, url);
      toast({
        title: `${ASSET_CONFIG[variables.field].title} uploaded`,
        description: "Save changes to apply this asset to the active scope.",
      });
    },
    onError: (uploadError, variables) => {
      const resolvedError = uploadError instanceof Error ? uploadError : new Error("Upload failed");
      toast({
        title: `${ASSET_CONFIG[variables.field].title} upload failed`,
        description: resolvedError.message.replace(/^\d+:\s*/, "") || "Try a different image.",
        variant: "destructive",
      });
    },
  });

  const handleUpload = (field: AssetFieldName, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast({ title: "Choose a PNG, JPEG, or WebP file", description: "PNG, JPEG/JPG, and WebP files are supported.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image is too large", description: "Choose an image smaller than 5 MB.", variant: "destructive" });
      return;
    }
    uploadMutation.mutate({ field, file });
  };

  const validateAndSave = () => {
    if (!formData.displayName.trim()) {
      toast({ title: "Add a display name", description: "Public magnets need a clear brand name.", variant: "destructive" });
      return;
    }

    const invalidColor = COLOR_FIELDS.find(({ field }) => !/^#[0-9a-f]{6}$/i.test(formData[field]));
    if (invalidColor) {
      toast({ title: `Check ${invalidColor.label.toLowerCase()}`, description: "Use a six-digit hex color such as #2563EB.", variant: "destructive" });
      return;
    }

    const links = [
      ["Website", formData.websiteUrl],
      ["Privacy policy", formData.privacyUrl],
      ["Terms", formData.termsUrl],
      ["Wordmark", formData.logoUrl],
      ["Brand mark", formData.logoMarkUrl],
      ["Favicon", formData.faviconUrl],
      ["Social image", formData.socialImageUrl],
    ] as const;
    const invalidLink = links.find(([, value]) => !isValidLink(value));
    if (invalidLink) {
      toast({ title: `Check the ${invalidLink[0].toLowerCase()} URL`, description: "Use a complete http(s) URL or an uploaded / path.", variant: "destructive" });
      return;
    }

    saveMutation.mutate({ appearance: formData, scope });
  };

  const readiness = [
    { label: "Identity", ready: Boolean(formData.displayName.trim()) },
    { label: "Logo", ready: Boolean(formData.logoUrl || formData.logoMarkUrl) },
    { label: "Voice", ready: Boolean(formData.brandVoice.trim()) },
    { label: "Audience", ready: Boolean(formData.targetAudience.trim()) },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b bg-card/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Brand studio</h1>
                {isDirty && <Badge variant="secondary">Unsaved changes</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Create the identity your audience sees across guides, quizzes, and shared links.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData({ ...appearance })}
                disabled={!isDirty || saveMutation.isPending}
              >
                <RotateCcw />
                Revert
              </Button>
              <Button
                type="button"
                onClick={validateAndSave}
                disabled={!canEdit || !isDirty || saveMutation.isPending || isLoading}
                className="min-w-36"
              >
                {saveMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                {saveMutation.isPending ? "Saving…" : "Save identity"}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto mb-6 flex max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-stretch">
            <div className="flex flex-1 items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {scope.kind === "brand" ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active scope</p>
                <p className="truncate text-sm font-semibold">{scope.workspaceName}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Badge variant="outline">{scope.kind === "brand" ? "Brand" : "Personal"}</Badge>
                <Badge variant="secondary">{ROLE_LABELS[scope.role]}</Badge>
                {!canEdit && <Badge variant="outline" className="gap-1"><LockKeyhole className="h-3 w-3" /> Read only</Badge>}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm lg:min-w-[330px]">
              <ShieldCheck className={cn("h-5 w-5 shrink-0", capabilities.customBranding ? "text-emerald-600" : "text-muted-foreground")} />
              <div>
                <p className="text-sm font-semibold">
                  {capabilities.customBranding ? "Custom branding enabled" : "Plan-limited branding"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {capabilities.canHidePoweredBy ? "White-label publishing is available." : "VidMagnet attribution remains visible."}
                </p>
              </div>
            </div>
          </div>

          {readOnlyReason && (
            <Alert className="mx-auto mb-6 max-w-[1440px] border-amber-500/30 bg-amber-500/5">
              <LockKeyhole className="h-4 w-4" />
              <AlertTitle>Preview-only access</AlertTitle>
              <AlertDescription>{readOnlyReason}</AlertDescription>
            </Alert>
          )}

          {error && !isLoading && (
            <Alert variant="destructive" className="mx-auto mb-6 max-w-[1440px]">
              <LockKeyhole className="h-4 w-4" />
              <AlertTitle>Brand settings could not be loaded</AlertTitle>
              <AlertDescription>Refresh the page or sign in again before making changes.</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <LoadingState />
          ) : (
            <div className="mx-auto grid max-w-[1440px] gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
              <fieldset disabled={!canEdit} className="min-w-0 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <SectionIcon><Sparkles className="h-4 w-4" /></SectionIcon>
                      <div>
                        <CardTitle className="text-lg">Identity and assets</CardTitle>
                        <CardDescription className="mt-1">The recognizable name, message, and imagery carried into every magnet.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <Label htmlFor="display-name">Public display name</Label>
                        <Input
                          id="display-name"
                          value={formData.displayName}
                          onChange={(event) => updateField("displayName", event.target.value)}
                          placeholder="Acme Growth Lab"
                          className="mt-2"
                        />
                        <FieldHint>This remains compatible with the original company-name field.</FieldHint>
                      </div>
                      <div>
                        <Label htmlFor="tagline">Tagline</Label>
                        <Input
                          id="tagline"
                          value={formData.tagline}
                          onChange={(event) => updateField("tagline", event.target.value)}
                          placeholder="Build a smarter path to growth"
                          className="mt-2"
                        />
                        <FieldHint>Keep it short enough to sit beneath your logo.</FieldHint>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                      {(Object.keys(ASSET_CONFIG) as AssetFieldName[]).map((field) => (
                        <AssetField
                          key={field}
                          field={field}
                          value={formData[field]}
                          alt={formData.logoAltText}
                          disabled={!canEdit}
                          isUploading={uploadMutation.isPending && uploadMutation.variables?.field === field}
                          onChange={(value) => updateField(field, value)}
                          onUpload={(event) => handleUpload(field, event)}
                        />
                      ))}
                    </div>

                    <div>
                      <Label htmlFor="logo-alt-text">Logo alt text</Label>
                      <Input
                        id="logo-alt-text"
                        value={formData.logoAltText}
                        onChange={(event) => updateField("logoAltText", event.target.value)}
                        placeholder={`${previewName} logo`}
                        className="mt-2"
                      />
                      <FieldHint>Describe the logo briefly for people using screen readers.</FieldHint>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <SectionIcon><Palette className="h-4 w-4" /></SectionIcon>
                      <div>
                        <CardTitle className="text-lg">Color system</CardTitle>
                        <CardDescription className="mt-1">Define actions, emphasis, page canvas, content surfaces, and readable text.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Starting palettes</Label>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setFormData((current) => ({ ...current, ...preset.colors }))}
                            className="rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!canEdit}
                          >
                            <div className="flex items-center gap-1.5">
                              {[
                                preset.colors.primaryColor,
                                preset.colors.secondaryColor,
                                preset.colors.accentColor,
                                preset.colors.backgroundColor,
                              ].map((color) => (
                                <span key={color} className="h-5 w-5 rounded-full border" style={{ backgroundColor: color }} />
                              ))}
                            </div>
                            <p className="mt-2 text-sm font-semibold">{preset.name}</p>
                            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{preset.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                      {COLOR_FIELDS.map((color) => (
                        <ColorField
                          key={color.field}
                          {...color}
                          value={formData[color.field]}
                          disabled={!canEdit}
                          onChange={(value) => updateField(color.field, value)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <SectionIcon><Type className="h-4 w-4" /></SectionIcon>
                      <div>
                        <CardTitle className="text-lg">Typography and voice</CardTitle>
                        <CardDescription className="mt-1">Pair a clear visual voice with useful context for AI-generated content.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <Label htmlFor="heading-font">Heading font</Label>
                        <Select
                          value={formData.headingFontFamily}
                          onValueChange={(value) => updateField("headingFontFamily", value as BrandAppearance["headingFontFamily"])}
                          disabled={!canEdit}
                        >
                          <SelectTrigger id="heading-font" className="mt-2"><SelectValue placeholder="Choose a heading font" /></SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_BRAND_FONTS.map((font) => (
                              <SelectItem key={font.value} value={font.value}>
                                <span style={{ fontFamily: font.stack }}>{font.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldHint>Used for outcome promises, section titles, and quiz questions.</FieldHint>
                      </div>
                      <div>
                        <Label htmlFor="body-font">Body font</Label>
                        <Select
                          value={formData.bodyFontFamily}
                          onValueChange={(value) => updateField("bodyFontFamily", value as BrandAppearance["bodyFontFamily"])}
                          disabled={!canEdit}
                        >
                          <SelectTrigger id="body-font" className="mt-2"><SelectValue placeholder="Choose a body font" /></SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_BRAND_FONTS.map((font) => (
                              <SelectItem key={font.value} value={font.value}>
                                <span style={{ fontFamily: font.stack }}>{font.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldHint>Used for instructions, answers, forms, and supporting copy.</FieldHint>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-4">
                      <p className="text-xl font-bold" style={{ fontFamily: getBrandFontStack(formData.headingFontFamily) }}>
                        A headline that sounds and feels like you
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground" style={{ fontFamily: getBrandFontStack(formData.bodyFontFamily) }}>
                        Body copy stays easy to follow through every lesson, answer, and next step.
                      </p>
                    </div>

                    <Separator />

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <Label htmlFor="brand-voice" className="flex items-center gap-2"><MessageSquareQuote className="h-4 w-4" /> Brand voice</Label>
                        <Textarea
                          id="brand-voice"
                          value={formData.brandVoice}
                          onChange={(event) => updateField("brandVoice", event.target.value)}
                          placeholder="Direct, encouraging, practical, and specific. Avoid hype and unexplained jargon."
                          rows={5}
                          className="mt-2 resize-y"
                        />
                        <FieldHint>Describe tone, vocabulary, pacing, and anything generated content should avoid.</FieldHint>
                      </div>
                      <div>
                        <Label htmlFor="target-audience" className="flex items-center gap-2"><UserRound className="h-4 w-4" /> Target audience</Label>
                        <Textarea
                          id="target-audience"
                          value={formData.targetAudience}
                          onChange={(event) => updateField("targetAudience", event.target.value)}
                          placeholder="Independent coaches with an engaged audience who need a repeatable way to capture leads."
                          rows={5}
                          className="mt-2 resize-y"
                        />
                        <FieldHint>State who they are, what they want, and what is currently getting in their way.</FieldHint>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <SectionIcon><Link2 className="h-4 w-4" /></SectionIcon>
                      <div>
                        <CardTitle className="text-lg">Business links</CardTitle>
                        <CardDescription className="mt-1">Give public magnets a trusted destination and clear legal links.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-5 md:grid-cols-3">
                    <div>
                      <Label htmlFor="website-url">Website</Label>
                      <Input id="website-url" type="url" value={formData.websiteUrl} onChange={(event) => updateField("websiteUrl", event.target.value)} placeholder="https://example.com" className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="privacy-url">Privacy policy</Label>
                      <Input id="privacy-url" type="url" value={formData.privacyUrl} onChange={(event) => updateField("privacyUrl", event.target.value)} placeholder="https://example.com/privacy" className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="terms-url">Terms</Label>
                      <Input id="terms-url" type="url" value={formData.termsUrl} onChange={(event) => updateField("termsUrl", event.target.value)} placeholder="https://example.com/terms" className="mt-2" />
                    </div>
                  </CardContent>
                </Card>
              </fieldset>

              <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
                <Card className="overflow-hidden">
                  <CardHeader className="border-b bg-muted/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <SectionIcon><Eye className="h-4 w-4" /></SectionIcon>
                        <div>
                          <CardTitle className="text-lg">Live output preview</CardTitle>
                          <CardDescription className="mt-1">See one identity across both magnet formats.</CardDescription>
                        </div>
                      </div>
                      <span className="relative mt-1 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5">
                    <Tabs defaultValue="guide">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="guide" className="gap-2"><BookOpen className="h-4 w-4" /> Guide</TabsTrigger>
                        <TabsTrigger value="quiz" className="gap-2"><ListChecks className="h-4 w-4" /> Quiz</TabsTrigger>
                      </TabsList>
                      <TabsContent value="guide" className="mt-4"><GuidePreview appearance={formData} /></TabsContent>
                      <TabsContent value="quiz" className="mt-4"><QuizPreview appearance={formData} /></TabsContent>
                    </Tabs>
                    <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
                      Preview content is illustrative. Saved tokens become the default for brand-aware outputs.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Brand readiness</CardTitle>
                    <CardDescription>Four details make generated assets feel intentionally yours.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {readiness.map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.ready ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Ready</span>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">Add details</span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
