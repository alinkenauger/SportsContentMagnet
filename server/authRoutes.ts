import type { Express, Request } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";
import type { User } from "@shared/schema";
import { storage, type IStorage } from "./storage";
import { emailService, highLevelService } from "./services/emailService";
import { createRateLimit } from "./rateLimit";
import { getRequestUserId } from "./requestUser";

const signUpSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  niche: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const completeAccountSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  token: z.string().trim().min(32).max(256).optional(),
}).strict();

const pendingSignupSchema = z.object({
  token: z.string().trim().min(32).max(256).optional(),
}).strict();

export const PENDING_SIGNUP_TTL_MS = 30 * 60 * 1000;

type AuthCompletionStorage = Pick<
  IStorage,
  | "createPendingUser"
  | "getUser"
  | "getUserByEmail"
  | "getPendingUserByCompletionTokenHash"
  | "claimAccountCompletionToken"
  | "releaseAccountCompletionToken"
  | "completePendingUserById"
  | "completePendingUserWithTokenHash"
  | "updateUserPassword"
  | "getSubscriptionPlans"
  | "ensureUserSubscription"
>;

export type AuthRouteDependencies = {
  storage: AuthCompletionStorage;
  emailService: Pick<typeof emailService, "sendAccountCompletionEmail" | "sendWelcomeEmail">;
  highLevelService: Pick<typeof highLevelService, "addContact">;
  now: () => number;
  generateCompletionToken: () => string;
  hashPassword: (password: string) => Promise<string>;
  comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
};

type PendingSignupSession = {
  pendingSignupUserId?: string;
  pendingSignupExpiresAt?: number;
};

export function hashAccountCompletionToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function hasValidPendingSignupSession(
  session: PendingSignupSession,
  userId: string,
  now: number,
): boolean {
  return session.pendingSignupUserId === userId
    && typeof session.pendingSignupExpiresAt === "number"
    && session.pendingSignupExpiresAt > now;
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

async function bindPendingSignupSession(req: Request, userId: string, expiresAt: number): Promise<void> {
  req.session.pendingSignupUserId = userId;
  req.session.pendingSignupExpiresAt = expiresAt;
  await saveSession(req);
}

async function ensureFreeSubscription(authStorage: AuthCompletionStorage, userId: string): Promise<void> {
  const freePlan = (await authStorage.getSubscriptionPlans()).find((plan) => plan.name === "free");
  if (!freePlan) return;
  await authStorage.ensureUserSubscription({
    userId,
    planId: freePlan.id,
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
}

function publicSessionUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    currentBrandId: user.currentBrandId,
  };
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function registerAuthRoutes(app: Express, overrides: Partial<AuthRouteDependencies> = {}) {
  const authStorage = overrides.storage ?? storage;
  const authEmailService = overrides.emailService ?? emailService;
  const authHighLevelService = overrides.highLevelService ?? highLevelService;
  const now = overrides.now ?? Date.now;
  const generateCompletionToken = overrides.generateCompletionToken
    ?? (() => crypto.randomBytes(32).toString("hex"));
  const hashPassword = overrides.hashPassword
    ?? ((password: string) => bcrypt.hash(password, 12));
  const comparePassword = overrides.comparePassword
    ?? ((password: string, hashedPassword: string) => bcrypt.compare(password, hashedPassword));
  const signupRateLimit = createRateLimit({
    windowMs: 60 * 60 * 1_000,
    max: 30,
    keyPrefix: "auth-signup",
  });
  const loginRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1_000,
    max: 10,
    keyPrefix: "auth-login",
  });
  const forgotPasswordIpRateLimit = createRateLimit({
    windowMs: 60 * 60 * 1_000,
    max: 10,
    keyPrefix: "auth-forgot-ip",
  });
  const forgotPasswordEmailRateLimit = createRateLimit({
    windowMs: 60 * 60 * 1_000,
    max: 3,
    keyPrefix: "auth-forgot-email",
    key: (req) => String(req.body?.email || "unknown").trim().toLowerCase(),
  });
  const resetPasswordRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1_000,
    max: 10,
    keyPrefix: "auth-reset",
  });
  const changePasswordRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1_000,
    max: 10,
    keyPrefix: "auth-change-password",
    key: (req) => getRequestUserId(req) || req.ip || req.socket.remoteAddress || "unknown",
  });

  // Sign up route
  app.post("/api/auth/signup", signupRateLimit, async (req, res) => {
    try {
      const validatedData = signUpSchema.parse(req.body);
      const pendingResult = await authStorage.createPendingUser({
        id: crypto.randomUUID(),
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        profileImageUrl: null,
        tempPassword: null, // No password set until account completion
        isEmailVerified: false,
        role: 'user',
      });

      const signupUser = pendingResult.user;
      if (!pendingResult.created && signupUser.tempPassword) {
        return res.status(409).json({
          code: "ACCOUNT_EXISTS",
          message: "An account with this email already exists. Sign in to continue.",
          nextStep: "signIn",
        });
      }

      await ensureFreeSubscription(authStorage, signupUser.id);

      if (
        !pendingResult.created
        && !hasValidPendingSignupSession(req.session, signupUser.id, now())
      ) {
        const completionToken = generateCompletionToken();
        const tokenExpiry = new Date(now() + PENDING_SIGNUP_TTL_MS);
        const completionTokenHash = hashAccountCompletionToken(completionToken);
        const claimedToken = await authStorage.claimAccountCompletionToken(
          signupUser.id,
          completionTokenHash,
          tokenExpiry,
          new Date(now()),
        );
        if (!claimedToken) {
          return res.status(202).json({
            message: "Check your email for the secure link already sent to finish setting up VidMagnet.",
            nextStep: "checkEmail",
            resumed: false,
          });
        }
        let emailSent = false;
        try {
          emailSent = Boolean(signupUser.email) && await authEmailService.sendAccountCompletionEmail({
            email: signupUser.email!,
            firstName: signupUser.firstName || "there",
          }, completionToken);
        } catch (emailError) {
          console.error("Failed to send pending signup recovery email:", emailError);
        }

        if (!emailSent) {
          await authStorage.releaseAccountCompletionToken(signupUser.id, completionTokenHash);
          return res.status(503).json({
            code: "RECOVERY_EMAIL_UNAVAILABLE",
            message: "We could not send the secure setup link. Please try again shortly.",
          });
        }

        return res.status(202).json({
          message: "Check your email for a secure link to finish setting up VidMagnet.",
          nextStep: "checkEmail",
          resumed: false,
        });
      }

      await bindPendingSignupSession(
        req,
        signupUser.id,
        now() + PENDING_SIGNUP_TTL_MS,
      );

      if (pendingResult.created) {
        // CRM delivery is best effort and never blocks or changes signup success.
        void authHighLevelService.addContact({
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          phone: validatedData.phone,
          company: validatedData.company,
          tags: ['VidMagnet-Free-Signup', validatedData.niche || 'General'].filter(Boolean),
          customFields: {
            signupDate: new Date().toISOString(),
            niche: validatedData.niche || '',
            company: validatedData.company || '',
            source: 'VidMagnet-Website',
          },
        }).catch((crmError) => {
          console.error('Failed to add signup to High Level CRM:', crmError);
        });
      }

      return res.status(pendingResult.created ? 201 : 200).json({
        message: pendingResult.created
          ? "Account started. Create your password to finish setting up VidMagnet."
          : "Continue creating your password to finish setting up VidMagnet.",
        nextStep: "completeAccount",
        resumed: !pendingResult.created,
      });

    } catch (error) {
      console.error('Signup error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }

      return res.status(500).json({
        message: "Failed to create account. Please try again.",
      });
    }
  });

  // Forgot password route
  app.post(
    "/api/auth/forgot-password",
    forgotPasswordIpRateLimit,
    forgotPasswordEmailRateLimit,
    async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({
          message: "If an account with this email exists, you will receive password reset instructions.",
        });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const claimedReset = await storage.claimPasswordResetToken(
        user.id,
        resetToken,
        resetTokenExpiry,
        new Date(),
      );
      if (!claimedReset) {
        return res.json({
          message: "If an account with this email exists, you will receive password reset instructions.",
        });
      }

      // Send password reset email
      let emailSent = false;
      try {
        emailSent = await emailService.sendPasswordResetEmail({
          email: user.email!,
          firstName: user.firstName || 'User',
        }, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }
      if (!emailSent) {
        await storage.releasePasswordResetToken(user.id, resetToken);
      }

      res.json({
        message: "If an account with this email exists, you will receive password reset instructions.",
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid email address",
          errors: error.errors,
        });
      }

      res.status(500).json({
        message: "Failed to process password reset request.",
      });
    }
  });

  // Reset password route
  app.post("/api/auth/reset-password", resetPasswordRateLimit, async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).json({
          message: "Invalid or expired reset token.",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update password and clear reset token
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearUserResetToken(user.id);

      res.json({
        message: "Password updated successfully. You can now log in with your new password.",
      });

    } catch (error) {
      console.error('Reset password error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }

      res.status(500).json({
        message: "Failed to reset password. Please try again.",
      });
    }
  });

  // Change password route (for authenticated users)
  app.post("/api/auth/change-password", changePasswordRateLimit, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const userId = getRequestUserId(req);
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      // Get user from database
      const user = await authStorage.getUser(userId);
      if (!user || !user.tempPassword) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await comparePassword(currentPassword, user.tempPassword);
      if (!isValidPassword) {
        return res.status(400).json({ 
          message: "Current password is incorrect" 
        });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      await authStorage.updateUserPassword(userId, hashedNewPassword);

      res.json({
        message: "Password changed successfully",
      });

    } catch (error) {
      console.error('Change password error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }

      res.status(500).json({
        message: "Failed to change password. Please try again.",
      });
    }
  });

  // Verify email route
  app.get("/api/auth/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const user = await storage.getUserByEmailVerificationToken(token);
      if (!user) {
        return res.status(400).json({
          message: "Invalid verification token.",
        });
      }

      // Mark email as verified
      await storage.markEmailAsVerified(user.id);

      res.json({
        message: "Email verified successfully!",
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        message: "Failed to verify email.",
      });
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user || user.isEmailVerified) {
        return res.json({
          message: "Verification email sent if account exists and needs verification.",
        });
      }

      // Generate new verification token
      const verificationToken = generateResetToken();
      await storage.updateUserEmailVerificationToken(user.id, verificationToken);

      // Send verification email
      try {
        // Implementation depends on your email template preferences
        console.log('Verification email requested');
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }

      res.json({
        message: "Verification email sent if account exists and needs verification.",
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        message: "Failed to resend verification email.",
      });
    }
  });

  app.post("/api/auth/pending-signup", async (req, res) => {
    try {
      const { token } = pendingSignupSchema.parse(req.body || {});
      if (token) {
        const user = await authStorage.getPendingUserByCompletionTokenHash(
          hashAccountCompletionToken(token),
        );
        if (!user?.resetTokenExpiry || user.resetTokenExpiry.getTime() <= now()) {
          return res.status(400).json({
            ready: false,
            code: "INVALID_OR_EXPIRED_COMPLETION",
            message: "This setup link is invalid or expired. Request a new link from the signup form.",
          });
        }
        return res.json({ ready: true, proof: "email" });
      }

      const pendingUserId = req.session.pendingSignupUserId;
      if (
        !pendingUserId
        || !hasValidPendingSignupSession(req.session, pendingUserId, now())
      ) {
        return res.status(401).json({
          ready: false,
          code: "PENDING_SIGNUP_REQUIRED",
          message: "Start signup again to continue setting up your account.",
        });
      }

      const user = await authStorage.getUser(pendingUserId);
      if (!user || user.tempPassword) {
        return res.status(401).json({
          ready: false,
          code: "PENDING_SIGNUP_REQUIRED",
          message: "This setup session is no longer available. Start signup again or sign in.",
        });
      }
      return res.json({ ready: true, proof: "session" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          ready: false,
          code: "INVALID_OR_EXPIRED_COMPLETION",
          message: "This setup link is invalid or expired. Request a new link from the signup form.",
        });
      }
      console.error("Pending signup check error:", error);
      return res.status(500).json({
        ready: false,
        code: "PENDING_SIGNUP_CHECK_FAILED",
        message: "We could not check your setup session. Please try again.",
      });
    }
  });

  // Complete account setup using same-browser session proof or an emailed token.
  app.post("/api/auth/complete-account", async (req, res) => {
    try {
      const { password, token } = completeAccountSchema.parse(req.body);
      let completedUser: User | undefined;

      if (token) {
        const tokenHash = hashAccountCompletionToken(token);
        const pendingUser = await authStorage.getPendingUserByCompletionTokenHash(tokenHash);
        if (!pendingUser?.resetTokenExpiry || pendingUser.resetTokenExpiry.getTime() <= now()) {
          return res.status(400).json({
            code: "INVALID_OR_EXPIRED_COMPLETION",
            message: "This setup link or session is invalid, expired, or already used.",
          });
        }
        const hashedPassword = await hashPassword(password);
        completedUser = await authStorage.completePendingUserWithTokenHash(
          tokenHash,
          hashedPassword,
          new Date(now()),
        );
      } else {
        const pendingUserId = req.session.pendingSignupUserId;
        if (
          !pendingUserId
          || !hasValidPendingSignupSession(req.session, pendingUserId, now())
        ) {
          return res.status(401).json({
            code: "PENDING_SIGNUP_REQUIRED",
            message: "Your setup session expired. Start signup again to receive a secure setup link.",
          });
        }
        const pendingUser = await authStorage.getUser(pendingUserId);
        if (!pendingUser || pendingUser.tempPassword) {
          return res.status(400).json({
            code: "INVALID_OR_EXPIRED_COMPLETION",
            message: "This setup link or session is invalid, expired, or already used.",
          });
        }
        const hashedPassword = await hashPassword(password);
        completedUser = await authStorage.completePendingUserById(pendingUserId, hashedPassword);
      }

      if (!completedUser) {
        return res.status(400).json({
          code: "INVALID_OR_EXPIRED_COMPLETION",
          message: "This setup link or session is invalid, expired, or already used.",
        });
      }

      try {
        await regenerateSession(req);
        req.session.userId = completedUser.id;
        req.session.user = publicSessionUser(completedUser);
        await saveSession(req);
      } catch (sessionError) {
        console.error("Account completed but authentication session could not be saved:", sessionError);
        return res.status(503).json({
          code: "ACCOUNT_COMPLETED_SIGN_IN_REQUIRED",
          message: "Your password was saved, but we could not sign you in automatically. Sign in to continue.",
          redirect: "/login",
        });
      }

      const response = {
        message: "Account setup complete. Welcome to VidMagnet!",
        authenticated: true,
        emailVerified: completedUser.isEmailVerified === true,
        redirect: "/dashboard",
      };
      res.status(200).json(response);

      if (completedUser.email) {
        void authEmailService.sendWelcomeEmail({
          firstName: completedUser.firstName || "User",
          lastName: completedUser.lastName || "",
          email: completedUser.email,
        }).catch((emailError) => {
          console.error("Failed to send VidMagnet welcome email:", emailError);
        });
      }
      return;
    } catch (error) {
      console.error('Complete account error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: "INVALID_ACCOUNT_COMPLETION",
          message: "Enter a password with at least 8 characters.",
          errors: error.errors,
        });
      }
      return res.status(500).json({
        code: "ACCOUNT_COMPLETION_FAILED",
        message: "Failed to complete account setup. Please try again.",
      });
    }
  });

  // Login route for email/password authentication
  app.post("/api/auth/login", loginRateLimit, async (req, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().trim().toLowerCase().email(),
        password: z.string().min(1),
      }).parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }
      // Check if user has a password set
      if (!user.tempPassword) {
        return res.status(401).json({
          message: "No password set for this account. Please complete your account setup first.",
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.tempPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }

      // Rotate the unauthenticated session before binding authenticated state.
      await regenerateSession(req);
      req.session.userId = user.id;
      req.session.user = publicSessionUser(user);
      await saveSession(req);

      return res.status(200).json({
        message: "Login successful. Welcome back to VidMagnet!",
        user: req.session.user,
        authenticated: true,
        redirect: "/dashboard",
      });

    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }

      res.status(500).json({
        message: "Login failed. Please try again.",
      });
    }
  });

  // Get current user authentication state
  app.get("/api/auth/me", async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub || req.user?.id;
      if (userId) {
        const dbUser = await storage.getUser(userId);
        if (dbUser) {
          const user = {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            profileImageUrl: dbUser.profileImageUrl,
            role: dbUser.role,
            isEmailVerified: dbUser.isEmailVerified,
            currentBrandId: dbUser.currentBrandId,
          };

          if (req.session?.userId) {
            req.session.user = user;
          }

          return res.json({ authenticated: true, user });
        }
      }

      res.json({
        authenticated: false,
        user: null,
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        authenticated: false,
        user: null,
      });
    }
  });
}
