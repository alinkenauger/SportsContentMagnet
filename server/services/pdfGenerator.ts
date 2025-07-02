import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import type { Guide, BrandingSettings } from '@shared/schema';

interface PDFOptions {
  guide: Guide;
  branding?: BrandingSettings;
  channelTitle?: string;
}

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
    companyName: branding?.companyName || 'VidMagnet',
    logoUrl: branding?.logoUrl,
    primaryColor: branding?.primaryColor || '#2563eb',
    secondaryColor: branding?.secondaryColor || '#1d4ed8',
    firstLetter: branding?.companyName?.charAt(0).toUpperCase() || 'V',
    sections: content?.sections || [],
    nextSteps: content?.nextSteps
  };

  // Generate HTML from template
  const html = template(templateData);

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set content and wait for fonts/images to load
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'] 
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      displayHeaderFooter: false
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export function generatePDFFilename(guide: Guide): string {
  // Create a safe filename from the guide title
  const safeTitle = guide.title
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  
  return `${safeTitle}-guide.pdf`;
}