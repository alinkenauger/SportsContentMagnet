import type { CSSProperties } from "react";
import { BookOpen } from "lucide-react";
import { Link } from "wouter";

import { cn } from "@/lib/utils";
import type { LibraryContext } from "@shared/library";

interface PublicLibraryLinkProps {
  library?: LibraryContext | null;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

/**
 * Keeps the recipient's collection one tap away without leaking a library link
 * for magnets that the publisher intentionally left out of the catalog.
 */
export function PublicLibraryLink({
  library,
  className,
  style,
  label = "Library",
}: PublicLibraryLinkProps) {
  if (!library) return null;

  return (
    <Link
      href={library.path}
      className={cn(
        "inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-2 rounded-md border px-0 text-sm font-semibold transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 sm:px-3",
        className,
      )}
      style={style}
      aria-label={`Open ${label}`}
    >
      <BookOpen className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
