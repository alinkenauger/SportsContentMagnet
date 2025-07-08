import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// Rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime).toISOString() : null
    });
  }
});

// Stricter rate limiter for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: 'Too many password reset requests, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// General API rate limiter (more permissive)
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Too many requests, please slow down.',
});

// Admin endpoint rate limiter
export const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 requests per 5 minutes
  message: 'Too many admin requests, please try again later.',
});