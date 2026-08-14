# Legacy Google OAuth 403 Troubleshooting Record

> **Status: legacy troubleshooting note.** The current VidMagnet release uses password/session authentication plus Replit OpenID Connect at `https://<REPLIT_DOMAINS host>/api/callback`. The Google callback and dated hostname below are inactive archive material; do not copy them into production.

## Historical Status
- Server redirects correctly (302 status confirmed)
- Google returns 403 "You do not have access to this page"
- Issue persists even with basic profile/email scopes

## Root Cause
This is a Google Cloud Console OAuth consent screen configuration issue.

## Step-by-Step Fix

### 1. Check OAuth Consent Screen
Go to: https://console.cloud.google.com/apis/credentials/consent

**Required Settings:**
- User Type: External (unless you have Google Workspace)
- App Name: Enter any name (e.g., "VidMagnet")
- User Support Email: Your email address
- Developer Contact Email: Your email address

### 2. Publishing Status
**Option A - Testing Mode (Recommended for now):**
- Status: "Testing"
- Add Test Users: Click "ADD USERS" and add your email address
- Save changes

**Option B - Production Mode:**
- Status: "In Production" 
- Requires Google verification (takes time)

### 3. Verify OAuth Client Settings
Go to: https://console.cloud.google.com/apis/credentials

**Check your OAuth 2.0 Client:**
- Application Type: Web application
- Authorized Redirect URIs: 
  ```
  https://0a39cba5-9b1c-49e9-a15b-b79a7b52cdd7-00-pynbhq8fwikx.riker.replit.dev/api/auth/google/callback
  ```

### 4. Required APIs
Enable these APIs:
- Google+ API (legacy but sometimes required)
- People API
- Identity and Access Management (IAM) API

## Quick Test
1. Set publishing status to "Testing"
2. Add your email as test user
3. Wait 5 minutes for changes to propagate
4. Try OAuth flow again

## If Still Failing
Try creating a completely new OAuth client ID from scratch in Google Cloud Console.
