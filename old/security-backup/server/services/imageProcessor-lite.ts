// Lightweight image processing service for deployment without Sharp
import fs from 'fs';
import path from 'path';

export async function processImage(
  buffer: Buffer,
  options: {
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover' | 'fill';
    background?: { r: number; g: number; b: number; alpha: number };
  }
): Promise<Buffer> {
  // In lightweight deployment, just return the original buffer
  // In production, you'd integrate with a cloud image processing service
  return buffer;
}

export async function processImageToFile(
  buffer: Buffer,
  outputPath: string,
  options: {
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover' | 'fill';
    background?: { r: number; g: number; b: number; alpha: number };
  }
): Promise<void> {
  // In lightweight deployment, just save the original file
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, buffer);
}

export function isImageProcessingAvailable(): boolean {
  return false; // Always false in lightweight deployment
}