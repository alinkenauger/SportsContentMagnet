import { YoutubeTranscript } from 'youtube-transcript';
import { whisperYoutubeService } from './whisperYoutubeService.js';

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
}

export function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function getYouTubeVideoData(url: string): Promise<YouTubeVideoData> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY_ENV_VAR || "default_key";
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error("Video not found");
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const statistics = video.statistics;
    const contentDetails = video.contentDetails;

    return {
      videoId,
      title: snippet.title,
      description: snippet.description,
      thumbnailUrl: snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
      duration: contentDetails.duration,
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      viewCount: parseInt(statistics.viewCount || '0'),
      likeCount: parseInt(statistics.likeCount || '0'),
    };
  } catch (error) {
    console.error("Error fetching YouTube data:", error);
    throw new Error("Failed to fetch video data: " + (error as Error).message);
  }
}

export async function transcribeVideo(videoId: string): Promise<string | { text: string; segments: Array<{ start: number; end: number; text: string; }>; method: string; }> {
  try {
    console.log(`Attempting to transcribe video: ${videoId}`);
    
    // Primary method: Try youtube-transcript library FIRST (fastest, if available)
    console.log("Trying youtube-transcript library (fastest method)...");
    const transcript = await getYouTubeTranscript(videoId);
    if (transcript && transcript.length > 100) {
      console.log(`Successfully extracted transcript via youtube-transcript: ${transcript.length} characters`);
      return transcript;
    }
    
    // Fallback 2: Try yt-dlp for subtitle extraction (medium speed)
    console.log("youtube-transcript failed, trying yt-dlp subtitle extraction...");
    let ytdlpResult: any = { success: false, error: 'Not attempted' };
    try {
      const { ytdlpTranscription } = await import('./ytdlpTranscription');
      ytdlpResult = await ytdlpTranscription.extractTranscript(videoId);
      
      if (ytdlpResult.success && ytdlpResult.transcript && ytdlpResult.transcript.length > 100) {
        console.log(`Successfully extracted transcript via yt-dlp: ${ytdlpResult.transcript.length} characters`);
        return ytdlpResult.transcript;
      }
    } catch (error) {
      console.log("yt-dlp import/execution failed:", error);
    }

    // Fallback 3: Audio extraction + OpenAI Whisper transcription
    console.log("Trying automated audio extraction + AI transcription...");
    let audioResult: any = { success: false, error: 'Not attempted' };
    try {
      const { audioExtractionService } = await import('./audioExtractionService');
      const { audioTranscription } = await import('./audioTranscription');
      
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const extractionResult = await audioExtractionService.extractAudioFromYoutube(videoUrl);
      
      if (extractionResult.success && extractionResult.audioPath) {
        console.log(`Audio extracted successfully, now transcribing with OpenAI Whisper...`);
        
        const transcriptionResult = await audioTranscription.transcribeFile(extractionResult.audioPath);
        
        // Clean up the temporary audio file
        if (extractionResult.cleanup) {
          await extractionResult.cleanup();
        }
        
        if (transcriptionResult.success && transcriptionResult.text && transcriptionResult.text.length > 100) {
          console.log(`Successfully transcribed via audio extraction: ${transcriptionResult.text.length} characters`);
          // Return both text and segments for timestamp support
          return {
            text: transcriptionResult.text,
            segments: transcriptionResult.segments || [],
            method: 'audio_extraction'
          };
        } else {
          audioResult.error = transcriptionResult.error || 'Audio transcription failed';
        }
      } else {
        audioResult.error = extractionResult.error || 'Audio extraction failed';
      }
    } catch (error) {
      console.log("Audio extraction + transcription failed:", error);
      audioResult.error = `Audio processing error: ${error}`;
    }
    
    // Final fallback: Try whisper-youtube with fast tiny model (last resort)
    console.log("Trying whisper-youtube as final fallback (with tiny model for speed)...");
    const whisperYoutubeResult = await whisperYoutubeService.extractAndTranscribe(videoId, 'tiny');
    
    if (whisperYoutubeResult.success && whisperYoutubeResult.transcript && whisperYoutubeResult.transcript.length > 100) {
      console.log(`Successfully extracted transcript via whisper-youtube: ${whisperYoutubeResult.transcript.length} characters`);
      return whisperYoutubeResult.transcript;
    }

    // Provide specific error messaging based on what failed
    if (whisperYoutubeResult.error) {
      if (whisperYoutubeResult.error.includes('AGE_RESTRICTED')) {
        throw new Error(`AGE_RESTRICTED: This video requires age verification and cannot be processed automatically.\n\nAlternatives:\n• Use Audio Upload feature with downloaded audio\n• Try a different public video\n• Copy/paste manual transcript if available`);
      }
      if (whisperYoutubeResult.error.includes('PRIVATE_VIDEO')) {
        throw new Error(`PRIVATE_VIDEO: This video is private and cannot be accessed.\n\nAlternatives:\n• Try a public video\n• Use Audio Upload with downloaded audio\n• Copy/paste manual transcript`);
      }
      if (whisperYoutubeResult.error.includes('VIDEO_UNAVAILABLE')) {
        throw new Error(`VIDEO_UNAVAILABLE: This video is not available for processing.\n\nAlternatives:\n• Check if the video URL is correct\n• Try a different video\n• Use Audio Upload feature`);
      }
    }
    
    // Check if yt-dlp found no subtitles
    if (ytdlpResult?.error && ytdlpResult.error.includes('No subtitles found')) {
      throw new Error(`NO_CAPTIONS_AVAILABLE: Multiple transcription methods failed. The video may not have accessible audio or captions.\n\nSuggestions:\n• Try a different video with confirmed captions\n• Use the Audio Upload feature to transcribe downloaded audio\n• Copy/paste a manual transcript if you have one\n• Educational channels often have better processing success`);
    }
    
    // General failure case
    const errorDetails = {
      whisperYoutube: whisperYoutubeResult.error || 'Failed',
      ytdlp: ytdlpResult?.error || 'Failed', 
      audioExtraction: audioResult.error || 'Failed'
    };
    
    throw new Error(`TRANSCRIPTION_FAILED: All methods failed including automated audio extraction.\n\nError details:\n• Whisper-YouTube: ${errorDetails.whisperYoutube}\n• yt-dlp: ${errorDetails.ytdlp}\n• Audio extraction: ${errorDetails.audioExtraction}\n\nAlternatives:\n• Upload audio file manually for AI transcription\n• Paste manual transcript\n• Try a different video with confirmed accessibility`);
    
  } catch (error) {
    console.error("Transcription error:", error);
    
    // Check if it's our specific error type
    if ((error as Error).message.startsWith("TRANSCRIPTION_FAILED:") || 
        (error as Error).message.startsWith("AGE_RESTRICTED:") ||
        (error as Error).message.startsWith("PRIVATE_VIDEO:") ||
        (error as Error).message.startsWith("VIDEO_UNAVAILABLE:") ||
        (error as Error).message.startsWith("NO_CAPTIONS_AVAILABLE:")) {
      throw error;
    }
    
    throw new Error("Failed to transcribe video: " + (error as Error).message);
  }
}

async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    // First try the official YouTube Data API v3 captions endpoint (like Glasp)
    console.log("Attempting official YouTube API captions...");
    const transcript = await getOfficialYouTubeTranscript(videoId);
    if (transcript) {
      return transcript;
    }
    console.log("Official API failed, trying youtube-transcript library...");

    // Fallback to youtube-transcript library as secondary option
    const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en'
    });
    
    if (!transcriptArray || transcriptArray.length === 0) {
      console.log("No transcript found via youtube-transcript");
      return null;
    }

    // Combine all transcript segments into a single text
    const fullTranscript = transcriptArray
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return fullTranscript;
    
  } catch (error) {
    console.error("Error getting YouTube transcript:", error);
    return null;
  }
}

async function getOfficialYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    if (!process.env.YOUTUBE_API_KEY) {
      console.log("YouTube API key not available, skipping official API");
      return null;
    }

    // Get list of caption tracks for the video
    const captionsListUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${process.env.YOUTUBE_API_KEY}`;
    
    const captionsResponse = await fetch(captionsListUrl);
    const captionsData = await captionsResponse.json();
    
    if (captionsData.error) {
      console.error("YouTube API error:", captionsData.error);
      return null;
    }
    
    if (!captionsData.items || captionsData.items.length === 0) {
      console.log("No captions available for video:", videoId);
      return null;
    }

    // Find English captions (prefer manual over auto-generated)
    let captionTrack = captionsData.items.find((track: any) => 
      track.snippet.language === 'en' && track.snippet.trackKind === 'standard'
    );
    
    if (!captionTrack) {
      captionTrack = captionsData.items.find((track: any) => 
        track.snippet.language === 'en' && track.snippet.trackKind === 'ASR'
      );
    }
    
    if (!captionTrack) {
      captionTrack = captionsData.items[0]; // Use first available track
    }

    // Note: Downloading captions requires OAuth2, not just API key
    // YouTube captions download endpoint requires authenticated user session
    console.log("Found captions but download requires OAuth2 authentication, not available with API key only");
    return null;
    
    const captionText = await captionsResponse.text();
    
    // Parse the caption format and extract text
    const transcript = parseCaptionFormat(captionText);
    
    if (transcript && transcript.length > 100) {
      console.log(`Successfully extracted official YouTube transcript: ${transcript.length} characters`);
      return transcript;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting official YouTube transcript:", error);
    return null;
  }
}

function parseCaptionFormat(captionText: string): string {
  try {
    // Handle SRT format
    if (captionText.includes('-->')) {
      const lines = captionText.split('\n');
      const textLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip sequence numbers and timestamp lines
        if (line && !line.includes('-->') && !/^\d+$/.test(line)) {
          textLines.push(line);
        }
      }
      
      return textLines
        .join(' ')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\[.*?\]/g, '') // Remove bracketed content
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Handle plain text or other formats
    return captionText
      .replace(/<[^>]*>/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
      
  } catch (error) {
    console.error("Error parsing caption format:", error);
    return captionText;
  }
}

async function transcribeWithWhisper(videoId: string): Promise<string | null> {
  try {
    const ytdl = await import('ytdl-core');
    const OpenAI = await import('openai');
    
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not available for Whisper transcription");
      return null;
    }

    const openai = new OpenAI.default({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Check if video is available
    const videoInfo = await ytdl.default.getInfo(videoId);
    if (!videoInfo) {
      console.error("Could not get video info for Whisper transcription");
      return null;
    }

    // Note: Full Whisper integration would require:
    // 1. Downloading video audio using ytdl-core
    // 2. Converting to audio format (MP3/WAV)
    // 3. Uploading to OpenAI Whisper API
    // 4. Getting transcription result
    
    // For now, we'll indicate this needs implementation
    console.log("Whisper transcription would require audio download and processing");
    return null;
    
  } catch (error) {
    console.error("Error with Whisper transcription:", error);
    return null;
  }
}

export function parseDuration(duration: string): number {
  // Parse YouTube duration format (PT4M13S) to seconds
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);
  
  if (!matches) return 0;

  const hours = parseInt(matches[1] || '0');
  const minutes = parseInt(matches[2] || '0');
  const seconds = parseInt(matches[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}
