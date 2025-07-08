#!/usr/bin/env python3
"""
YouTube Audio Extraction using yt-dlp
Simplified version that extracts audio for use with OpenAI Whisper API
"""

import sys
import json
import tempfile
import os
from pathlib import Path
import yt_dlp
import warnings

# Suppress warnings for cleaner output
warnings.filterwarnings("ignore")

def extract_audio(video_url):
    """
    Extract audio from YouTube video using yt-dlp
    Args:
        video_url: YouTube URL or video ID
    Returns:
        Dict with success status, audio path, and metadata
    """
    try:
        # Create temporary directory for audio files
        temp_dir = tempfile.mkdtemp()
        temp_path = Path(temp_dir)
        
        # Configure yt-dlp for audio extraction
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': str(temp_path / '%(id)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
        }
        
        # Download and extract audio
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Get video info first
            info = ydl.extract_info(video_url, download=False)
            video_id = info.get('id', 'unknown')
            video_title = info.get('title', 'Unknown Title')
            duration = info.get('duration', 0)
            
            # Download audio
            ydl.download([video_url])
            
            # Find the extracted audio file
            audio_files = list(temp_path.glob(f"{video_id}.mp3"))
            if not audio_files:
                audio_files = list(temp_path.glob("*.mp3"))
            
            if not audio_files:
                return {
                    "success": False,
                    "error": "Failed to extract audio from video",
                    "method": "yt_dlp_audio_failed"
                }
            
            audio_file = audio_files[0]
            
            return {
                "success": True,
                "audio_path": str(audio_file),
                "temp_dir": temp_dir,
                "method": "yt_dlp_audio",
                "video_info": {
                    "id": video_id,
                    "title": video_title,
                    "duration": duration
                }
            }
                
    except Exception as e:
        error_msg = str(e)
        
        # Check for common error patterns
        if "Sign in to confirm your age" in error_msg:
            return {
                "success": False,
                "error": "AGE_RESTRICTED: This video requires age verification and cannot be processed automatically.",
                "method": "yt_dlp_audio_blocked"
            }
        elif "Private video" in error_msg:
            return {
                "success": False,
                "error": "PRIVATE_VIDEO: This video is private and cannot be accessed.",
                "method": "yt_dlp_audio_blocked"
            }
        elif "Video unavailable" in error_msg:
            return {
                "success": False,
                "error": "VIDEO_UNAVAILABLE: This video is not available for download.",
                "method": "yt_dlp_audio_blocked"
            }
        else:
            return {
                "success": False,
                "error": f"Audio extraction failed: {error_msg}",
                "method": "yt_dlp_audio_error"
            }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python youtube_audio_extractor.py <video_url>"
        }))
        sys.exit(1)
    
    video_url = sys.argv[1]
    
    result = extract_audio(video_url)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()