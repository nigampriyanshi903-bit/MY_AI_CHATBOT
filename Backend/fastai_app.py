from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
import logging
import json
from typing import List, Dict, Optional

load_dotenv()

# LangChain + Groq
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# Voice + TTS
from voice_input import audio_to_text
from tts import text_to_speech

# Vision
from pydantic import BaseModel
try:
    from vision_query import get_vision_response
except:
    async def get_vision_response(*args, **kwargs):
        return "ERROR: Vision module not found."


load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/tts_audio", StaticFiles(directory="tts_audio"), name="tts_audio")
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# FIX: env variable
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
llm = ChatGroq(api_key=GROQ_API_KEY, model_name="llama-3.3-70b-versatile")


# ---------- Vision Body Model ----------
class ChatMessage(BaseModel):
    role: str
    text: str

class VisionRequest(BaseModel):
    text_prompt: str
    base64_image: str
    mime_type: str
    chat_history: List[ChatMessage]
    system_instruction: Optional[str] = None


# ---------- TEXT CHAT ----------
@app.post("/chat")
async def chat(
    message: str = Form(""),
    file: UploadFile = File(None),
    history: str = Form("")
):
    messages = []

    # System prompt
    messages.append(SystemMessage(
        content="You are a friendly AI assistant. Answer in Markdown with heading, bullets & emojis."
    ))

    # History convert
    if history:
        try:
            h = json.loads(history)
            for msg in h:
                txt = msg["parts"][0]["text"]
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=txt))
                else:
                    messages.append(AIMessage(content=txt))
        except Exception as e:
            logging.error(f"History parsing error: {e}")

    # Current message
    user_input = message
    if file:
        os.makedirs("uploads", exist_ok=True)
        path = f"uploads/{file.filename}"
        with open(path, "wb") as f:
            f.write(await file.read())
        user_input += f"\n(File received: {file.filename})"

    messages.append(HumanMessage(content=user_input))

    try:
        result = llm.invoke(messages)
        return {"reply": result.content}
    except Exception as e:
        logging.error(e)
        return {"reply": "Server error while processing chat."}


# ---------- VISION (IMAGE + TEXT CHAT) ----------
@app.post("/vision")
async def handle_vision_chat(req: VisionRequest):
    history = [{"role": m.role, "text": m.text} for m in req.chat_history]

    try:
        result = await get_vision_response(
            text_prompt=req.text_prompt,
            base64_image=req.base64_image,
            mime_type=req.mime_type,
            chat_history=history
        )
        return {"reply": result}  # ❗ Frontend JS expects "reply"
    except Exception as e:
        logging.error(e)
        raise HTTPException(500, "Vision request failed")


# ---------- VOICE (STT) ----------
@app.post("/voice")
async def voice(file: UploadFile = File(...)):
    temp = f"temp_audio/{file.filename}"
    os.makedirs("temp_audio", exist_ok=True)

    try:
        with open(temp, "wb") as f:
            f.write(await file.read())
        text = audio_to_text(temp)
        if not text:
            return {"error": "Speech not detected"}
        return {"text": text}

    finally:
        if os.path.exists(temp):
            try: os.remove(temp)
            except: pass


# ---------- TTS ----------
@app.post("/tts")
async def tts_endpoint(
    text: str = Form(...),
    gender: str = Form("female"),
    speed: float = Form(1.0),
    pitch: float = Form(1.0),
    lang: str = Form("en-US")
):
    try:
        filepath, filename = text_to_speech(
            text, gender=gender, speed=speed, pitch=pitch, lang=lang
        )
        return {"audio_url": f"/tts_audio/{filename}", "file_name": filename}
    except Exception as e:
        logging.error(e)
        return {"error": "TTS generation failed"}
