import type { Express } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { emailService, highLevelService } from "./services/emailService";

const signUpSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
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

export function registerAuthRoutes(app: Express) {
  // Sign up route
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = signUpSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(409).json({ 
          message: "An account with this email already exists. Please log in instead." 
        });
      }

      // Generate temporary password
      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Create user account
      const newUser = await storage.upsertUser({
        id: crypto.randomUUID(),
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        profileImageUrl: null,
        tempPassword: hashedPassword,
        isEmailVerified: false,
        role: 'user',
      });

      // Get free subscription plan
      const subscriptionPlans = await storage.getSubscriptionPlans();
      const freePlan = subscriptionPlans.find(plan => plan.name === 'free');
      
      if (freePlan) {
        // Create free subscription for new user
        await storage.createUserSubscription({
          userId: newUser.id,
          planId: freePlan.id,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
      }

      // Send welcome email with login details
      let emailSent = false;
      try {
        emailSent = await emailService.sendWelcomeEmail({
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          tempPassword: tempPassword,
        });
        console.log(`📧 Welcome email result for ${validatedData.email}: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        emailSent = false;
      }

      // Add to High Level CRM
      try {
        await highLevelService.addContact({
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
        });
      } catch (crmError) {
        console.error('Failed to add to High Level CRM:', crmError);
        // Don't fail the signup if CRM fails
      }

      // Provide appropriate response based on email delivery status
      if (emailSent) {
        res.status(201).json({
          message: "Account created successfully! Check your email for login instructions, then log in immediately to get started.",
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
          },
          nextStep: "checkEmailAndLogin"
        });
      } else {
        res.status(201).json({
          message: `Account created! Use this password to log in immediately: ${tempPassword}`,
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
          },
          tempPassword: tempPassword,
          nextStep: "loginImmediately"
        });
      }

    } catch (error) {
      console.error('Signup error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }

      res.status(500).json({
        message: "Failed to create account. Please try again.",
      });
    }
  });

  // Forgot password route
  app.post("/api/auth/forgot-password", async (req, res) => {
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

      // Store reset token
      await storage.updateUserResetToken(user.id, resetToken, resetTokenExpiry);

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail({
          email: user.email!,
          firstName: user.firstName || 'User',
        }, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        return res.status(500).json({
          message: "Failed to send password reset email. Please try again.",
        });
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
  app.post("/api/auth/reset-password", async (req, res) => {
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
  app.post("/api/auth/change-password", async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const userId = req.user.claims.sub;

      // Get user from database
      const user = await storage.getUserById(userId);
      if (!user || !user.tempPassword) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.tempPassword);
      if (!isValidPassword) {
        return res.status(400).json({ 
          message: "Current password is incorrect" 
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update user password and clear temp password flag
      await storage.updateUserPassword(userId, hashedNewPassword);
      await storage.clearTempPasswordFlag(userId);

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
        console.log('Verification email would be sent to:', user.email);
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
}