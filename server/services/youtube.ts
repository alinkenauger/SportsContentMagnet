import { YoutubeTranscript } from 'youtube-transcript';
import { parseYouTubeSource } from '@shared/presentation';
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

export interface YouTubeTranscriptRow {
  text: unknown;
  offset: unknown;
  duration: unknown;
}

export interface YouTubeTranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface YouTubeTimedTranscript {
  text: string;
  segments: YouTubeTranscriptSegment[];
  method: string;
}

export type YouTubeTranscriptTimeUnit = 'milliseconds' | 'seconds' | 'auto';

export function extractVideoId(url: string): string | null {
  return parseYouTubeSource(url)?.videoId ?? null;
}

function cleanPlainText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function canonicalThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Projects the tiny trusted portion of YouTube's oEmbed response into the
 * application's metadata contract. URL and HTML fields from oEmbed are never
 * accepted; all URLs are constructed from the already validated video ID.
 */
export function buildYouTubeVideoDataFromOEmbed(
  videoIdInput: string,
  payload: unknown,
): YouTubeVideoData {
  const source = parseYouTubeSource(videoIdInput);
  if (!source) throw new Error('Invalid YouTube video ID');

  const record = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {};

  return {
    videoId: source.videoId,
    title: cleanPlainText(record.title, 500) || 'YouTube video',
    description: '',
    thumbnailUrl: canonicalThumbnailUrl(source.videoId),
    duration: 'PT0S',
    channelTitle: cleanPlainText(record.author_name, 300) || 'YouTube',
    publishedAt: '',
    viewCount: 0,
    likeCount: 0,
  };
}

async function fetchYouTubeOEmbedData(videoId: string): Promise<YouTubeVideoData> {
  const endpoint = new URL('https://www.youtube.com/oembed');
  endpoint.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
  endpoint.searchParams.set('format', 'json');

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`YouTube oEmbed error: ${response.status}`);
  }

  return buildYouTubeVideoDataFromOEmbed(videoId, await response.json());
}

async function fetchOfficialYouTubeVideoData(
  videoId: string,
  apiKey: string,
): Promise<YouTubeVideoData> {
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
  endpoint.searchParams.set('part', 'snippet,statistics,contentDetails');
  endpoint.searchParams.set('id', videoId);
  endpoint.searchParams.set('key', apiKey);
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json() as any;
  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found');
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
}

export async function getYouTubeVideoData(url: string): Promise<YouTubeVideoData> {
  const source = parseYouTubeSource(url);
  if (!source) throw new Error('Invalid YouTube URL');

  const apiKey = (
    process.env.YOUTUBE_API_KEY
    || process.env.YOUTUBE_API_KEY_ENV_VAR
    || ''
  ).trim();

  if (apiKey) {
    try {
      return await fetchOfficialYouTubeVideoData(source.videoId, apiKey);
    } catch (error) {
      console.warn('YouTube Data API metadata lookup failed; using oEmbed fallback:', error);
    }
  }

  try {
    return await fetchYouTubeOEmbedData(source.videoId);
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    throw new Error(`Failed to fetch video data: ${(error as Error).message}`);
  }
}

function decodeTranscriptEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&(?:#39|apos);/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    })
    .replace(/&#(\d+);/g, (match, decimal: string) => {
      const codePoint = Number.parseInt(decimal, 10);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    });
}

function cleanTranscriptText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return decodeTranscriptEntities(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferTranscriptTimeUnit(rows: readonly YouTubeTranscriptRow[]): Exclude<YouTubeTranscriptTimeUnit, 'auto'> {
  const values = rows.flatMap((row) => [Number(row.offset), Number(row.duration)]);
  if (values.some((value) => Number.isFinite(value) && !Number.isInteger(value))) {
    return 'seconds';
  }

  const durations = rows
    .map((row) => Number(row.duration))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((left, right) => left - right);
  const medianDuration = durations.length > 0
    ? durations[Math.floor(durations.length / 2)]
    : 0;

  // srv3 emits integer milliseconds and normal caption rows are usually well
  // above 100 ms. Ambiguous small integers are treated as classic seconds.
  return medianDuration >= 100 ? 'milliseconds' : 'seconds';
}

function roundTranscriptTime(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Normalizes youtube-transcript's srv3 millisecond and classic second rows. */
export function normalizeYouTubeTranscriptRows(
  rowsInput: readonly YouTubeTranscriptRow[],
  timeUnit: YouTubeTranscriptTimeUnit = 'auto',
): Pick<YouTubeTimedTranscript, 'text' | 'segments'> {
  const rows = Array.isArray(rowsInput) ? rowsInput : [];
  const resolvedUnit = timeUnit === 'auto' ? inferTranscriptTimeUnit(rows) : timeUnit;
  const divisor = resolvedUnit === 'milliseconds' ? 1000 : 1;
  const segments: YouTubeTranscriptSegment[] = [];

  for (const row of rows) {
    const text = cleanTranscriptText(row?.text);
    const rawStart = Number(row?.offset);
    const rawDuration = Number(row?.duration);
    if (
      !text
      || !Number.isFinite(rawStart)
      || !Number.isFinite(rawDuration)
      || rawStart < 0
      || rawDuration < 0
    ) {
      continue;
    }

    const start = roundTranscriptTime(rawStart / divisor);
    const end = roundTranscriptTime((rawStart + rawDuration) / divisor);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
      continue;
    }
    segments.push({ start, end, text });
  }

  return {
    text: segments.map((segment) => segment.text).join(' ').replace(/\s+/g, ' ').trim(),
    segments,
  };
}

export function detectYouTubeTranscriptTimeUnit(
  transcriptXml: string,
): Exclude<YouTubeTranscriptTimeUnit, 'auto'> | null {
  if (/<p\s+[^>]*\bt="\d+"[^>]*\bd="\d+"[^>]*>/i.test(transcriptXml)) {
    return 'milliseconds';
  }
  if (/<text\s+[^>]*\bstart="[\d.]+"[^>]*\bdur="[\d.]+"[^>]*>/i.test(transcriptXml)) {
    return 'seconds';
  }
  return null;
}

export async function transcribeVideo(videoId: string): Promise<string | YouTubeTimedTranscript> {
  try {
    const source = parseYouTubeSource(videoId);
    if (!source) throw new Error('Invalid YouTube video ID');
    const validatedVideoId = source.videoId;
    console.log(`Attempting to transcribe video: ${validatedVideoId}`);
    
    // Primary method: Try youtube-transcript library FIRST (fastest, if available)
    console.log("Trying youtube-transcript library (fastest method)...");
    const transcript = await getYouTubeTranscript(validatedVideoId);
    if (transcript && transcript.text.length > 100) {
      console.log(`Successfully extracted transcript via youtube-transcript: ${transcript.text.length} characters`);
      return transcript;
    }
    
    // Fallback 2: Try yt-dlp for subtitle extraction (medium speed)
    console.log("youtube-transcript failed, trying yt-dlp subtitle extraction...");
    let ytdlpResult: any = { success: false, error: 'Not attempted' };
    try {
      const { ytdlpTranscription } = await import('./ytdlpTranscription');
      ytdlpResult = await ytdlpTranscription.extractTranscript(validatedVideoId);
      
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
      
      const videoUrl = `https://www.youtube.com/watch?v=${validatedVideoId}`;
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
    const whisperYoutubeResult = await whisperYoutubeService.extractAndTranscribe(validatedVideoId, 'tiny');
    
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

async function getYouTubeTranscript(videoId: string): Promise<YouTubeTimedTranscript | null> {
  try {
    // First try the official YouTube Data API v3 captions endpoint (like Glasp)
    console.log("Attempting official YouTube API captions...");
    const transcript = await getOfficialYouTubeTranscript(videoId);
    if (transcript) {
      return {
        text: cleanTranscriptText(transcript),
        segments: [],
        method: 'youtube_data_api',
      };
    }
    console.log("Official API failed, trying youtube-transcript library...");

    // Fallback to youtube-transcript library as secondary option
    let detectedTimeUnit: Exclude<YouTubeTranscriptTimeUnit, 'auto'> | null = null;
    const transcriptFetch: typeof globalThis.fetch = async (input, init) => {
      const response = await globalThis.fetch(input, init);
      const requestUrl = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      const contentType = response.headers.get('content-type') || '';
      const couldContainTimedText = requestUrl.includes('/api/timedtext')
        || contentType.includes('xml');

      if (response.ok && couldContainTimedText) {
        try {
          detectedTimeUnit = detectYouTubeTranscriptTimeUnit(await response.clone().text());
        } catch {
          // The library can still parse the original response; auto inference is
          // used below if inspection of the cloned response is unavailable.
        }
      }
      return response;
    };
    const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en',
      fetch: transcriptFetch,
    });
    
    if (!transcriptArray || transcriptArray.length === 0) {
      console.log("No transcript found via youtube-transcript");
      return null;
    }

    const normalized = normalizeYouTubeTranscriptRows(
      transcriptArray,
      detectedTimeUnit ?? 'auto',
    );
    if (!normalized.text || normalized.segments.length === 0) return null;
    return {
      ...normalized,
      method: 'youtube_transcript',
    };
    
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
