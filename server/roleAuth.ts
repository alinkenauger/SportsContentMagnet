import type { RequestHandler } from "express";
import { storage } from "./storage";

// Role hierarchy levels
export enum Role {
  USER = "user",
  BRAND_ADMIN = "brand_admin", 
  ACCOUNT_ADMIN = "account_admin",
  SUPER_ADMIN = "super_admin"
}

// Role hierarchy for permissions
const roleHierarchy: Record<string, number> = {
  [Role.USER]: 1,
  [Role.BRAND_ADMIN]: 2,
  [Role.ACCOUNT_ADMIN]: 3,
  [Role.SUPER_ADMIN]: 4
};

// Check if user has required role or higher
export function hasRole(userRole: string, requiredRole: Role): boolean {
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

// Middleware to require specific role
export function requireRole(requiredRole: Role): RequestHandler {
  return async (req: any, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = await storage.getUserById(req.user.sub || req.user.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!hasRole(user.role, requiredRole)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error("Role check error:", error);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
}

// Middleware to require super admin
export const requireSuperAdmin = requireRole(Role.SUPER_ADMIN);

// Middleware to require account admin or higher
export const requireAccountAdmin = requireRole(Role.ACCOUNT_ADMIN);

// Middleware to require brand admin or higher
export const requireBrandAdmin = requireRole(Role.BRAND_ADMIN);

// Helper function to check if user is super admin
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const user = await storage.getUserById(userId);
    return user?.role === Role.SUPER_ADMIN;
  } catch (error) {
    console.error("Super admin check error:", error);
    return false;
  }
}

// Helper function to check if user can manage brand
export async function canManageBrand(userId: string, brandId: number): Promise<boolean> {
  try {
    const user = await storage.getUserById(userId);
    if (!user) return false;

    // Super admins can manage any brand
    if (user.role === Role.SUPER_ADMIN) return true;

    // Check if user has admin role for this specific brand
    const brandRole = await storage.getBrandUserRole(userId, brandId);
    return brandRole === 'admin';
  } catch (error) {
    console.error("Brand management check error:", error);
    return false;
  }
}