export function safeHttpUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function safePublicAssetUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("/")) {
    return /^\/uploads\/branding\/[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/.test(value)
      ? value
      : undefined;
  }
  try {
    const url = new URL(value);
    if (url.origin === window.location.origin) {
      return /^\/uploads\/branding\/[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/.test(url.pathname)
        && !url.search
        && !url.hash
        ? url.toString()
        : undefined;
    }
  } catch {
    return undefined;
  }
  return safeHttpUrl(value);
}
