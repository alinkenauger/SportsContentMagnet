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

export function publicAppBaseUrl(): string | undefined {
  const configuredUrl = process.env.PUBLIC_APP_URL?.trim();
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  const candidate = configuredUrl || (domain ? `https://${domain}` : undefined);
  if (!candidate) return undefined;

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return undefined;
    if (url.username || url.password || (url.pathname !== '/' && url.pathname !== '')) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);
}

export function sanitizeEmailSubject(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

export class EmailService {
  private mailService?: MailService;
  private defaultFromEmail = 'adam@getmoreviews.com'; // Verified in SendGrid Single Sender Auth
  
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
      console.log('SendGrid configured');
    } else {
      console.log('SendGrid API key not found');
    }
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!this.mailService) {
      console.warn('📧 SendGrid not configured, email would be sent:', params.subject);
      return false;
    }

    try {
      console.log(`📧 Attempting to send email: ${params.subject}`);
      const result = await this.mailService.send({
        to: params.to,
        from: params.from || this.defaultFromEmail,
        subject: params.subject,
        text: params.text || '',
        html: params.html,
        templateId: params.templateId,
        dynamicTemplateData: params.dynamicTemplateData,
      });
      console.log('✅ Email sent successfully');
      return true;
    } catch (error: any) {
      console.error('❌ SendGrid email error:', error.message);
      if (error.message?.includes("not authorized to send mail")) {
        console.error('🔧 ACTION NEEDED: Verify sender email in SendGrid → Settings → Sender Authentication');
        console.error(`   → Add and verify: ${this.defaultFromEmail}`);
      }
      return false;
    }
  }

  async sendWelcomeEmail(user: { firstName: string; lastName: string; email: string }): Promise<boolean> {
    const appBaseUrl = publicAppBaseUrl();
    if (!appBaseUrl) {
      console.error("PUBLIC_APP_URL or REPLIT_DOMAINS is required to send auth emails");
      return false;
    }
    const loginUrl = `${appBaseUrl}/login`;

    // If we have a dynamic template, use it
    if (this.templates.welcome) {
      return this.sendEmail({
        to: user.email,
        subject: 'Welcome to VidMagnet - Your Account is Ready!',
        templateId: this.templates.welcome,
        dynamicTemplateData: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          loginUrl: loginUrl,
          productName: "VidMagnet",
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
        <title>Welcome to VidMagnet</title>
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
            <h1>Welcome to VidMagnet!</h1>
            <p>Your account has been created successfully</p>
          </div>
          
          <div class="content">
            <h2>Hi ${escapeHtml(user.firstName)},</h2>
            
            <p>Welcome to VidMagnet. Your account is ready, and you can now turn content you already trust into a useful Guide or personalized Interactive Quiz.</p>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Login to Your Account</a>
            </div>
            
            <h3>What's Next?</h3>
            <ul>
              <li>Create your first Guide or Interactive Quiz</li>
              <li>Apply your brand to the recipient experience</li>
              <li>Add a useful next step for your lead</li>
            </ul>
            
            <p>If you have any questions, feel free to reach out to our support team. We're here to help!</p>
            
            <p>Best regards,<br>The VidMagnet Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VidMagnet. All rights reserved.</p>
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

  async sendAccountCompletionEmail(
    user: { email: string; firstName: string },
    completionToken: string,
  ): Promise<boolean> {
    const appBaseUrl = publicAppBaseUrl();
    if (!appBaseUrl) {
      console.error("PUBLIC_APP_URL or REPLIT_DOMAINS is required to send auth emails");
      return false;
    }
    const completionUrl = `${appBaseUrl}/complete-account#token=${encodeURIComponent(completionToken)}`;
    const firstName = escapeHtml(user.firstName || "there");
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Finish setting up VidMagnet</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #101419;">
        <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1>Finish setting up VidMagnet</h1>
          <p>Hi ${firstName},</p>
          <p>Use this secure link to finish setting your password. The link expires in 30 minutes and works once.</p>
          <p style="margin: 28px 0;">
            <a href="${completionUrl}" style="display: inline-block; background: #FF6B3D; color: #101419; padding: 12px 20px; border-radius: 8px; font-weight: 700; text-decoration: none;">Finish account setup</a>
          </p>
          <p>If you did not request this, you can ignore this email.</p>
          <p style="word-break: break-all; color: #5B6470;">${completionUrl}</p>
          <p>Best regards,<br>The VidMagnet Team</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: "Finish setting up your VidMagnet account",
      html,
    });
  }

  async sendPasswordResetEmail(user: { email: string; firstName: string }, resetToken: string): Promise<boolean> {
    const appBaseUrl = publicAppBaseUrl();
    if (!appBaseUrl) {
      console.error("PUBLIC_APP_URL or REPLIT_DOMAINS is required to send auth emails");
      return false;
    }
    const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const firstName = escapeHtml(user.firstName || "there");
    const safeResetUrl = escapeHtml(resetUrl);

    // If we have a dynamic template, use it
    if (this.templates.passwordReset) {
      return this.sendEmail({
        to: user.email,
        subject: 'Reset Your VidMagnet Password',
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
            <h2>Hi ${firstName},</h2>
            
            <p>We received a request to reset your VidMagnet account password.</p>
            
            <div style="text-align: center;">
              <a href="${safeResetUrl}" class="button">Reset Your Password</a>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
            
            <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #666;">${safeResetUrl}</p>
            
            <p>Best regards,<br>The VidMagnet Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VidMagnet. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Reset Your VidMagnet Password`,
      html,
    });
  }

  async sendGuideDeliveryEmail(user: { email: string; firstName: string }, guideTitle: string, guideUrl: string, landingPageUrl: string): Promise<boolean> {
    const firstName = escapeHtml(user.firstName || "there");
    const safeGuideTitle = escapeHtml(guideTitle);
    const safeGuideUrl = escapeHtml(guideUrl);
    const safeLandingPageUrl = escapeHtml(landingPageUrl);
    const subjectGuideTitle = sanitizeEmailSubject(guideTitle);
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
            <h2>Hi ${firstName},</h2>
            
            <p>Great news! Your lead magnet "<strong>${safeGuideTitle}</strong>" has been created and is ready to start capturing leads.</p>
            
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
              <a href="${safeLandingPageUrl}" class="button">View Landing Page</a>
              <a href="${safeGuideUrl}" class="button">Preview Guide</a>
            </div>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Share your landing page URL with your audience</li>
              <li>Monitor your conversion analytics in the dashboard</li>
              <li>Download lead information as they come in</li>
            </ol>
            
            <p>Start sharing and watch your leads grow! If you need any help, our support team is here for you.</p>
            
            <p>Best regards,<br>The VidMagnet Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VidMagnet. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `🎉 "${subjectGuideTitle}" is ready to capture leads!`,
      html,
    });
  }

  async sendLeadNotificationEmail(userEmail: string, leadData: { firstName: string; lastName: string; email: string; guideTitle: string; landingPageUrl: string }): Promise<boolean> {
    const firstName = escapeHtml(leadData.firstName);
    const lastName = escapeHtml(leadData.lastName);
    const leadEmail = escapeHtml(leadData.email);
    const guideTitle = escapeHtml(leadData.guideTitle);
    const landingPageUrl = escapeHtml(leadData.landingPageUrl);
    const leadsUrl = escapeHtml(
      process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/leads` : '#',
    );
    const subjectGuideTitle = sanitizeEmailSubject(leadData.guideTitle);
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
            
            <p>You just captured a new lead with your VidMagnet Guide. Here are the details:</p>
            
            <div class="lead-info">
              <h3>Lead Information:</h3>
              <p><strong>Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Email:</strong> ${leadEmail}</p>
              <p><strong>Guide:</strong> ${guideTitle}</p>
              <p><strong>Source:</strong> <a href="${landingPageUrl}">Landing Page</a></p>
            </div>
            
            <p>This lead has been automatically added to your dashboard where you can:</p>
            <ul>
              <li>Export lead data to CSV</li>
              <li>View conversion analytics</li>
              <li>Track engagement metrics</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${leadsUrl}" class="button">View All Leads</a>
            </div>
            
            <p>Keep up the great work! Your VidMagnet lead magnet is working.</p>
            
            <p>Best regards,<br>The VidMagnet Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VidMagnet. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `🚀 New lead from "${subjectGuideTitle}"`,
      html,
    });
  }

  async sendSubscriptionConfirmationEmail(user: { email: string; firstName: string }, planName: string, amount: number): Promise<boolean> {
    const firstName = escapeHtml(user.firstName || "there");
    const safePlanName = escapeHtml(planName);
    const subjectPlanName = sanitizeEmailSubject(planName);
    const dashboardUrl = escapeHtml(
      process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/dashboard` : '#',
    );
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
            <h1>🎉 Welcome to ${safePlanName}!</h1>
            <p>Your subscription is now active</p>
          </div>
          
          <div class="content">
            <h2>Hi ${firstName},</h2>
            
            <p>Thank you for upgrading to VidMagnet ${safePlanName}! Your payment has been processed successfully.</p>
            
            <div class="plan-details">
              <h3>Subscription Details:</h3>
              <p><strong>Plan:</strong> ${safePlanName}</p>
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
              <a href="${dashboardUrl}" class="button">Access Your Dashboard</a>
            </div>
            
            <p>Start creating unlimited lead magnets and growing your business!</p>
            
            <p>Best regards,<br>The VidMagnet Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VidMagnet. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `🎉 ${subjectPlanName} subscription confirmed - Welcome aboard!`,
      html,
    });
  }
}

export class HighLevelService {
  private apiKey?: string;
  private baseUrl = 'https://rest.gohighlevel.com/v1';
  private fetchImpl: typeof fetch;
  private requestTimeoutMs: number;

  constructor(options?: { fetchImpl?: typeof fetch; requestTimeoutMs?: number }) {
    this.apiKey = process.env.HIGHLEVEL_API_KEY;
    this.fetchImpl = options?.fetchImpl ?? fetch;
    this.requestTimeoutMs = options?.requestTimeoutMs ?? 2_500;
  }

  async addContact(contactData: HighLevelContactData): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('High Level API key not configured; contact sync skipped');
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/contacts/`, {
        method: 'POST',
        signal: controller.signal,
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

      console.log('Successfully added contact to High Level CRM');
      return true;
    } catch (error) {
      console.error('High Level API error:', error);
      return false;
    } finally {
      clearTimeout(timeout);
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
      console.warn('High Level API key not configured; email send skipped');
      return false;
    }

    try {
      // Note: High Level email sending requires specific setup and workflow triggers
      // This is a placeholder for the actual implementation which may vary based on your High Level setup
      console.log('High Level email request completed:', { subject });
      return true;
    } catch (error) {
      console.error('High Level email error:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export const highLevelService = new HighLevelService();
