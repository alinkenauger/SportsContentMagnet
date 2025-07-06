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
  private defaultFromEmail = 'noreply@vidmagnet.com';

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
        text: params.text,
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
            <h2>Hi ${user.firstName},</h2>
            
            <p>Welcome to VidMagnet! We're excited to help you transform your videos into high-converting lead magnets.</p>
            
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
            
            <p>Best regards,<br>The VidMagnet Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 VidMagnet. All rights reserved.</p>
            <p>Transform your videos into lead magnets with AI-powered analysis.</p>
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
            
            <p>We received a request to reset your VidMagnet account password.</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Your Password</a>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
            
            <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            
            <p>Best regards,<br>The VidMagnet Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 VidMagnet. All rights reserved.</p>
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