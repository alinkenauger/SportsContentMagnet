import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface Screenshot {
  timestamp: number;
  filename: string;
  path: string;
  type: 'start' | 'middle' | 'key_moment';
  size: number;
}

export interface VideoScreenshotResult {
  success: boolean;
  screenshots?: Screenshot[];
  videoPath?: string;
  error?: string;
  cleanup?: () => Promise<void>;
}

export class VideoScreenshotService {
  private tempDir: string;
  private screenshotsDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
    
    try {
      await fs.access(this.screenshotsDir);
    } catch {
      await fs.mkdir(this.screenshotsDir, { recursive: true });
    }
  }

  /**
   * Extract video and generate screenshots at specific timestamps
   */
  async extractScreenshots(
    videoUrl: string,
    timestamps: Array<{ timestamp: number; duration: number; title: string }>
  ): Promise<VideoScreenshotResult> {
    const sessionId = randomUUID();
    const videoPath = path.join(this.tempDir, `${sessionId}.mp4`);
    const screenshots: Screenshot[] = [];

    try {
      console.log(`Starting video download for screenshots: ${videoUrl}`);

      // Step 1: Download video with yt-dlp
      const downloadResult = await this.downloadVideo(videoUrl, videoPath);
      if (!downloadResult.success) {
        return {
          success: false,
          error: downloadResult.error
        };
      }

      console.log(`Video downloaded successfully, extracting ${timestamps.length} sections`);

      // Step 2: Extract screenshots for each timestamp section
      for (const section of timestamps) {
        const sectionScreenshots = await this.extractSectionScreenshots(
          videoPath,
          section,
          sessionId
        );
        screenshots.push(...sectionScreenshots);
      }

      console.log(`Extracted ${screenshots.length} screenshots total`);

      // Step 3: Create cleanup function
      const cleanup = async () => {
        try {
          await fs.unlink(videoPath);
          console.log(`Cleaned up video file: ${videoPath}`);
        } catch (error) {
          console.warn(`Failed to cleanup video file: ${error}`);
        }
      };

      return {
        success: true,
        screenshots,
        videoPath,
        cleanup
      };

    } catch (error) {
      return {
        success: false,
        error: `Screenshot extraction error: ${error}`
      };
    }
  }

  /**
   * Download video using yt-dlp
   */
  private async downloadVideo(videoUrl: string, outputPath: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const ytdlpArgs = [
        videoUrl,
        '--format', 'best[height<=720]', // Limit to 720p for faster processing
        '--output', outputPath,
        '--no-playlist',
        '--max-downloads', '1'
      ];

      const process = spawn('yt-dlp', ytdlpArgs);
      let errorOutput = '';

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `yt-dlp failed with code ${code}: ${errorOutput}`
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to spawn yt-dlp: ${error.message}`
        });
      });
    });
  }

  /**
   * Extract screenshots for a specific section (start, middle, key moment)
   */
  private async extractSectionScreenshots(
    videoPath: string,
    section: { timestamp: number; duration: number; title: string },
    sessionId: string
  ): Promise<Screenshot[]> {
    const screenshots: Screenshot[] = [];
    const sectionId = section.title.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Define screenshot moments within the section
    const moments = [
      {
        time: section.timestamp,
        type: 'start' as const,
        suffix: 'start'
      },
      {
        time: section.timestamp + Math.max(5, section.duration / 2),
        type: 'middle' as const,
        suffix: 'middle'
      },
      {
        time: section.timestamp + Math.max(3, section.duration - 5),
        type: 'key_moment' as const,
        suffix: 'key'
      }
    ];

    for (const moment of moments) {
      try {
        const filename = `${sessionId}_${sectionId}_${moment.suffix}.jpg`;
        const screenshotPath = path.join(this.screenshotsDir, filename);

        const success = await this.extractSingleScreenshot(
          videoPath,
          moment.time,
          screenshotPath
        );

        if (success) {
          const stats = await fs.stat(screenshotPath);
          screenshots.push({
            timestamp: moment.time,
            filename,
            path: `/screenshots/${filename}`, // Public URL path
            type: moment.type,
            size: stats.size
          });
        }
      } catch (error) {
        console.warn(`Failed to extract screenshot at ${moment.time}s: ${error}`);
      }
    }

    return screenshots;
  }

  /**
   * Extract a single screenshot using FFmpeg
   */
  private async extractSingleScreenshot(
    videoPath: string,
    timestamp: number,
    outputPath: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpegArgs = [
        '-ss', timestamp.toString(),
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2', // High quality
        '-vf', 'scale=640:-1', // Scale to 640px width, maintain aspect ratio
        '-y', // Overwrite output
        outputPath
      ];

      const process = spawn('ffmpeg', ffmpegArgs);
      let errorOutput = '';

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          console.warn(`FFmpeg failed for timestamp ${timestamp}s: ${errorOutput}`);
          resolve(false);
        }
      });

      process.on('error', (error) => {
        console.warn(`Failed to spawn FFmpeg: ${error.message}`);
        resolve(false);
      });
    });
  }

  /**
   * Check if required tools are available
   */
  async checkDependencies(): Promise<{
    ytdlp: boolean;
    ffmpeg: boolean;
    ready: boolean;
  }> {
    const checkTool = (tool: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const process = spawn(tool, ['--version']);
        process.on('close', (code) => resolve(code === 0));
        process.on('error', () => resolve(false));
      });
    };

    const [ytdlp, ffmpeg] = await Promise.all([
      checkTool('yt-dlp'),
      checkTool('ffmpeg')
    ]);

    return {
      ytdlp,
      ffmpeg,
      ready: ytdlp && ffmpeg
    };
  }

  /**
   * Clean up old screenshots (run periodically)
   */
  async cleanupOldScreenshots(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = await fs.readdir(this.screenshotsDir);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.screenshotsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtimeMs < cutoffTime) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old screenshot: ${file}`);
        }
      }
    } catch (error) {
      console.warn(`Screenshot cleanup failed: ${error}`);
    }
  }
}

export const videoScreenshotService = new VideoScreenshotService();