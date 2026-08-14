type DirectGuideCandidate = {
  magnetType: string | null;
  status: string | null;
};

/**
 * Direct guide links intentionally include unlisted guides. Discovery queries
 * remain stricter and only return published guides.
 */
export function isDirectlyAccessibleGuide(
  guide: DirectGuideCandidate | null | undefined,
): guide is DirectGuideCandidate {
  return Boolean(
    guide &&
    guide.magnetType === "guide" &&
    (guide.status === "published" || guide.status === "unlisted"),
  );
}
