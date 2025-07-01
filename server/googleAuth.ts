import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import { storage } from "./storage";

// Google OAuth configuration for YouTube API access
// Middleware to check if user is authenticated via Google OAuth
export const isGoogleAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

export function setupGoogleAuth(app: Express) {
  // Use new OAuth credentials to bypass 403 issues
  const clientId = process.env.GOOGLE_CLIENT_ID_NEW || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET_NEW || process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.warn("Google OAuth not configured - CLIENT_ID and CLIENT_SECRET required");
    return;
  }

  console.log("Setting up Google OAuth with Client ID:", clientId?.substring(0, 20) + "...");
  console.log("Callback URL configured as: /api/auth/google/callback");

  const googleStrategy = new GoogleStrategy(
    {
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Use Google OAuth as primary authentication
        // Create or update user based on Google profile
        const googleEmail = profile.emails?.[0]?.value;
        const googleId = profile.id;
        
        if (!googleEmail || !googleId) {
          return done(new Error("Google profile missing required data"), undefined);
        }

        // Check if user already exists by Google ID or email
        let existingUser = await storage.getUserByGoogleId(googleId);
        if (!existingUser) {
          existingUser = await storage.getUserByEmail(googleEmail);
        }

        let user;
        if (existingUser) {
          // Update existing user with latest Google info
          user = await storage.updateUserGoogleConnection(existingUser.id, {
            userId: existingUser.id,
            googleId: googleId,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleEmail: googleEmail,
            googleName: profile.displayName,
            googlePicture: profile.photos?.[0]?.value,
          });
        } else {
          // Create new user with Google profile
          user = await storage.upsertUser({
            id: googleId, // Use Google ID as primary user ID
            email: googleEmail,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            profileImageUrl: profile.photos?.[0]?.value,
          });

          // Create Google connection
          await storage.updateUserGoogleConnection(googleId, {
            userId: googleId,
            googleId: googleId,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleEmail: googleEmail,
            googleName: profile.displayName,
            googlePicture: profile.photos?.[0]?.value,
          });
        }

        return done(null, user || undefined);
      } catch (error) {
        console.error("Google auth error:", error);
        return done(error, undefined);
      }
    }
  );

  passport.use("google", googleStrategy);
  
  // Serialize/deserialize user for session management
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  // Google OAuth routes
  app.get(
    "/api/auth/google",
    (req, res, next) => {
      console.log("Google OAuth initiated - Host:", req.get('host'));
      console.log("Expected callback URL:", `https://${req.get('host')}/api/auth/google/callback`);
      next();
    },
    passport.authenticate("google", {
      scope: [
        "profile",
        "email"
      ],
      accessType: "offline",
      prompt: "consent"
    })
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/?error=google_auth_failed" }),
    (req, res) => {
      // Successful Google authentication
      res.redirect("/dashboard");
    }
  );

  // Universal logout (works for both Google OAuth and Replit Auth)
  app.get("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.redirect("/");
    });
  });

  // Disconnect Google account
  app.post("/api/auth/google/disconnect", async (req: any, res) => {
    try {
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      await storage.updateUserGoogleConnection(req.user.claims.sub, null);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting Google:", error);
      res.status(500).json({ error: "Failed to disconnect Google account" });
    }
  });

  // Get Google connection status
  app.get("/api/auth/google/status", async (req: any, res) => {
    try {
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const connection = await storage.getUserGoogleConnection(req.user.claims.sub);
      res.json({
        connected: !!connection,
        googleEmail: connection?.googleEmail,
        googleName: connection?.googleName,
        connectedAt: connection?.connectedAt
      });
    } catch (error) {
      console.error("Error checking Google status:", error);
      res.status(500).json({ error: "Failed to check Google connection" });
    }
  });
}

// Helper function to get authenticated YouTube API client
export async function getYouTubeClient(userId: string) {
  const connection = await storage.getUserGoogleConnection(userId);
  
  if (!connection?.googleAccessToken) {
    throw new Error("YouTube access requires Google account connection");
  }

  // Return tokens for YouTube API calls
  return {
    accessToken: connection.googleAccessToken,
    refreshToken: connection.googleRefreshToken,
  };
}

// Helper to refresh Google access token if needed
export async function refreshGoogleToken(userId: string): Promise<string> {
  const connection = await storage.getUserGoogleConnection(userId);
  
  if (!connection?.googleRefreshToken) {
    throw new Error("No refresh token available");
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: connection.googleRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokens = await response.json();
    
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${tokens.error}`);
    }

    // Update stored access token
    await storage.updateUserGoogleConnection(userId, {
      ...connection,
      googleAccessToken: tokens.access_token,
      // Refresh token might be updated too
      googleRefreshToken: tokens.refresh_token || connection.googleRefreshToken,
    });

    return tokens.access_token;
  } catch (error) {
    console.error("Error refreshing Google token:", error);
    throw new Error("Failed to refresh Google access token");
  }
}