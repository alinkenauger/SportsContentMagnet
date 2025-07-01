#!/usr/bin/env python3
"""
Audio transcription service using OpenAI Whisper and SpeechRecognition
Handles various audio formats and provides robust transcription capabilities
"""

import sys
import json
import tempfile
import os
from pathlib import Path
import subprocess
import traceback

try:
    import whisper
    import speech_recognition as sr
    from pydub import AudioSegment
    import ffmpeg
except ImportError as e:
    print(json.dumps({"error": f"Missing dependency: {e}"}))
    sys.exit(1)

class AudioTranscriber:
    def __init__(self):
        self.whisper_model = None
        self.recognizer = sr.Recognizer()
    
    def load_whisper_model(self, model_size="base"):
        """Load Whisper model on demand"""
        try:
            if self.whisper_model is None:
                self.whisper_model = whisper.load_model(model_size)
            return True
        except Exception as e:
            return False, str(e)
    
    def convert_to_wav(self, input_path, output_path):
        """Convert audio file to WAV format using pydub"""
        try:
            audio = AudioSegment.from_file(input_path)
            # Convert to mono 16kHz WAV for better compatibility
            audio = audio.set_channels(1).set_frame_rate(16000)
            audio.export(output_path, format="wav")
            return True
        except Exception as e:
            return False, str(e)
    
    def transcribe_with_whisper(self, audio_path):
        """Transcribe audio using OpenAI Whisper"""
        try:
            load_result = self.load_whisper_model()
            if load_result != True:
                return {"error": f"Failed to load Whisper model: {load_result[1]}"}
            
            result = self.whisper_model.transcribe(audio_path)
            
            return {
                "success": True,
                "text": result["text"].strip(),
                "language": result.get("language", "unknown"),
                "segments": [
                    {
                        "start": seg["start"],
                        "end": seg["end"],
                        "text": seg["text"].strip()
                    }
                    for seg in result.get("segments", [])
                ]
            }
        except Exception as e:
            return {"error": f"Whisper transcription failed: {str(e)}"}
    
    def transcribe_with_google(self, audio_path):
        """Transcribe audio using Google Speech Recognition (free tier)"""
        try:
            # Convert to WAV if needed
            temp_wav = None
            if not audio_path.lower().endswith('.wav'):
                temp_wav = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
                success, error = self.convert_to_wav(audio_path, temp_wav.name)
                if not success:
                    return {"error": f"Audio conversion failed: {error}"}
                audio_path = temp_wav.name
            
            # Load audio file
            with sr.AudioFile(audio_path) as source:
                audio = self.recognizer.record(source)
            
            # Transcribe
            text = self.recognizer.recognize_google(audio)
            
            # Cleanup temp file
            if temp_wav:
                os.unlink(temp_wav.name)
            
            return {
                "success": True,
                "text": text,
                "language": "auto-detected",
                "method": "google"
            }
        except sr.UnknownValueError:
            return {"error": "Could not understand audio"}
        except sr.RequestError as e:
            return {"error": f"Google API error: {str(e)}"}
        except Exception as e:
            return {"error": f"Google transcription failed: {str(e)}"}
    
    def transcribe_file(self, file_path, method="whisper"):
        """Main transcription method"""
        if not os.path.exists(file_path):
            return {"error": "Audio file not found"}
        
        try:
            if method == "whisper":
                return self.transcribe_with_whisper(file_path)
            elif method == "google":
                return self.transcribe_with_google(file_path)
            else:
                # Try Whisper first, fall back to Google
                result = self.transcribe_with_whisper(file_path)
                if "error" in result:
                    return self.transcribe_with_google(file_path)
                return result
        
        except Exception as e:
            return {"error": f"Transcription failed: {str(e)}"}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python transcription.py <audio_file_path> [method]"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    method = sys.argv[2] if len(sys.argv) > 2 else "auto"
    
    try:
        transcriber = AudioTranscriber()
        result = transcriber.transcribe_file(audio_path, method)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({
            "error": f"Transcription service error: {str(e)}",
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()