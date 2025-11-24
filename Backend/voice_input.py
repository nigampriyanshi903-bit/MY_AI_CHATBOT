import whisper
import os
import logging

# Configure logging to show errors in the terminal
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Global model variable
model = None 

# Model loading attempt on startup
try:
    logging.info("Loading Whisper model (base, CPU)...")
    # Load on CPU for compatibility
    model = whisper.load_model("base", device="cpu") 
    logging.info("Whisper model loaded successfully.")
except Exception as e:
    logging.error(f"FATAL: Could not load Whisper model. Error: {e}")
    # model remains None

def audio_to_text(audio_file_path: str) -> str:
    """
    Transcribes the audio file using the global Whisper model.
    Returns empty string "" on failure or if no speech is recognized.
    """
    # 1. Check if the model failed to load during startup
    if model is None:
        logging.error("Transcription failed: Model is not loaded. Check startup logs.")
        return "" 
        
    # 2. Attempt transcription
    try:
        logging.info(f"Starting transcription for: {audio_file_path}")
        # fp16=False for CPU compatibility
        result = model.transcribe(audio_file_path, fp16=False)
        transcribed_text = result.get("text", "").strip()
        
        # 3. Check for empty result
        if not transcribed_text:
            logging.info("Audio detected but could not recognize speech.")
            return ""
            
        logging.info(f"Transcription complete: '{transcribed_text[:50]}...'")
        return transcribed_text
        
    # 4. Handle runtime transcription errors
    except Exception as e:
        logging.error(f"Critical error during audio transcription runtime: {e}")
        return ""
