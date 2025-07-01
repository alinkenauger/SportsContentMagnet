import { YoutubeTranscript } from 'youtube-transcript';

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

export async function transcribeVideo(videoId: string): Promise<string> {
  try {
    console.log(`Attempting to transcribe video: ${videoId}`);
    
    // First, try to get captions using youtube-transcript library
    const transcript = await getYouTubeTranscript(videoId);
    if (transcript && transcript.length > 100) { // Ensure we got meaningful content
      console.log(`Successfully extracted transcript: ${transcript.length} characters`);
      return transcript;
    }
    
    // If no captions available or transcript too short, use OpenAI Whisper
    console.log("No captions found, attempting Whisper transcription...");
    const whisperTranscript = await transcribeWithWhisper(videoId);
    if (whisperTranscript) {
      return whisperTranscript;
    }
    
    throw new Error("TRANSCRIPTION_BLOCKED: YouTube's anti-bot measures prevent automatic transcription of this video. This affects most modern videos, even those with captions. Consider:\n\n• Using older educational videos (pre-2020) which may still be accessible\n• Educational channels that allow captions API access\n• Manual transcript upload feature (coming soon)\n• Contacting support for enterprise transcription options");
    
  } catch (error) {
    console.error("Transcription error:", error);
    
    // Check if it's our specific error type
    if ((error as Error).message.startsWith("TRANSCRIPTION_BLOCKED:")) {
      throw error;
    }
    
    throw new Error("Failed to transcribe video: " + (error as Error).message);
  }
}

async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    // Use youtube-transcript library to extract captions
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
    console.error("Error getting YouTube transcript via youtube-transcript:", error);
    return null;
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
