#!/usr/bin/env python3
"""
YouTube transcript extractor using yt-dlp
This approach is more reliable than browser-based scraping
"""

import sys
import json
import subprocess
import tempfile
import os
from pathlib import Path

def extract_youtube_transcript(video_id_or_url):
    """
    Extract transcript from YouTube video using yt-dlp
    """
    try:
        # Ensure we have a proper URL
        if not video_id_or_url.startswith('http'):
            video_url = f"https://www.youtube.com/watch?v={video_id_or_url}"
        else:
            video_url = video_id_or_url
        
        # Try to get auto-generated subtitles first (most common)
        cmd_auto = [
            'yt-dlp',
            '--write-auto-subs',
            '--sub-langs', 'en',
            '--sub-format', 'vtt',
            '--skip-download',
            '--no-warnings',
            '--quiet',
            '--socket-timeout', '10',
            '--retries', '1',
            video_url
        ]
        
        # Create temp directory for subtitle files
        with tempfile.TemporaryDirectory() as temp_dir:
            # Run yt-dlp in temp directory
            result = subprocess.run(cmd_auto, cwd=temp_dir, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                # Look for .vtt files
                vtt_files = list(Path(temp_dir).glob('*.vtt'))
                if vtt_files:
                    with open(vtt_files[0], 'r', encoding='utf-8') as f:
                        vtt_content = f.read()
                    
                    # Parse VTT content to extract text
                    transcript = parse_vtt_content(vtt_content)
                    if transcript and len(transcript) > 50:
                        return {
                            "success": True,
                            "transcript": transcript,
                            "method": "yt-dlp_auto_subs"
                        }
            
            # If auto-subs failed, try manual subtitles
            cmd_manual = [
                'yt-dlp',
                '--write-subs',
                '--sub-langs', 'en',
                '--sub-format', 'vtt',
                '--skip-download',
                '--no-warnings',
                '--quiet',
                '--socket-timeout', '10',
                '--retries', '1',
                video_url
            ]
            
            result = subprocess.run(cmd_manual, cwd=temp_dir, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                vtt_files = list(Path(temp_dir).glob('*.vtt'))
                if vtt_files:
                    with open(vtt_files[0], 'r', encoding='utf-8') as f:
                        vtt_content = f.read()
                    
                    transcript = parse_vtt_content(vtt_content)
                    if transcript and len(transcript) > 50:
                        return {
                            "success": True,
                            "transcript": transcript,
                            "method": "yt-dlp_manual_subs"
                        }
        
        # If both methods failed, try getting video info to see what's available
        info_cmd = [
            'yt-dlp',
            '--list-subs',
            '--no-warnings',
            video_url
        ]
        
        info_result = subprocess.run(info_cmd, capture_output=True, text=True, timeout=15)
        available_subs = info_result.stdout if info_result.returncode == 0 else "No info available"
        
        return {
            "success": False,
            "error": f"No subtitles found for this video. Available: {available_subs[:200]}",
            "method": "yt-dlp_failed"
        }
        
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "yt-dlp timeout - video may be too long or restricted",
            "method": "timeout"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"yt-dlp extraction failed: {str(e)}",
            "method": "exception"
        }

def parse_vtt_content(vtt_content):
    """
    Parse VTT subtitle file and extract clean text
    """
    try:
        lines = vtt_content.split('\n')
        transcript_lines = []
        
        for line in lines:
            line = line.strip()
            
            # Skip VTT headers and timestamps
            if (line.startswith('WEBVTT') or 
                line.startswith('NOTE') or
                '-->' in line or
                line.isdigit() or
                not line):
                continue
            
            # Clean up HTML tags and formatting
            import re
            clean_line = re.sub(r'<[^>]+>', '', line)
            clean_line = re.sub(r'&[a-zA-Z]+;', '', clean_line)
            clean_line = clean_line.strip()
            
            if clean_line and len(clean_line) > 3:
                transcript_lines.append(clean_line)
        
        # Join lines and clean up
        full_transcript = ' '.join(transcript_lines)
        
        # Remove duplicate sentences (common in auto-generated subs)
        sentences = full_transcript.split('. ')
        unique_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and sentence not in unique_sentences:
                unique_sentences.append(sentence)
        
        return '. '.join(unique_sentences)
        
    except Exception as e:
        return f"Error parsing VTT: {str(e)}"

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python youtube_extractor.py <video_id_or_url>"}))
        sys.exit(1)
    
    video_input = sys.argv[1]
    result = extract_youtube_transcript(video_input)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()