import { z } from "zod";
import type { PublicBrandAppearance } from "./branding";

export const librarySlugSchema = z
  .string()
  .trim()
  .min(8)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid library slug");

const optionalQueryText = (maxLength: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim().length === 0
    ? undefined
    : value,
  z.string().trim().min(1).max(maxLength).optional(),
);

export const publicLibraryQuerySchema = z.object({
  search: optionalQueryText(160),
  category: optionalQueryText(100),
  type: z.enum(["guide", "quiz"]).optional(),
}).strict();

export const includeInLibraryInputSchema = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean());

export const libraryInclusionUpdateSchema = z.object({
  includeInLibrary: includeInLibraryInputSchema,
}).strict();

export type LibraryContext = {
  slug: string;
  path: string;
};

export type PublicLibraryItem = {
  id: number;
  type: "guide" | "quiz";
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnailUrl: string | null;
  createdAt: string | null;
  href: string;
};

export type PublicMagnetLibrary = {
  library: LibraryContext & {
    name: string;
    description: string | null;
    branding: PublicBrandAppearance;
  };
  items: PublicLibraryItem[];
  categories: Array<{ name: string; count: number }>;
  total: number;
};

export type PublicLibraryQuery = z.infer<typeof publicLibraryQuerySchema>;
export type LibraryInclusionUpdate = z.infer<typeof libraryInclusionUpdateSchema>;

/**
 * Legacy rows intentionally keep a null value after the library migration.
 * Only a literal true opts a magnet into public discovery.
 */
export function isIncludedInLibrary(value: unknown): value is true {
  return value === true;
}

export function libraryPath(slug: string): string {
  return `/library/${encodeURIComponent(librarySlugSchema.parse(slug))}`;
}

export function createLibrarySlug(name: string, token: string): string {
  const readable = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "library";
  const stableToken = token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);
  if (stableToken.length < 6) {
    throw new Error("Library slug token must contain at least six letters or numbers");
  }
  return librarySlugSchema.parse(`${readable}-${stableToken}`.slice(0, 100));
}
