import { MailService } from '@sendgrid/mail';

interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: any;
}

interface HighLevelContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export class EmailService {
  private mailService?: MailService;
  private defaultFromEmail = 'noreply@getmoreviews.com';
  
  // SendGrid Dynamic Template IDs - these should be set in your environment variables
  private templates = {
    welcome: process.env.SENDGRID_WELCOME_TEMPLATE_ID,
    passwordReset: process.env.SENDGRID_PASSWORD_RESET_TEMPLATE_ID,
    guideDelivery: process.env.SENDGRID_GUIDE_DELIVERY_TEMPLATE_ID,
    leadNotification: process.env.SENDGRID_LEAD_NOTIFICATION_TEMPLATE_ID,
    subscriptionConfirmation: process.env.SENDGRID_SUBSCRIPTION_CONFIRMATION_TEMPLATE_ID,
  };

  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      this.mailService = new MailService();
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!this.mailService) {
      console.warn('SendGrid not configured, email would be sent:', params.subject);
      return false;
    }

    try {
      await this.mailService.send({
        to: params.to,
        from: params.from || this.defaultFromEmail,
        subject: params.subject,
        text: params.text || '',
        html: params.html,
        templateId: params.templateId,
        dynamicTemplateData: params.dynamicTemplateData,
      });
      return true;
    } catch (error) {
      console.error('SendGrid email error:', error);
      return false;
    }
  }

  async sendWelcomeEmail(user: { firstName: string; lastName: string; email: string; tempPassword: string }): Promise<boolean> {
    const loginUrl = process.env.REPLIT_DOMAINS ? 
      `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/login` : 
      'https://your-domain.com/api/login';

    // If we have a dynamic template, use it
    if (this.templates.welcome) {
      return this.sendEmail({
        to: user.email,
        subject: 'Welcome to ConvertMag.net - Your Account is Ready!',
        templateId: this.templates.welcome,
        dynamicTemplateData: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          tempPassword: user.tempPassword,
          loginUrl: loginUrl,
          currentYear: new Date().getFullYear()
        }
      });
    }

    // Fallback to HTML template

    const html = `
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
            <h2>Hi ${user.firstName},</h2>
            
            <p>Welcome to ConvertMag.net! We're excited to help you transform ANY content into high-converting lead magnets.</p>
            
            <div class="credentials">
              <h3>Your Login Details:</h3>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Temporary Password:</strong> <code>${user.tempPassword}</code></p>
              <p class="warning">⚠️ Please change your password after your first login for security.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Login to Your Account</a>
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
            <p>&copy; 2025 ConvertMag.net. All rights reserved.</p>
            <p>Transform ANY content into high-converting lead magnets.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Welcome to VidMagnet - Your Account is Ready!`,
      html,
    });
  }

  async sendPasswordResetEmail(user: { email: string; firstName: string }, resetToken: string): Promise<boolean> {
    const resetUrl = process.env.REPLIT_DOMAINS ? 
      `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/reset-password?token=${resetToken}` : 
      `https://your-domain.com/reset-password?token=${resetToken}`;

    // If we have a dynamic template, use it
    if (this.templates.passwordReset) {
      return this.sendEmail({
        to: user.email,
        subject: 'Reset Your ConvertMag.net Password',
        templateId: this.templates.passwordReset,
        dynamicTemplateData: {
          firstName: user.firstName,
          resetUrl: resetUrl,
          currentYear: new Date().getFullYear()
        }
      });
    }

    // Fallback to HTML template

    const html = `
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
            <h2>Hi ${user.firstName},</h2>
            
            <p>We received a request to reset your ConvertMag.net account password.</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Your Password</a>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
            
            <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            
            <p>Best regards,<br>The ConvertMag.net Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 ConvertMag.net. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Reset Your ConvertMag.net Password`,
      html,
    });
  }

  async sendGuideDeliveryEmail(user: { email: string; firstName: string }, guideTitle: string, guideUrl: string, landingPageUrl: string): Promise<boolean> {
    const html = `
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
            <h2>Hi ${user.firstName},</h2>
            
            <p>Great news! Your lead magnet "<strong>${guideTitle}</strong>" has been created and is ready to start capturing leads.</p>
            
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
              <a href="${landingPageUrl}" class="button">View Landing Page</a>
              <a href="${guideUrl}" class="button">Preview Guide</a>
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
            <p>&copy; 2025 ConvertMag.net. All rights reserved.</p>
            <p>Transform ANY content into high-converting lead magnets.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `🎉 "${guideTitle}" is ready to capture leads!`,
      html,
    });
  }

  async sendLeadNotificationEmail(userEmail: string, leadData: { firstName: string; lastName: string; email: string; guideTitle: string; landingPageUrl: string }): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Lead Captured!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .lead-info { background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 New Lead Captured!</h1>
            <p>Someone just downloaded your guide</p>
          </div>
          
          <div class="content">
            <h2>Congratulations!</h2>
            
            <p>You just captured a new lead with your ConvertMag.net guide. Here are the details:</p>
            
            <div class="lead-info">
              <h3>Lead Information:</h3>
              <p><strong>Name:</strong> ${leadData.firstName} ${leadData.lastName}</p>
              <p><strong>Email:</strong> ${leadData.email}</p>
              <p><strong>Guide:</strong> ${leadData.guideTitle}</p>
              <p><strong>Source:</strong> <a href="${leadData.landingPageUrl}">Landing Page</a></p>
            </div>
            
            <p>This lead has been automatically added to your dashboard where you can:</p>
            <ul>
              <li>Export lead data to CSV</li>
              <li>View conversion analytics</li>
              <li>Track engagement metrics</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/leads` : '#'}" class="button">View All Leads</a>
            </div>
            
            <p>Keep up the great work! Your ConvertMag.net system is working perfectly.</p>
            
            <p>Best regards,<br>The ConvertMag.net Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 ConvertMag.net. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `🚀 New lead from "${leadData.guideTitle}"`,
      html,
    });
  }

  async sendSubscriptionConfirmationEmail(user: { email: string; firstName: string }, planName: string, amount: number): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .plan-details { background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ${planName}!</h1>
            <p>Your subscription is now active</p>
          </div>
          
          <div class="content">
            <h2>Hi ${user.firstName},</h2>
            
            <p>Thank you for upgrading to ConvertMag.net ${planName}! Your payment has been processed successfully.</p>
            
            <div class="plan-details">
              <h3>Subscription Details:</h3>
              <p><strong>Plan:</strong> ${planName}</p>
              <p><strong>Amount:</strong> $${amount.toFixed(2)}/month</p>
              <p><strong>Status:</strong> Active</p>
              <p><strong>Next billing:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            </div>
            
            <h3>What's unlocked:</h3>
            <ul>
              <li>✅ Unlimited lead capture</li>
              <li>✅ Custom branding and white-labeling</li>
              <li>✅ Advanced analytics and reporting</li>
              <li>✅ Priority support</li>
              <li>✅ Multiple brand workspaces</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/dashboard` : '#'}" class="button">Access Your Dashboard</a>
            </div>
            
            <p>Start creating unlimited lead magnets and growing your business!</p>
            
            <p>Best regards,<br>The ConvertMag.net Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 ConvertMag.net. All rights reserved.</p>
            <p>Questions? Contact us at support@convertmag.net</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `🎉 ${planName} subscription confirmed - Welcome aboard!`,
      html,
    });
  }
}

export class HighLevelService {
  private apiKey?: string;
  private baseUrl = 'https://rest.gohighlevel.com/v1';

  constructor() {
    this.apiKey = process.env.HIGHLEVEL_API_KEY;
  }

  async addContact(contactData: HighLevelContactData): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('High Level API key not configured, contact would be added:', contactData.email);
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/contacts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
          companyName: contactData.company,
          tags: contactData.tags || ['VidMagnet-Signup'],
          customFields: contactData.customFields || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`High Level API error: ${response.status}`);
      }

      console.log('Successfully added contact to High Level CRM:', contactData.email);
      return true;
    } catch (error) {
      console.error('High Level API error:', error);
      return false;
    }
  }

  async addTag(contactId: string, tag: string): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('High Level API key not configured');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/contacts/${contactId}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags: [tag] }),
      });

      return response.ok;
    } catch (error) {
      console.error('High Level tag error:', error);
      return false;
    }
  }

  async sendHighLevelEmail(contactEmail: string, subject: string, htmlContent: string): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('High Level API key not configured, email would be sent:', subject);
      return false;
    }

    try {
      // Note: High Level email sending requires specific setup and workflow triggers
      // This is a placeholder for the actual implementation which may vary based on your High Level setup
      console.log('High Level email would be sent:', { contactEmail, subject });
      return true;
    } catch (error) {
      console.error('High Level email error:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export const highLevelService = new HighLevelService();