from gtts import gTTS
import uuid
import os
import logging
from typing import Tuple 

# Logging setup: Debugging ke liye hamesha rakhein
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# TTS Audio files ko save karne ki directory
AUDIO_FOLDER = "tts_audio"
os.makedirs(AUDIO_FOLDER, exist_ok=True)

# Front-end language names ko gTTS compatible codes se map karna
LANG_MAPPING = {
    "english": "en",
    "hindi": "hi",
    "french": "fr",
    "spanish": "es",
    # Aap yahan aur languages add kar sakte hain:
}

# TLD (Top Level Domain) setting, taaki Indian users ko thoda Indian accent mil sake
TLD_MAPPING = {
    "hi": "co.in", 
    "en": "com",  
}

def text_to_speech(
    text: str,
    gender: str = "",         
    speed: str = "Normal", 
    pitch: str = "Normal",  
    lang: str = "English"   
) -> Tuple[str, str]:
    """
    Text ko speech mein convert karta hai aur audio file save karta hai.
    gTTS ki limitations (gender aur pitch controls ka na hona) ko dhyaan mein rakhte hue.
    """
    
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(AUDIO_FOLDER, filename)

    # 1. Input values ko string mein convert karna aur cleanup.
    #    Isse 'float' object has no attribute 'strip' ka error nahi aayega.
    safe_lang = str(lang).strip().lower()
    safe_speed = str(speed).strip().lower()
    safe_gender = str(gender).strip().lower()
    safe_pitch = str(pitch).strip().lower()

    tts_lang_code = LANG_MAPPING.get(safe_lang, 'en')
    tts_tld = TLD_MAPPING.get(tts_lang_code, 'com')

    # gTTS ki limitations ko console mein log karna
    logging.info(f"TTS Config (gTTS Limitation): Gender='{safe_gender}' and Pitch='{safe_pitch}' are ignored by gTTS.")
    logging.info(f"TTS Request Processed: Lang='{lang}' -> Code='{tts_lang_code}', TLD='{tts_tld}'")
    
    # 2. Speed Mapping (gTTS sirf 'slow' ya 'normal' speed support karta hai)
    is_slow = safe_speed == "slow"
    
    # 3. TTS object banana
    try:
        tts = gTTS(
            text=text, 
            lang=tts_lang_code, 
            slow=is_slow, 
            tld=tts_tld
        )
    except Exception as e:
        logging.error(f"gTTS initialization failed for lang={tts_lang_code}: {e}")
        
        logging.warning("Falling back to English ('en', 'com').")
        tts = gTTS(text=text, lang='en', slow=is_slow, tld='com')

    # 4. File save karna
    tts.save(filepath)
    logging.info(f"TTS audio saved successfully at: {filepath}")

    return filepath, filename
