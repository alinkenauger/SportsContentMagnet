# Authentication Implementation Analysis

## Overview

The application uses a multi-layered authentication system that supports multiple authentication methods:
1. Email/Password authentication (custom implementation)
2. Replit OAuth integration
3. Session-based authentication using PostgreSQL session store

## Authentication Flow

### 1. Sign Up Flow
- **Route**: `POST /api/auth/signup`
- **Process**:
  1. User provides: firstName, lastName, email, phone (optional), company (optional), niche (optional)
  2. System creates an incomplete account (no password set)
  3. User is assigned to the free subscription plan
  4. Contact is added to High Level CRM
  5. User is redirected to complete account setup

### 2. Account Completion Flow
- **Route**: `POST /api/auth/complete-account`
- **Page**: `/complete-account`
- **Process**:
  1. User sets their password
  2. Email is marked as verified
  3. Session is created automatically
  4. Welcome email is sent
  5. User is redirected to dashboard

### 3. Login Flow
- **Route**: `POST /api/auth/login`
- **Page**: `/login`
- **Process**:
  1. User provides email and password
  2. Password is verified using bcrypt
  3. Session is created and saved
  4. User is redirected to dashboard

### 4. Replit OAuth Flow
- **Routes**: `/api/login`, `/api/callback`, `/api/logout`
- **Process**:
  1. User is redirected to Replit OAuth provider
  2. After authorization, callback creates/updates user
  3. Session is established

## Session Management

### Configuration
- **Session Store**: PostgreSQL using `connect-pg-simple`
- **Session Table**: `sessions` table in database
- **Session TTL**: 7 days (604,800,000 ms)
- **Cookie Settings**:
  - httpOnly: true
  - secure: true (in production)
  - maxAge: 7 days

### Session Data Structure
```typescript
req.session = {
  userId: string,
  user: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    profileImageUrl: string,
    role: string,
    isEmailVerified: boolean
  }
}
```

## Role-Based Access Control (RBAC)

### Role Hierarchy
1. **user** (level 1) - Basic user access
2. **brand_admin** (level 2) - Can manage specific brands
3. **account_admin** (level 3) - Can manage account-level settings
4. **super_admin** (level 4) - Full system access

### Role Middleware
- `requireSuperAdmin` - Requires super_admin role
- `requireAccountAdmin` - Requires account_admin or higher
- `requireBrandAdmin` - Requires brand_admin or higher
- `isGlobalAdmin` - Custom middleware checking hardcoded admin lists

### Super Admin Implementation
Two approaches are used:

1. **Database Role-Based** (`roleAuth.ts`):
   - Checks user.role field in database
   - Uses role hierarchy for permissions

2. **Hardcoded Admin List** (`adminAuth.ts`):
   - Hardcoded user IDs: `["38750665", "b6539943-3686-4ac3-9c3e-26a3be4c768d"]`
   - Hardcoded emails: `["adamlinkenauger@gmail.com", "adam@sportofbusiness.com"]`
   - Falls back to checking database role = "admin"

## Authentication Middleware

### `isAuthenticated` Middleware
Checks authentication in this order:
1. Session-based auth (req.session.userId)
2. Google OAuth (req.isAuthenticated())
3. Replit Auth (req.user.claims.sub)
4. Token refresh for expired sessions

## Password Management

### Password Storage
- Passwords are hashed using bcrypt with 12 rounds
- Stored in `users.tempPassword` field
- Field name "tempPassword" is misleading - it's the permanent password

### Password Reset Flow
1. **Forgot Password** (`POST /api/auth/forgot-password`):
   - Generates reset token
   - Stores token with 1-hour expiry
   - Sends reset email (currently just logs)

2. **Reset Password** (`POST /api/auth/reset-password`):
   - Validates reset token
   - Updates password
   - Clears reset token

### Change Password
- **Route**: `POST /api/auth/change-password`
- Requires current password verification
- Updates to new password

## Email Verification

### Fields
- `isEmailVerified`: boolean flag
- `emailVerificationToken`: verification token

### Process
- Email is automatically verified during account completion
- Verification endpoint exists but isn't actively used
- No email is sent for verification currently

## Client-Side Implementation

### Authentication Hook
- **File**: `client/src/hooks/useAuth.ts`
- Uses React Query to fetch `/api/auth/me`
- Provides: `user`, `isLoading`, `isAuthenticated`

### Protected Routes
- Authentication state is checked via the `useAuth` hook
- Unauthorized users are redirected to login

## Database Schema

### Users Table
```sql
- id: varchar (primary key)
- email: varchar (unique)
- firstName: varchar
- lastName: varchar
- profileImageUrl: varchar
- tempPassword: varchar (actual password hash)
- resetToken: varchar
- resetTokenExpiry: timestamp
- emailVerificationToken: varchar
- isEmailVerified: boolean
- role: varchar (user/brand_admin/account_admin/super_admin)
- stripeCustomerId: varchar
- createdAt: timestamp
- updatedAt: timestamp
```

### Sessions Table
```sql
- sid: varchar (session ID)
- sess: jsonb (session data)
- expire: timestamp
```

## Security Considerations

### Strengths
1. Passwords are properly hashed with bcrypt
2. Session cookies are httpOnly and secure (in production)
3. CSRF protection through session-based auth
4. Role hierarchy prevents privilege escalation
5. Password reset tokens expire after 1 hour

### Areas for Improvement

1. **Misleading Field Names**:
   - `tempPassword` field name is confusing - it stores the permanent password
   - Should be renamed to `passwordHash` or similar

2. **Email Verification**:
   - Email verification tokens are generated but not used
   - Emails are auto-verified on account completion
   - No actual verification emails are sent

3. **Password Reset Emails**:
   - Currently only logs to console instead of sending emails
   - Email service integration exists but isn't used for resets

4. **Duplicate Admin Routes**:
   - Some admin routes are duplicated with different middleware
   - Should be consolidated to avoid confusion

5. **Hardcoded Admin Lists**:
   - Admin IDs/emails are hardcoded in `adminAuth.ts`
   - Should rely on database roles instead

6. **Missing Security Features**:
   - No rate limiting on auth endpoints
   - No account lockout after failed attempts
   - No 2FA implementation
   - No password strength requirements beyond length

7. **Session Security**:
   - No session rotation on privilege changes
   - No concurrent session management

## Recommendations

1. **Immediate Fixes**:
   - Rename `tempPassword` to `passwordHash`
   - Implement actual email sending for password resets
   - Remove duplicate admin routes
   - Add rate limiting to auth endpoints

2. **Short-term Improvements**:
   - Implement proper email verification flow
   - Add password strength validation
   - Add account lockout mechanism
   - Consolidate admin authentication to use database roles only

3. **Long-term Enhancements**:
   - Add 2FA support
   - Implement session rotation
   - Add audit logging for auth events
   - Consider OAuth providers beyond Replit (Google, GitHub, etc.)

## Testing Recommendations

1. **Unit Tests Needed**:
   - Password hashing and verification
   - Role hierarchy checks
   - Session management
   - Token generation and validation

2. **Integration Tests Needed**:
   - Complete auth flows (signup → complete → login)
   - Password reset flow
   - Role-based access to protected endpoints
   - Session expiration and refresh

3. **Security Tests Needed**:
   - SQL injection attempts
   - XSS in auth forms
   - CSRF token validation
   - Session fixation attacks
   - Brute force protection