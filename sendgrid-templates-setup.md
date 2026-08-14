# Legacy ConvertMag SendGrid Template Reference

> **Status: legacy ConvertMag template reference.** Only the welcome and password-reset dynamic template IDs are consumed by the current service. Never add a password to template data. Guide delivery, lead notification, and subscription confirmation currently use inline HTML in `server/services/emailService.ts`.

## Overview
This guide shows you how to create dynamic email templates in SendGrid for ConvertMag.net using your verified `getmoreviews.com` domain.

## Step 1: Create Dynamic Templates in SendGrid

### 1. Login to SendGrid Dashboard
- Go to https://app.sendgrid.com/
- Navigate to: **Email API** → **Dynamic Templates**

### 2. Create Welcome Email Template

**Template Name:** VidMagnet Welcome Email
**Template ID:** (Copy this ID to your environment variables)

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to VidMagnet</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to VidMagnet!</h1>
            <p>Your account has been created successfully</p>
        </div>
        
        <div class="content">
            <h2>Hi {{firstName}},</h2>
            
            <p>Welcome to {{productName}}. Your account is ready, and you can now turn trusted content into a useful Guide or personalized Outcome Quiz.</p>
            
            <div style="text-align: center;">
                <a href="{{loginUrl}}" class="button">Login to Your Account</a>
            </div>
            
            <h3>What's Next?</h3>
            <ul>
                <li>Create your first Guide or Outcome Quiz</li>
                <li>Apply your brand to the recipient experience</li>
                <li>Add a useful next step for your lead</li>
            </ul>
            
            <p>If you have any questions, feel free to reach out to our support team. We're here to help!</p>
            
            <p>Best regards,<br>The VidMagnet Team</p>
        </div>
        
        <div class="footer">
            <p>&copy; {{currentYear}} VidMagnet. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### 3. Create Password Reset Template

**Template Name:** VidMagnet Password Reset
**Template ID:** (Copy this ID to your environment variables)

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your VidMagnet Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        
        <div class="content">
            <h2>Hi {{firstName}},</h2>
            
            <p>We received a request to reset your VidMagnet account password.</p>
            
            <div style="text-align: center;">
                <a href="{{resetUrl}}" class="button">Reset Your Password</a>
            </div>
            
            <div class="warning">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
            
            <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #666;">{{resetUrl}}</p>
            
            <p>Best regards,<br>The VidMagnet Team</p>
        </div>
        
        <div class="footer">
            <p>&copy; {{currentYear}} VidMagnet. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### 4. Historical Guide Delivery Mockup

The HTML below is retained only as an archived design reference. The current `sendGuideDeliveryEmail` path does not consume a SendGrid dynamic template ID; edit the inline implementation instead of configuring an unused environment value.

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Guide is Ready!</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px; }
        .guide-preview { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Your Lead Magnet is Ready!</h1>
            <p>High-converting guide created successfully</p>
        </div>
        
        <div class="content">
            <h2>Hi {{firstName}},</h2>
            
            <p>Great news! Your lead magnet "<strong>{{guideTitle}}</strong>" has been created and is ready to start capturing leads.</p>
            
            <div class="guide-preview">
                <h3>What's included:</h3>
                <ul>
                    <li>✅ Professional landing page with compelling copy</li>
                    <li>✅ Interactive guide with smart timestamping</li>
                    <li>✅ Lead capture forms with analytics</li>
                    <li>✅ Branded PDF downloads</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="{{landingPageUrl}}" class="button">View Landing Page</a>
                <a href="{{guideUrl}}" class="button">Preview Guide</a>
            </div>
            
            <h3>Next Steps:</h3>
            <ol>
                <li>Share your landing page URL with your audience</li>
                <li>Monitor your conversion analytics in the dashboard</li>
                <li>Download lead information as they come in</li>
            </ol>
            
            <p>Start sharing and watch your leads grow! If you need any help, our support team is here for you.</p>
            
            <p>Best regards,<br>The ConvertMag.net Team</p>
        </div>
        
        <div class="footer">
            <p>&copy; {{currentYear}} ConvertMag.net. All rights reserved.</p>
            <p>Transform ANY content into high-converting lead magnets.</p>
        </div>
    </div>
</body>
</html>
```

## Step 2: Set Up Environment Variables

Only these two dynamic-template environment variables are currently consumed:

```
SENDGRID_WELCOME_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_PASSWORD_RESET_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Dynamic Template Variables

### Welcome Email Variables:
- `{{firstName}}` - User's first name
- `{{lastName}}` - User's last name
- `{{email}}` - User's email address
- `{{loginUrl}}` - Login URL
- `{{productName}}` - Product name (`VidMagnet`)
- `{{currentYear}}` - Current year for copyright

### Password Reset Variables:
- `{{firstName}}` - User's first name
- `{{resetUrl}}` - Password reset URL with token
- `{{currentYear}}` - Current year for copyright

### Guide Delivery Variables

Not applicable to a dynamic template in the current code. Guide delivery uses inline HTML.

## Step 4: Testing Templates

1. **Create a test template** first with simple content
2. **Send test emails** using SendGrid's test functionality
3. **Verify dynamic variables** are working correctly
4. **Check deliverability** using your verified domain

## Step 5: Implementation Notes

- SendGrid uses the exact `EmailService.defaultFromEmail` value; verify that address in the provider before release.
- Welcome and password-reset messages fall back to inline HTML when their template IDs are absent.
- Other current messages use inline HTML regardless of the unused legacy template environment names.
- Treat dynamic data as untrusted and avoid raw, unescaped interpolation in SendGrid templates. Current inline HTML escapes recipient-controlled text and subject control characters.

## Common Issues & Solutions

**Issue:** Template variables not showing
**Solution:** Ensure variable names match exactly (case-sensitive)

**Issue:** Emails going to spam
**Solution:** Verify your domain authentication is complete

**Issue:** Template not found
**Solution:** Double-check the template ID in your environment variables

## Next Steps

1. Create only the VidMagnet welcome and password-reset templates.
2. Set their two consumed template IDs in the environment.
3. Verify the sender and test both templates with non-sensitive sample data.
4. Exercise inline account-completion, Guide-delivery, lead-notification, and subscription messages separately.
