#!/usr/bin/env python3
"""
YouTube Audio Extraction and Transcription using yt-dlp and Whisper
Based on whisper-youtube project: https://github.com/ArthurFDLR/whisper-youtube
"""

import sys
import json
import tempfile
import os
from pathlib import Path
import yt_dlp
import whisper
import warnings

# Suppress warnings for cleaner output
warnings.filterwarnings("ignore")

def extract_and_transcribe(video_url, model_size="base"):
    """
    Extract audio from YouTube video and transcribe using Whisper
    Args:
        video_url: YouTube URL or video ID
        model_size: Whisper model size (tiny, base, small, medium, large)
    Returns:
        Dict with success status, transcript, and metadata
    """
    try:
        # Create temporary directory for audio files
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Configure yt-dlp for audio extraction
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': str(temp_path / '%(id)s.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'wav',
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
                audio_files = list(temp_path.glob(f"{video_id}.wav"))
                if not audio_files:
                    audio_files = list(temp_path.glob("*.wav"))
                
                if not audio_files:
                    return {
                        "success": False,
                        "error": "Failed to extract audio from video",
                        "method": "whisper_youtube_failed"
                    }
                
                audio_file = audio_files[0]
                
                # Load Whisper model
                model = whisper.load_model(model_size)
                
                # Transcribe audio
                result = model.transcribe(str(audio_file))
                
                # Format the transcript with timestamps
                segments = []
                for segment in result.get('segments', []):
                    segments.append({
                        'start': segment.get('start', 0),
                        'end': segment.get('end', 0),
                        'text': segment.get('text', '').strip()
                    })
                
                return {
                    "success": True,
                    "transcript": result['text'].strip(),
                    "segments": segments,
                    "language": result.get('language', 'unknown'),
                    "method": "whisper_youtube",
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
                "method": "whisper_youtube_blocked"
            }
        elif "Private video" in error_msg:
            return {
                "success": False,
                "error": "PRIVATE_VIDEO: This video is private and cannot be accessed.",
                "method": "whisper_youtube_blocked"
            }
        elif "Video unavailable" in error_msg:
            return {
                "success": False,
                "error": "VIDEO_UNAVAILABLE: This video is not available for download.",
                "method": "whisper_youtube_blocked"
            }
        else:
            return {
                "success": False,
                "error": f"Transcription failed: {error_msg}",
                "method": "whisper_youtube_error"
            }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python whisper_youtube_extractor.py <video_url> [model_size]"
        }))
        sys.exit(1)
    
    video_url = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    
    # Validate model size
    valid_models = ["tiny", "base", "small", "medium", "large"]
    if model_size not in valid_models:
        model_size = "base"
    
    result = extract_and_transcribe(video_url, model_size)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()