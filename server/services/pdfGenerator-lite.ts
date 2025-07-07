// Lightweight PDF service for deployment without puppeteer
import type { Guide, BrandingSettings } from '@shared/schema';

export function generatePDFFilename(guide: Guide): string {
  const sanitizedTitle = guide.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  return `${sanitizedTitle}-guide.pdf`;
}

export async function generateGuidePDF(options: {
  guide: Guide;
  branding?: BrandingSettings;
  channelTitle?: string;
}): Promise<Buffer> {
  // Return a placeholder message in PDF-like format
  const message = `PDF generation is temporarily unavailable in this deployment.
  
Guide: ${options.guide.title}
  
Please contact support for PDF download options or use the web version of your guide.

For immediate access, you can print the guide directly from the web interface.`;

  // Create a simple text buffer (in a real implementation, you'd use a lightweight PDF library)
  return Buffer.from(message, 'utf-8');
}