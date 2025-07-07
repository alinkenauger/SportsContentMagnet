// Lightweight server configuration for deployment
process.env.DISABLE_PDF_GENERATION = 'true';
process.env.DISABLE_IMAGE_PROCESSING = 'true';
process.env.DISABLE_AUDIO_PROCESSING = 'true';

// Import and start the main server
import('./dist/index.js');
