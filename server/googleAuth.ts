import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import { storage } from "./storage";

// Google OAuth configuration for YouTube API access
export function setupGoogleAuth(app: Express) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required");
    return;
  }

  const googleStrategy = new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Store Google tokens for YouTube API access
        const user = {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
        };

        // Update user's Google connection in database
        await storage.updateUserGoogleConnection(profile.id, {
          userId: profile.id,
          googleId: profile.id,
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
          googleEmail: profile.emails?.[0]?.value,
          googleName: profile.displayName,
          googlePicture: profile.photos?.[0]?.value,
        });

        return done(null, user);
      } catch (error) {
        console.error("Google auth error:", error);
        return done(error, undefined);
      }
    }
  );

  passport.use("google", googleStrategy);

  // Google OAuth routes
  app.get(
    "/api/auth/google",
    passport.authenticate("google", {
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/youtube.force-ssl"
      ],
      accessType: "offline",
      prompt: "consent"
    })
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/?error=google_auth_failed" }),
    (req, res) => {
      // Successful authentication, redirect to dashboard
      res.redirect("/dashboard");
    }
  );

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