/**
 * Client-side YouTube Caption Extraction
 * Works by leveraging the user's browser session, similar to how Glasp operates
 */

export interface CaptionTrack {
  text: string;
  start: number;
  duration: number;
}

export interface YoutubeCaptionResult {
  success: boolean;
  transcript?: string;
  segments?: CaptionTrack[];
  language?: string;
  method?: string;
  error?: string;
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Extract captions using browser-based YouTube API requests
 * This leverages the user's authenticated session similar to Glasp
 */
export async function extractYoutubeCaptions(videoUrl: string): Promise<YoutubeCaptionResult> {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return {
        success: false,
        error: "Invalid YouTube URL format",
        method: "client_extraction"
      };
    }

    // Method 1: Try to extract from YouTube's API using browser session
    try {
      const result = await fetchCaptionsFromBrowser(videoId);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.log("Browser API extraction failed:", error);
    }

    // Method 2: Try iframe embedding approach
    try {
      const result = await extractFromEmbedded(videoId);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.log("Embedded extraction failed:", error);
    }

    // Method 3: Instruct user on manual extraction
    return {
      success: false,
      error: "CAPTIONS_NEED_MANUAL_EXTRACTION",
      method: "client_extraction_failed"
    };

  } catch (error) {
    return {
      success: false,
      error: `Caption extraction failed: ${error}`,
      method: "client_extraction_error"
    };
  }
}

/**
 * Attempt to fetch captions using browser's YouTube session
 */
async function fetchCaptionsFromBrowser(videoId: string): Promise<YoutubeCaptionResult> {
  try {
    // Create a hidden iframe to load the video
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `https://www.youtube.com/watch?v=${videoId}`;
    document.body.appendChild(iframe);

    // Wait for load
    await new Promise((resolve) => {
      iframe.onload = resolve;
      setTimeout(resolve, 5000); // Timeout after 5 seconds
    });

    // Try to access caption data from the iframe
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        // Look for caption tracks in the page
        const captionElements = iframeDoc.querySelectorAll('[data-caption-track]');
        if (captionElements.length > 0) {
          // Process caption data
          const segments: CaptionTrack[] = [];
          captionElements.forEach((element) => {
            const text = element.textContent?.trim();
            const start = parseFloat(element.getAttribute('data-start') || '0');
            const duration = parseFloat(element.getAttribute('data-duration') || '0');
            
            if (text) {
              segments.push({ text, start, duration });
            }
          });

          if (segments.length > 0) {
            document.body.removeChild(iframe);
            return {
              success: true,
              transcript: segments.map(s => s.text).join(' '),
              segments,
              language: 'en',
              method: 'browser_iframe'
            };
          }
        }
      }
    } catch (error) {
      console.log("Cross-origin access blocked:", error);
    }

    document.body.removeChild(iframe);
    return {
      success: false,
      error: "Could not access caption data through iframe",
      method: 'browser_iframe_failed'
    };

  } catch (error) {
    return {
      success: false,
      error: `Browser extraction failed: ${error}`,
      method: 'browser_extraction_error'
    };
  }
}

/**
 * Try extraction through embedded player
 */
async function extractFromEmbedded(videoId: string): Promise<YoutubeCaptionResult> {
  try {
    // Create YouTube embed URL with captions enabled
    const embedUrl = `https://www.youtube.com/embed/${videoId}?cc_load_policy=1&hl=en`;
    
    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = embedUrl;
    iframe.allow = 'autoplay; encrypted-media';
    document.body.appendChild(iframe);

    // Wait for load
    await new Promise((resolve) => {
      iframe.onload = resolve;
      setTimeout(resolve, 3000);
    });

    // Check if we can access any caption data
    // This is limited by CORS, but we try anyway
    try {
      const iframeWindow = iframe.contentWindow;
      if (iframeWindow) {
        // Send message to iframe to request caption data
        iframeWindow.postMessage({ action: 'getCaptions' }, 'https://www.youtube.com');
        
        // Listen for response
        const captionData = await new Promise<any>((resolve) => {
          const handleMessage = (event: MessageEvent) => {
            if (event.origin === 'https://www.youtube.com' && event.data.captions) {
              window.removeEventListener('message', handleMessage);
              resolve(event.data.captions);
            }
          };
          window.addEventListener('message', handleMessage);
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            resolve(null);
          }, 2000);
        });

        document.body.removeChild(iframe);

        if (captionData) {
          return {
            success: true,
            transcript: captionData.text,
            segments: captionData.segments,
            language: captionData.language || 'en',
            method: 'embedded_extraction'
          };
        }
      }
    } catch (error) {
      console.log("Embedded access failed:", error);
    }

    document.body.removeChild(iframe);
    return {
      success: false,
      error: "Embedded extraction failed due to security restrictions",
      method: 'embedded_failed'
    };

  } catch (error) {
    return {
      success: false,
      error: `Embedded extraction error: ${error}`,
      method: 'embedded_error'
    };
  }
}

/**
 * Generate instructions for manual caption extraction
 */
export function getManualExtractionInstructions(videoUrl: string): string {
  const videoId = extractVideoId(videoUrl);
  return `
To extract captions from this YouTube video manually:

1. Open the video: ${videoUrl}
2. Click the "CC" (Closed Captions) button on the video player
3. If captions are available, click the gear icon → Subtitles/CC → Auto-translate (if needed)
4. Use a browser extension like "YouTube Transcript" or "Glasp" to extract the full transcript
5. Copy the transcript and paste it into the Manual Transcript option

Alternative: Download the video's audio and use our Audio Upload feature for AI transcription.
  `.trim();
}

/**
 * Check if video has captions by examining the YouTube page
 */
export async function checkCaptionAvailability(videoUrl: string): Promise<{
  hasAutoCaptions: boolean;
  hasManualCaptions: boolean;
  languages: string[];
}> {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return { hasAutoCaptions: false, hasManualCaptions: false, languages: [] };
    }

    // This would require actual YouTube API access with proper authentication
    // For now, we return a generic response
    return {
      hasAutoCaptions: false,
      hasManualCaptions: false,
      languages: []
    };
  } catch (error) {
    return { hasAutoCaptions: false, hasManualCaptions: false, languages: [] };
  }
}