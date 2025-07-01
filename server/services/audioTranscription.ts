import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  language?: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  method?: string;
  error?: string;
}

export class AudioTranscriptionService {
  private pythonScriptPath: string;

  constructor() {
    this.pythonScriptPath = path.join(__dirname, 'transcription.py');
  }

  /**
   * Transcribe audio file using Python transcription service
   */
  async transcribeFile(filePath: string, method: 'whisper' | 'google' | 'auto' = 'auto'): Promise<TranscriptionResult> {
    return new Promise((resolve) => {
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        resolve({
          success: false,
          error: 'Audio file not found'
        });
        return;
      }

      // Spawn Python process
      const pythonProcess = spawn('python3', [this.pythonScriptPath, filePath, method], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          resolve({
            success: false,
            error: `Transcription process failed with code ${code}: ${errorOutput}`
          });
          return;
        }

        try {
          const result = JSON.parse(output);
          if (result.error) {
            resolve({
              success: false,
              error: result.error
            });
          } else {
            resolve({
              success: true,
              text: result.text,
              language: result.language,
              segments: result.segments,
              method: result.method
            });
          }
        } catch (parseError) {
          resolve({
            success: false,
            error: `Failed to parse transcription result: ${parseError}`
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to start transcription process: ${error.message}`
        });
      });
    });
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return [
      'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma',
      'mp4', 'mov', 'avi', 'mkv', 'webm' // Video files (audio will be extracted)
    ];
  }

  /**
   * Check if file format is supported
   */
  isFormatSupported(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase().replace('.', '');
    return this.getSupportedFormats().includes(extension);
  }

  /**
   * Get estimated transcription time based on file size
   */
  getEstimatedTime(fileSizeBytes: number): string {
    // Rough estimate: 1MB = ~1 minute of audio = ~30 seconds processing time
    const estimatedMinutes = Math.ceil((fileSizeBytes / (1024 * 1024)) * 0.5);
    return estimatedMinutes < 1 ? "Less than 1 minute" : `${estimatedMinutes} minute${estimatedMinutes > 1 ? 's' : ''}`;
  }
}

export const audioTranscription = new AudioTranscriptionService();