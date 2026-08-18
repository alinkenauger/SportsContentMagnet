const HEX_COLOR = /^#([\dA-Fa-f]{3}|[\dA-Fa-f]{6})$/;

export function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = HEX_COLOR.exec(value.trim());
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split("").map((character) => character + character).join("")
    : match[1];
  return `#${hex.toUpperCase()}`;
}

function relativeLuminance(value: string): number {
  const channels = [1, 3, 5].map((index) => {
    const channel = Number.parseInt(value.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

export function contrastRatio(
  foreground: string | null | undefined,
  background: string | null | undefined,
): number {
  const safeForeground = normalizeHexColor(foreground);
  const safeBackground = normalizeHexColor(background);
  if (!safeForeground || !safeBackground) return 0;
  const foregroundLuminance = relativeLuminance(safeForeground);
  const backgroundLuminance = relativeLuminance(safeBackground);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function mostReadableTextColor(background: string): "#101419" | "#FFFFFF" {
  return contrastRatio("#101419", background) >= contrastRatio("#FFFFFF", background)
    ? "#101419"
    : "#FFFFFF";
}

export function ensureReadableTextColor(
  candidate: string | null | undefined,
  background: string,
  minimumRatio = 4.5,
): string {
  const normalizedCandidate = normalizeHexColor(candidate);
  const normalizedBackground = normalizeHexColor(background) || "#FFFFFF";
  return normalizedCandidate
    && contrastRatio(normalizedCandidate, normalizedBackground) >= minimumRatio
    ? normalizedCandidate
    : mostReadableTextColor(normalizedBackground);
}
