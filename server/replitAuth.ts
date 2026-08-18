import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import { attachCanonicalRequestUser, destroyAuthenticatedSession } from "./requestUser";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only secure in production
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    const claims = tokens.claims();
    if (!claims) throw new Error("OIDC provider returned no identity claims");
    
    // Set role based on email for super admin
    const role = claims.email === 'adamLinkenauger@gmail.com' ? 'super_admin' : 'user';
    
    await upsertUser({ ...claims, role });
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    console.log("Login domain:", domain);
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    console.log("Callback domain:", domain);
    passport.authenticate(`replitauth:${domain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  const logoutHandler: RequestHandler = async (req, res, next) => {
    const oidcUser = req.user as any;
    const shouldEndOidcSession = Boolean(
      oidcUser?.access_token || oidcUser?.refresh_token || oidcUser?.expires_at,
    );

    try {
      await destroyAuthenticatedSession(req);
      res.clearCookie("connect.sid");

      if (shouldEndOidcSession) {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href,
        );
        return;
      }

      res.redirect("/");
    } catch (error) {
      next(error);
    }
  };

  app.get("/api/logout", logoutHandler);
  app.get("/api/auth/logout", logoutHandler);
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    // Check session-based authentication first (for users who completed account setup)
    if (req.session && req.session.userId && req.session.user) {
      attachCanonicalRequestUser(req, req.session.userId);
      return next();
    }

    // Check Google OAuth (for users signed in with Google)
    const passportUser = req.user as { id?: string } | undefined;
    if (req.isAuthenticated && req.isAuthenticated() && passportUser?.id) {
      attachCanonicalRequestUser(req, passportUser.id);
      return next();
    }
    
    // Check Replit Auth (for users signed in with Replit)
    const user = req.user as any;
    if (!user || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // If no expires_at field, assume the session is valid (Google OAuth case)
    if (!user.expires_at) {
      return next();
    }

    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }

    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      return next();
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
