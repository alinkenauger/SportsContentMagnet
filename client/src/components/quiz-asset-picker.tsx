import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Gift } from "lucide-react";

export interface BenefitAsset {
  id: number;
  kind: string;
  title: string;
  description?: string | null;
  benefitSummary?: string | null;
  url: string;
  buttonLabel?: string | null;
  tags?: string[] | null;
  status: string;
}

interface QuizAssetPickerProps {
  id: string;
  label: string;
  value: number | null;
  assets: BenefitAsset[];
  onChange: (assetId: number | null) => void;
  placeholder: string;
  helpText?: string;
  isLoading?: boolean;
}

export default function QuizAssetPicker({
  id,
  label,
  value,
  assets,
  onChange,
  placeholder,
  helpText,
  isLoading = false,
}: QuizAssetPickerProps) {
  const selectedAsset = assets.find((asset) => asset.id === value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value === null ? "none" : String(value)}
        onValueChange={(nextValue) =>
          onChange(nextValue === "none" ? null : Number(nextValue))
        }
        disabled={isLoading}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={isLoading ? "Loading assets..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No asset selected</SelectItem>
          {assets.map((asset) => (
            <SelectItem
              key={asset.id}
              value={String(asset.id)}
              disabled={asset.status !== "active"}
            >
              {asset.title} ({asset.status === "active" ? asset.kind : "archived"})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      {selectedAsset && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex items-start gap-3 p-3">
            <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
              <Gift className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{selectedAsset.title}</p>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {selectedAsset.kind}
                </Badge>
                {selectedAsset.status !== "active" && (
                  <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
                    Archived — replace before saving
                  </Badge>
                )}
              </div>
              {(selectedAsset.benefitSummary || selectedAsset.description) && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {selectedAsset.benefitSummary || selectedAsset.description}
                </p>
              )}
              <a
                href={selectedAsset.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center text-xs font-medium text-primary hover:underline"
              >
                {selectedAsset.buttonLabel || "Open asset"}
                <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
