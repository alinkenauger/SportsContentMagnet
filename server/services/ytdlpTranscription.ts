import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

export interface YtDlpResult {
  success: boolean;
  transcript?: string;
  method?: string;
  error?: string;
}

export class YtDlpTranscriptionService {
  private pythonScriptPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.pythonScriptPath = path.join(__dirname, 'youtube_extractor.py');
  }

  /**
   * Extract transcript using yt-dlp (more reliable than ytdl-core)
   */
  async extractTranscript(videoIdOrUrl: string): Promise<YtDlpResult> {
    return new Promise((resolve) => {
      // Spawn Python process with yt-dlp with timeout
      const pythonProcess = spawn('python3', [this.pythonScriptPath, videoIdOrUrl], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 20000 // 20 second timeout
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
            error: `yt-dlp process failed with code ${code}: ${errorOutput}`
          });
          return;
        }

        try {
          const result = JSON.parse(output);
          if (result.success) {
            resolve({
              success: true,
              transcript: result.transcript,
              method: result.method
            });
          } else {
            resolve({
              success: false,
              error: result.error,
              method: result.method
            });
          }
        } catch (parseError) {
          resolve({
            success: false,
            error: `Failed to parse yt-dlp result: ${parseError}`
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to start yt-dlp process: ${error.message}`
        });
      });
    });
  }
}

export const ytdlpTranscription = new YtDlpTranscriptionService();