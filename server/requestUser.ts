import type { Request, RequestHandler } from "express";

export type RequestWithUser = Request & {
  authUserId?: string;
};

export function attachCanonicalRequestUser(req: any, userId: string): void {
  const existingUser = req.user && typeof req.user === "object" ? req.user : {};
  const sessionUser = req.session?.user && typeof req.session.user === "object"
    ? req.session.user
    : {};
  const existingClaims = existingUser.claims && typeof existingUser.claims === "object"
    ? existingUser.claims
    : {};
  req.user = {
    ...existingUser,
    ...sessionUser,
    id: userId,
    claims: { ...existingClaims, sub: userId },
  };
}

export function getRequestUserId(req: RequestWithUser | any): string | null {
  const candidates = [
    req.authUserId,
    req.session?.userId,
    req.session?.user?.id,
    req.user?.claims?.sub,
    req.user?.id,
    req.user?.sub,
  ];

  const userId = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );

  return typeof userId === "string" ? userId : null;
}

export async function destroyAuthenticatedSession(req: any): Promise<void> {
  let passportError: unknown;

  if (typeof req.logout === "function") {
    try {
      await new Promise<void>((resolve, reject) => {
        req.logout((error?: unknown) => error ? reject(error) : resolve());
      });
    } catch (error) {
      passportError = error;
    }
  }

  if (req.session && typeof req.session.destroy === "function") {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((error?: unknown) => error ? reject(error) : resolve());
    });
  }

  if (passportError) throw passportError;
}

export const requireRequestUser: RequestHandler = (req: RequestWithUser, res, next) => {
  const userId = getRequestUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  req.authUserId = userId;
  return next();
};
