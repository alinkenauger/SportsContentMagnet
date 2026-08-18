import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    user?: {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      role: string | null;
      isEmailVerified: boolean | null;
      currentBrandId: number | null;
    };
    pendingSignupUserId?: string;
    pendingSignupExpiresAt?: number;
  }
}
