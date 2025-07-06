# SendGrid Dynamic Templates Setup Guide

## Overview
This guide shows you how to create dynamic email templates in SendGrid for ConvertMag.net using your verified `getmoreviews.com` domain.

## Step 1: Create Dynamic Templates in SendGrid

### 1. Login to SendGrid Dashboard
- Go to https://app.sendgrid.com/
- Navigate to: **Email API** → **Dynamic Templates**

### 2. Create Welcome Email Template

**Template Name:** ConvertMag.net Welcome Email
**Template ID:** (Copy this ID to your environment variables)

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ConvertMag.net</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .credentials { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
        .warning { color: #e74c3c; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to ConvertMag.net!</h1>
            <p>Your account has been created successfully</p>
        </div>
        
        <div class="content">
            <h2>Hi {{firstName}},</h2>
            
            <p>Welcome to ConvertMag.net! We're excited to help you transform ANY content into high-converting lead magnets.</p>
            
            <div class="credentials">
                <h3>Your Login Details:</h3>
                <p><strong>Email:</strong> {{email}}</p>
                <p><strong>Temporary Password:</strong> <code>{{tempPassword}}</code></p>
                <p class="warning">⚠️ Please change your password after your first login for security.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="{{loginUrl}}" class="button">Login to Your Account</a>
            </div>
            
            <h3>What's Next?</h3>
            <ul>
                <li>✅ Create your first guide from a YouTube video</li>
                <li>✅ Customize your branding and landing pages</li>
                <li>✅ Start capturing leads with your content</li>
                <li>✅ Track your conversion analytics</li>
            </ul>
            
            <p>If you have any questions, feel free to reach out to our support team. We're here to help!</p>
            
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

### 3. Create Password Reset Template

**Template Name:** ConvertMag.net Password Reset
**Template ID:** (Copy this ID to your environment variables)

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your ConvertMag.net Password</title>
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
            
            <p>We received a request to reset your ConvertMag.net account password.</p>
            
            <div style="text-align: center;">
                <a href="{{resetUrl}}" class="button">Reset Your Password</a>
            </div>
            
            <div class="warning">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
            
            <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #666;">{{resetUrl}}</p>
            
            <p>Best regards,<br>The ConvertMag.net Team</p>
        </div>
        
        <div class="footer">
            <p>&copy; {{currentYear}} ConvertMag.net. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### 4. Create Guide Delivery Template

**Template Name:** ConvertMag.net Guide Delivery
**Template ID:** (Copy this ID to your environment variables)

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

Add these environment variables to your Replit project:

```
SENDGRID_WELCOME_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_PASSWORD_RESET_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_GUIDE_DELIVERY_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_LEAD_NOTIFICATION_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_SUBSCRIPTION_CONFIRMATION_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Dynamic Template Variables

### Welcome Email Variables:
- `{{firstName}}` - User's first name
- `{{lastName}}` - User's last name
- `{{email}}` - User's email address
- `{{tempPassword}}` - Temporary password
- `{{loginUrl}}` - Login URL
- `{{currentYear}}` - Current year for copyright

### Password Reset Variables:
- `{{firstName}}` - User's first name
- `{{resetUrl}}` - Password reset URL with token
- `{{currentYear}}` - Current year for copyright

### Guide Delivery Variables:
- `{{firstName}}` - User's first name
- `{{guideTitle}}` - Name of the guide
- `{{landingPageUrl}}` - Landing page URL
- `{{guideUrl}}` - Guide preview URL
- `{{currentYear}}` - Current year for copyright

## Step 4: Testing Templates

1. **Create a test template** first with simple content
2. **Send test emails** using SendGrid's test functionality
3. **Verify dynamic variables** are working correctly
4. **Check deliverability** using your verified domain

## Step 5: Implementation Notes

- Templates will automatically use `noreply@getmoreviews.com` as the sender
- The system falls back to HTML emails if template IDs are not provided
- All templates are mobile-responsive and professionally designed
- Variables are automatically escaped to prevent XSS attacks

## Common Issues & Solutions

**Issue:** Template variables not showing
**Solution:** Ensure variable names match exactly (case-sensitive)

**Issue:** Emails going to spam
**Solution:** Verify your domain authentication is complete

**Issue:** Template not found
**Solution:** Double-check the template ID in your environment variables

## Next Steps

1. Create the templates in SendGrid using the HTML above
2. Copy the template IDs to your environment variables
3. Test each template with sample data
4. Your ConvertMag.net emails will automatically use the dynamic templates!