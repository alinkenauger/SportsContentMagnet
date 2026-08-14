# Legacy SendGrid Integration Plan for ConvertMag.net

> **Status: legacy provider note, not a verified current incident report.** Re-check sender and domain status in SendGrid before acting. Current VidMagnet account completion never emails or exposes a temporary password; see `replit.md` and `server/services/emailService.ts` for the active environment and recovery contract.

## Historical Root Cause Analysis

The "401 Unauthorized" error is NOT due to the API key itself, but rather **missing domain authentication**. SendGrid requires sender verification before allowing emails to be sent.

## Historical Status
- ✅ API Key is valid (format correct, starts with "SG.")
- ✅ @sendgrid/mail package installed (v8.1.6)
- ✅ Code implementation correct
- ❌ Domain authentication missing
- ❌ Sender identity not verified

## Historical Provider Checklist

### 1. Domain Authentication (Primary Fix - Required)

**Why this is needed:** SendGrid requires proof that you own the domain you're sending from.

**Steps:**
1. **Login to SendGrid Dashboard**
   - Go to Settings → Sender Authentication → Domain Authentication
   - Click "Get Started" or "Authenticate Your Domain"

2. **Configure Domain**
   - Select your DNS provider
   - Enter domain: `em8411.getmoreviews.com`
   - Enable link branding: Yes (recommended)

3. **Add DNS Records**
   SendGrid will generate 3-5 CNAME records like:
   ```
   Host: em1234.em8411.getmoreviews.com
   Value: u1234567.wl.sendgrid.net

   Host: s1._domainkey.em8411.getmoreviews.com
   Value: s1.domainkey.u1234567.wl.sendgrid.net

   Host: s2._domainkey.em8411.getmoreviews.com
   Value: s2.domainkey.u1234567.wl.sendgrid.net
   ```

4. **Add to Your DNS Provider**
   - Login to your DNS management (where em8411.getmoreviews.com is hosted)
   - Add each CNAME record exactly as provided
   - Save changes

5. **Verify in SendGrid**
   - Return to SendGrid dashboard
   - Click "Verify" button
   - Wait for green checkmarks (can take up to 24 hours)

### 2. API Key Permissions Check

**In SendGrid Dashboard:**
1. Settings → API Keys
2. Find your current key
3. Click to view permissions
4. Ensure these are checked:
   - ✓ Mail Send (required)
   - ✓ Mail Settings (optional but helpful)
   - ✓ Stats (optional for analytics)

### 3. Quick Alternative: Single Sender Verification (For Testing Only)

If you need to test immediately while waiting for DNS:

1. Settings → Sender Authentication → Single Sender Verification
2. Add the exact sender address currently configured in `EmailService.defaultFromEmail`
3. Check your email inbox
4. Click verification link
5. Use this exact email in your "from" field

**Note:** This is NOT recommended for production. Emails will show "via sendgrid.net"

### 4. Verify Code and Provider Match

Do not assume the archived sender below matches the application. Read `server/services/emailService.ts`, verify that exact address in SendGrid, and update the code or provider configuration if they differ.

```javascript
// server/services/emailService.ts
private defaultFromEmail = '<must match a verified SendGrid sender>';
```

### 5. Testing After Setup

The debug endpoint is registered only outside production and requires an authenticated super-admin session. Never expose it as a public delivery test.

```bash
# Test email delivery with a valid local super-admin session cookie
curl -X POST "http://localhost:5000/api/test-email" \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=<local-super-admin-session-cookie>" \
  -d '{"email":"your-email@example.com"}'

# Expected response after domain auth:
# {"success":true,"message":"Test email sent successfully"}
```

The route does not exist in production. An unauthenticated request or a session without the canonical super-admin role is rejected.

## Timeline

- **Immediate**: Single Sender Verification (if needed for testing)
- **1-24 hours**: Domain Authentication (DNS propagation time)
- **After verification**: Exercise each supported email path and confirm delivery in SendGrid activity

## Common DNS Provider Tips

**GoDaddy:**
- Only enter subdomain part (e.g., `em1234` not `em1234.em8411.getmoreviews.com`)

**Cloudflare:**
- Enter full CNAME as provided
- Proxy status should be DNS only (gray cloud)

**Namecheap:**
- Use @ for root domain references

## Success Indicators

After proper setup:
- ✅ HTTP 202 response from SendGrid API
- ✅ Emails delivered without "via sendgrid.net"
- ✅ Activity shows in SendGrid dashboard
- ✅ No more 401 errors in logs

## Next Steps

1. **Complete Domain Authentication** in SendGrid dashboard
2. **Add DNS records** to your DNS provider
3. **Wait for verification** (check every few hours)
4. **Test email delivery** once verified

Domain authentication alone is not proof that delivery works. Confirm the configured sender, API permissions, current template IDs, application base URL, and each supported email path before treating email as release-ready.
