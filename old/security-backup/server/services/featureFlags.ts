// Feature flags for deployment optimization
export const featureFlags = {
  // PDF generation - disabled in production to avoid puppeteer issues
  enablePDFGeneration: process.env.DISABLE_PDF_GENERATION !== 'true',
  
  // Image processing - disabled in production to avoid sharp issues
  enableImageProcessing: process.env.DISABLE_IMAGE_PROCESSING !== 'true',
  
  // Audio processing - disabled in production to avoid whisper issues
  enableAudioProcessing: process.env.DISABLE_AUDIO_PROCESSING !== 'true',
  
  // External services fallbacks
  useExternalPDFService: process.env.USE_EXTERNAL_PDF_SERVICE === 'true',
  useExternalImageService: process.env.USE_EXTERNAL_IMAGE_SERVICE === 'true',
  
  // Development mode
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
};

export function isPDFGenerationEnabled(): boolean {
  return featureFlags.enablePDFGeneration && !featureFlags.useExternalPDFService;
}

export function isImageProcessingEnabled(): boolean {
  return featureFlags.enableImageProcessing && !featureFlags.useExternalImageService;
}

export function shouldUseHeavyPackages(): boolean {
  return featureFlags.isDevelopment || (
    featureFlags.enablePDFGeneration && 
    featureFlags.enableImageProcessing
  );
}