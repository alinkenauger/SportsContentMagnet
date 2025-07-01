import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface WhisperYoutubeResult {
  success: boolean;
  transcript?: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language?: string;
  method?: string;
  error?: string;
  video_info?: {
    id: string;
    title: string;
    duration: number;
  };
}

export class WhisperYoutubeService {
  private pythonScriptPath: string;

  constructor() {
    this.pythonScriptPath = path.join(__dirname, 'whisper_youtube_extractor.py');
  }

  /**
   * Extract and transcribe YouTube video using yt-dlp + Whisper
   * This bypasses YouTube's subtitle restrictions by downloading audio
   */
  async extractAndTranscribe(videoIdOrUrl: string, modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large' = 'base'): Promise<WhisperYoutubeResult> {
    return new Promise((resolve) => {
      // Spawn Python process with timeout
      const pythonProcess = spawn('python3', [this.pythonScriptPath, videoIdOrUrl, modelSize], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300000 // 5 minute timeout for larger videos
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        try {
          if (code === 0 && stdout.trim()) {
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } else {
            resolve({
              success: false,
              error: stderr || `Process exited with code ${code}`,
              method: 'whisper_youtube_failed'
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: `Failed to parse response: ${error}`,
            method: 'whisper_youtube_error'
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({
          success: false,
          error: `Process error: ${error.message}`,
          method: 'whisper_youtube_error'
        });
      });

      // Handle timeout
      pythonProcess.on('timeout', () => {
        pythonProcess.kill();
        resolve({
          success: false,
          error: 'Transcription timed out after 5 minutes',
          method: 'whisper_youtube_timeout'
        });
      });
    });
  }

  /**
   * Quick transcription using smaller model for faster results
   */
  async quickTranscribe(videoIdOrUrl: string): Promise<WhisperYoutubeResult> {
    return this.extractAndTranscribe(videoIdOrUrl, 'tiny');
  }

  /**
   * High quality transcription using larger model
   */
  async highQualityTranscribe(videoIdOrUrl: string): Promise<WhisperYoutubeResult> {
    return this.extractAndTranscribe(videoIdOrUrl, 'base');
  }

  /**
   * Check if video is likely to be processable
   */
  async checkVideoAvailability(videoIdOrUrl: string): Promise<boolean> {
    try {
      // Quick check with tiny model
      const result = await this.extractAndTranscribe(videoIdOrUrl, 'tiny');
      return result.success;
    } catch {
      return false;
    }
  }
}

export const whisperYoutubeService = new WhisperYoutubeService();