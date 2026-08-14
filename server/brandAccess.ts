import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "./db";
import {
  brands,
  brandUsers,
  users,
  type Brand,
  type Guide,
} from "@shared/schema";
import {
  brandRoleAllows,
  type BrandAccessAction,
  type BrandRole,
} from "@shared/branding";

export type { BrandAccessAction } from "@shared/branding";

export class BrandAccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "BrandAccessError";
  }
}

function isMemberRole(value: string): value is Exclude<BrandRole, "owner"> {
  return value === "admin" || value === "editor" || value === "viewer";
}

export function roleAllows(role: BrandRole, action: BrandAccessAction): boolean {
  return brandRoleAllows(role, action);
}

export async function getBrandPermission(
  userId: string,
  brandId: number,
): Promise<BrandRole | null> {
  const [brand] = await db
    .select({ ownerId: brands.userId })
    .from(brands)
    .where(eq(brands.id, brandId));

  if (!brand) return null;
  if (brand.ownerId === userId) return "owner";

  const [membership] = await db
    .select({ role: brandUsers.role })
    .from(brandUsers)
    .where(and(
      eq(brandUsers.brandId, brandId),
      eq(brandUsers.userId, userId),
      eq(brandUsers.isActive, true),
      isNotNull(brandUsers.acceptedAt),
    ));

  return membership && isMemberRole(membership.role) ? membership.role : null;
}

export async function assertBrandAccess(
  userId: string,
  brandId: number,
  action: BrandAccessAction,
): Promise<BrandRole> {
  const role = await getBrandPermission(userId, brandId);
  if (!role || !roleAllows(role, action)) {
    // Keep inaccessible workspace IDs undiscoverable.
    throw new BrandAccessError(404, "Brand not found");
  }
  return role;
}

export async function resolveBrandIdForUser(
  userId: string,
  requestedBrandId: number | null | undefined,
  action: BrandAccessAction,
): Promise<number | null> {
  const isExplicit = requestedBrandId !== undefined;
  let brandId = requestedBrandId;

  if (!isExplicit) {
    const [user] = await db
      .select({ currentBrandId: users.currentBrandId })
      .from(users)
      .where(eq(users.id, userId));
    if (!user) throw new BrandAccessError(401, "User not found");
    brandId = user.currentBrandId;
  }

  if (brandId === null || brandId === undefined) return null;

  const role = await getBrandPermission(userId, brandId);
  if (!role) {
    if (!isExplicit) {
      // Memberships can be revoked while a workspace is selected. Fail safely
      // back to personal scope instead of leaving the account unusable.
      await db.update(users).set({ currentBrandId: null }).where(eq(users.id, userId));
      return null;
    }
    throw new BrandAccessError(404, "Brand not found");
  }
  if (!roleAllows(role, action)) {
    throw new BrandAccessError(403, "You do not have permission for this brand action");
  }

  return brandId;
}

export type ResolvedBrandScope = {
  kind: "personal" | "brand";
  brandId: number | null;
  workspaceName: string;
  role: BrandRole;
  canEditBranding: boolean;
  ownerUserId: string;
};

export async function resolveCurrentBrandScope(
  userId: string,
  action: BrandAccessAction = "read",
): Promise<ResolvedBrandScope> {
  const brandId = await resolveBrandIdForUser(userId, undefined, action);
  if (brandId === null) {
    return {
      kind: "personal",
      brandId: null,
      workspaceName: "Personal Account",
      role: "owner",
      canEditBranding: true,
      ownerUserId: userId,
    };
  }

  const [brand] = await db.select().from(brands).where(eq(brands.id, brandId));
  if (!brand) throw new BrandAccessError(404, "Brand not found");
  const role = await assertBrandAccess(userId, brandId, action);
  return {
    kind: "brand",
    brandId,
    workspaceName: brand.name,
    role,
    canEditBranding: roleAllows(role, "manage_brand"),
    ownerUserId: brand.userId,
  };
}

export async function assertGuideAccess(
  userId: string,
  guide: Guide,
  action: BrandAccessAction,
): Promise<void> {
  if (guide.brandId !== null) {
    await assertBrandAccess(userId, guide.brandId, action);
    return;
  }
  if (guide.userId !== userId) throw new BrandAccessError(404, "Guide not found");
}

export type AccessibleBrand = Brand & { role: BrandRole };

export async function listAccessibleBrands(userId: string): Promise<AccessibleBrand[]> {
  const owned = await db
    .select()
    .from(brands)
    .where(eq(brands.userId, userId))
    .orderBy(desc(brands.createdAt));

  const memberships = await db
    .select({ brand: brands, role: brandUsers.role })
    .from(brandUsers)
    .innerJoin(brands, eq(brandUsers.brandId, brands.id))
    .where(and(
      eq(brandUsers.userId, userId),
      eq(brandUsers.isActive, true),
      isNotNull(brandUsers.acceptedAt),
    ))
    .orderBy(desc(brands.createdAt));

  const accessible = new Map<number, AccessibleBrand>();
  for (const brand of owned) accessible.set(brand.id, { ...brand, role: "owner" });
  for (const membership of memberships) {
    if (!accessible.has(membership.brand.id) && isMemberRole(membership.role)) {
      accessible.set(membership.brand.id, { ...membership.brand, role: membership.role });
    }
  }
  return Array.from(accessible.values());
}
