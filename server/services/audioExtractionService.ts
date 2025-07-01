import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface AudioExtractionResult {
  success: boolean;
  audioPath?: string;
  duration?: number;
  error?: string;
  cleanup?: () => Promise<void>;
}

export class AudioExtractionService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Extract audio from YouTube video using yt-dlp
   * This bypasses YouTube's transcription restrictions by downloading audio
   */
  async extractAudioFromYoutube(videoUrl: string): Promise<AudioExtractionResult> {
    const outputId = randomUUID();
    const outputPath = path.join(this.tempDir, `${outputId}.wav`);

    try {
      console.log(`Starting audio extraction for: ${videoUrl}`);
      
      // Use yt-dlp to extract audio in WAV format (best for Whisper)
      const ytdlpArgs = [
        videoUrl,
        '--extract-audio',
        '--audio-format', 'wav',
        '--audio-quality', '0',
        '--output', outputPath.replace('.wav', '.%(ext)s'),
        '--no-playlist',
        '--max-downloads', '1'
      ];

      const result = await this.runCommand('yt-dlp', ytdlpArgs);
      
      if (!result.success) {
        return {
          success: false,
          error: `Audio extraction failed: ${result.error}`
        };
      }

      // Check if the file was created
      try {
        await fs.access(outputPath);
        const stats = await fs.stat(outputPath);
        
        console.log(`Audio extracted successfully: ${outputPath} (${stats.size} bytes)`);
        
        return {
          success: true,
          audioPath: outputPath,
          duration: await this.getAudioDuration(outputPath),
          cleanup: async () => {
            try {
              await fs.unlink(outputPath);
              console.log(`Cleaned up temp file: ${outputPath}`);
            } catch (error) {
              console.warn(`Failed to cleanup temp file: ${outputPath}`, error);
            }
          }
        };
      } catch (error) {
        return {
          success: false,
          error: `Audio file not found after extraction: ${error}`
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Audio extraction error: ${error}`
      };
    }
  }

  /**
   * Get audio duration using ffprobe
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    try {
      const result = await this.runCommand('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        audioPath
      ]);

      if (result.success && result.output) {
        return parseFloat(result.output.trim());
      }
    } catch (error) {
      console.warn('Failed to get audio duration:', error);
    }
    return 0;
  }

  /**
   * Run a command and return the result
   */
  private async runCommand(
    command: string, 
    args: string[]
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      console.log(`Running: ${command} ${args.join(' ')}`);
      
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output: stdout
          });
        } else {
          resolve({
            success: false,
            error: stderr || `Process exited with code ${code}`
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to start process: ${error.message}`
        });
      });
    });
  }

  /**
   * Check if required tools are available
   */
  async checkDependencies(): Promise<{
    ytdlp: boolean;
    ffprobe: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    const ytdlpCheck = await this.runCommand('yt-dlp', ['--version']);
    const ffprobeCheck = await this.runCommand('ffprobe', ['-version']);

    if (!ytdlpCheck.success) {
      issues.push('yt-dlp not found - required for audio extraction');
    }

    if (!ffprobeCheck.success) {
      issues.push('ffprobe not found - required for audio processing');
    }

    return {
      ytdlp: ytdlpCheck.success,
      ffprobe: ffprobeCheck.success,
      issues
    };
  }
}

export const audioExtractionService = new AudioExtractionService();