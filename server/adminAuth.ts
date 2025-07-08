import type { RequestHandler } from "express";
import { storage } from "./storage";

// List of admin user IDs (you can add your team members here)
const ADMIN_USER_IDS = [
  "38750665", // Your user ID - replace with your actual ID
  // Add more admin user IDs here as needed
  // Example: "user_id_2", "user_id_3"
];

// List of admin email addresses as fallback
const ADMIN_EMAILS = [
  "adamlinkenauger@gmail.com", // Your email - replace with your actual email
  "adamLinkenauger@gmail.com", // Case variation
  "adam@sportofbusiness.com", // Your business email
  // Add more admin emails here as needed
  // Example: "teammate@company.com", "admin@company.com"
];

/**
 * Middleware to check if user has global admin access
 * Only allows access to specific user IDs or emails defined above
 */
export const isGlobalAdmin: RequestHandler = async (req, res, next) => {
  try {
    // Check if user is authenticated first
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

    // Check if user email is in admin list (fallback)
    if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
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
    
    if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
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