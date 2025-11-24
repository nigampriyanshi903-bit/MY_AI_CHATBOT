import os
import json
import asyncio
import base64
from httpx import AsyncClient
from typing import List, Dict, Any

API_KEY = os.environ.get("GEMINI_API_KEY", "")

# --- Helper Functions ---

# Retry helper for network robustness
async def fetch_with_retry(client: AsyncClient, url: str, payload: Dict[str, Any], retries: int = 5):
    """API कॉल को नेटवर्क त्रुटियों के साथ पुनः प्रयास करता है।"""
    for attempt in range(retries):
        try:
           
            res = await client.post(url, json=payload, timeout=90.0)
            
            
            res.raise_for_status() 
            
            return res.json()
        except Exception as e:
            if attempt == retries - 1:
                print(f"🔥 Final API attempt failed: {e}")
                raise
            # Exponential backoff
            await asyncio.sleep(2 ** attempt)

# --- Main Function ---

async def get_vision_response(
    text_prompt: str,
    base64_image: str,
    mime_type: str,
    chat_history: List[Dict[str, str]],
) -> str:
    """Gemini Multimodal API को इमेज और टेक्स्ट प्रॉम्प्ट भेजता है।"""

    if not API_KEY:
        return "❌ Gemini API Key missing. Please set the GEMINI_API_KEY environment variable."

   
    model = "gemini-2.5-flash"
    
    api_url = f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={API_KEY}"

    # Prepare chat history 
    contents = []
    for msg in chat_history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg["text"]}]
        })

    # Add current user input + image
    contents.append({
        "role": "user",
        "parts": [
            {"text": text_prompt},
            {
                
                "inlineData": { 
                    "mime_type": mime_type,
                    "data": base64_image
                }
            }
        ]
    })

    # System instruction for AI 
    payload = {
        "contents": contents,
        "config": {
            "system_instruction": "You are a friendly AI assistant. Describe the uploaded image and answer the user's question clearly and helpfully."
        }
    }

    async with AsyncClient() as client:
        try:
            
            result = await fetch_with_retry(client, api_url, payload)
            
            
            parts = (
                result.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [])
            )
            if parts:
                return parts[0].get("text", "⚠ Image processed but no response text.")
                
            
            return f"⚠ API returned unexpected or blocked result: {json.dumps(result, indent=2)}"

        except Exception as e:
            print("🔥 Gemini Multimodal ERROR:", e)
            return f"❌ Gemini Multimodal ERROR: {e}"

# --- Example Usage (How to call the function) ---

if __name__ == "__main__":
    
  
    
    async def main():
       
        image_path = "pan.jpg" 
        
        try:
            
            with open(image_path, "rb") as f:
                img_data_bytes = f.read()
            
            base64_img = base64.b64encode(img_data_bytes).decode("utf-8")
            
           
            if image_path.lower().endswith(('.png')):
                mime_type_final = "image/png"
            elif image_path.lower().endswith(('.jpg', '.jpeg')): 
                mime_type_final = "image/jpeg"
            else:
                print(f"\n❌ ERROR: Unsupported file type: {image_path}. Only PNG, JPG, and JPEG are supported for this example.")
                return

            print(f"--- Running API Call with Mime Type: {mime_type_final} ---")
            
            response = await get_vision_response(
                text_prompt="Describe this image in a single, friendly sentence.",
                base64_image=base64_img,
                mime_type=mime_type_final,
                chat_history=[]
            )
            print("\n--- GEMINI RESPONSE ---")
            print(response)

        except FileNotFoundError:
            print(f"\n❌ ERROR: Image file '{image_path}' not found.")
            print("Please ensure you have an 'example.jpg' in the same directory.")
        except Exception as e:
            print(f"\n❌ An unexpected error occurred: {e}")

    asyncio.run(main())
