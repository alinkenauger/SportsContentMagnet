import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import type { Guide, BrandingSettings } from '@shared/schema';
import { normalizeGuideContent } from '@shared/guideContent';

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
  const content = normalizeGuideContent(guide.content);
  const templateData = {
    title: guide.title,
    description: guide.description,
    channelTitle: channelTitle,
    companyName: branding?.companyName || 'VidMagnet',
    logoUrl: branding?.logoUrl,
    primaryColor: branding?.primaryColor || '#2563eb',
    secondaryColor: branding?.secondaryColor || '#1d4ed8',
    introduction: content.introduction,
    promise: content.promise,
    sections: content.sections,
    conclusion: content.conclusion,
    nextSteps: content.callToAction,
    createdAt: new Date().toLocaleDateString(),
    disclaimer: channelTitle
      ? `Prepared from source content by ${channelTitle}. Review recommendations for your specific context.`
      : 'Prepared from supplied source content. Review recommendations for your specific context.',
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
