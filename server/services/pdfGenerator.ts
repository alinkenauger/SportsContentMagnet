import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import type { Guide, BrandingSettings } from '@shared/schema';

interface PDFOptions {
  guide: Guide;
  branding?: BrandingSettings;
  channelTitle?: string;
}

// Lightweight HTML-based PDF generation (no puppeteer)
export async function generateGuidePDF(options: PDFOptions): Promise<Buffer> {
  const { guide, branding, channelTitle } = options;
  
  // Load the PDF template
  const templatePath = path.join(process.cwd(), 'server/templates/guide-pdf.hbs');
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = handlebars.compile(templateSource);

  // Prepare template data
  const content = guide.content as any;
  const templateData = {
    title: guide.title,
    description: guide.description,
    channelTitle: channelTitle,
    companyName: branding?.companyName || 'ConvertMag',
    logoUrl: branding?.logoUrl,
    primaryColor: branding?.primaryColor || '#2563eb',
    secondaryColor: branding?.secondaryColor || '#1d4ed8',
    content: content,
    createdAt: new Date().toLocaleDateString(),
    disclaimer: `This guide was created from video content. Original creator: ${channelTitle || 'Unknown'}`,
    drillBreakdowns: content?.drillBreakdowns || []
  };

  // Generate HTML
  const html = template(templateData);
  
  // For deployment, return HTML as text (can be processed by external PDF service)
  // This eliminates the need for puppeteer
  return Buffer.from(html, 'utf8');
}

export function generatePDFFilename(guide: Guide): string {
  const sanitized = guide.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return `${sanitized}_guide.html`; // Changed to HTML for lightweight deployment
}