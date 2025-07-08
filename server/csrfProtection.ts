import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

// Generate a CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// Middleware to set CSRF token cookie
export function setCSRFToken(req: Request, res: Response, next: NextFunction) {
  // Only set token if it doesn't exist
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = generateCSRFToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be accessible by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }
  next();
}

// Middleware to verify CSRF token
export function verifyCSRFToken(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for GET requests and certain paths
  if (
    req.method === 'GET' || 
    req.method === 'HEAD' || 
    req.method === 'OPTIONS' ||
    req.path.startsWith('/api/auth/callback') || // OAuth callbacks
    req.path.startsWith('/api/landing') || // Public landing pages
    req.path.startsWith('/api/delivery') || // Public delivery pages
    req.path === '/api/login' || // Replit OAuth
    req.path === '/api/callback' // Replit OAuth callback
  ) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ 
      message: 'Invalid CSRF token',
      code: 'CSRF_VALIDATION_FAILED'
    });
  }

  next();
}

// Get CSRF token from request
export function getCSRFToken(req: Request): string | undefined {
  return req.cookies?.[CSRF_COOKIE_NAME];
}

// Endpoint to get CSRF token for client
export function csrfTokenEndpoint(req: Request, res: Response) {
  const token = getCSRFToken(req);
  if (!token) {
    return res.status(500).json({ message: 'CSRF token not found' });
  }
  res.json({ csrfToken: token });
}