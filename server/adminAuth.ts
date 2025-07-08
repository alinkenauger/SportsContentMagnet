import type { RequestHandler } from "express";
import { storage } from "./storage";

// Admin user IDs and emails from environment variables
// Set ADMIN_USER_IDS and ADMIN_EMAILS in your .env file as comma-separated lists
// Example: ADMIN_USER_IDS="user1,user2" ADMIN_EMAILS="admin1@example.com,admin2@example.com"
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()).filter(Boolean) || [];
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim().toLowerCase()).filter(Boolean) || [];

// Log configuration on startup (without exposing sensitive data)
if (ADMIN_USER_IDS.length === 0 && ADMIN_EMAILS.length === 0) {
  console.warn("Warning: No admin users configured. Set ADMIN_USER_IDS and/or ADMIN_EMAILS in environment variables.");
} else {
  console.log(`Admin configuration loaded: ${ADMIN_USER_IDS.length} user IDs, ${ADMIN_EMAILS.length} emails`);
}

/**
 * Middleware to check if user has global admin access
 * Only allows access to specific user IDs or emails defined above
 */
export const isGlobalAdmin: RequestHandler = async (req, res, next) => {
  try {
    // Check session-based authentication first
    if (req.session && req.session.userId && req.session.user) {
      const userId = req.session.userId;
      const userEmail = req.session.user.email;

      // Check if user ID is in admin list
      if (ADMIN_USER_IDS.includes(userId)) {
        return next();
      }

      // Check if user email is in admin list (fallback, case-insensitive)
      if (userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
        return next();
      }

      // Check database role (most reliable for session auth)
      const user = await storage.getUser(userId);
      if (user && user.role === "admin") {
        return next();
      }

      return res.status(403).json({ 
        message: "Global administrator access required",
        code: "ADMIN_ACCESS_REQUIRED"
      });
    }

    // Check OAuth authentication (fallback)
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userClaims = (req.user as any).claims;
    if (!userClaims) {
      return res.status(401).json({ message: "Invalid authentication" });
    }

    const userId = userClaims.sub;
    const userEmail = userClaims.email;

    // Check if user ID is in admin list
    if (ADMIN_USER_IDS.includes(userId)) {
      return next();
    }

    // Check if user email is in admin list (fallback, case-insensitive)
    if (userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      return next();
    }

    // Also check database role (in case we've manually updated someone's role)
    const user = await storage.getUser(userId);
    if (user && user.role === "admin") {
      return next();
    }

    return res.status(403).json({ 
      message: "Global administrator access required",
      code: "ADMIN_ACCESS_REQUIRED"
    });

  } catch (error) {
    console.error("Error checking admin access:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Helper function to check if a user is a global admin
 * Can be used in other parts of the application
 */
export async function checkIsGlobalAdmin(userId: string, userEmail?: string): Promise<boolean> {
  try {
    // Check hardcoded admin lists first
    if (ADMIN_USER_IDS.includes(userId)) {
      return true;
    }
    
    if (userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      return true;
    }

    // Check database role
    const user = await storage.getUser(userId);
    return user?.role === "admin";
    
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}