# MY_AI_CHATBOT
IT'S my personal, friendly AI Chatbot project! It's multimodal: chat with text, speak with your voice, and even upload an image for the AI to analyze and answer questions about it. Built using Python, LangChain, and a custom HTML/JS interface.
---
## Key Technical Contributions & Skills Demonstrated

| Area | Description | Technologies Used |
| :--- | :--- | :--- |
| **AI/ML Pipeline Development** | Implemented a structured workflow using **LangChain** to efficiently manage conversation context, memory, and secure interaction with the underlying LLM. | Python, **LangChain**, LLM (e.g., Gemini/GPT-4) |
| **Multimodal Data Processing** | Developed the capability to handle and process **image data**. The frontend captures the image, which is then **Base64 encoded** and securely transmitted to the backend for LLM-based visual analysis. | Python, **Base64 Processing**, Custom API Routing |
| **Data Ingestion & Routing** | Designed the backend architecture to serve as the central hub for different data types (**Text, Voice, Image**) and route them to the correct processing modules, ensuring a robust **client-server communication**. | Python (**Flask/FastAPI**), RESTful API |
| **Voice Interaction Layer** | Integrated functionalities for **Speech-to-Text (STT)** command capture and **Text-to-Speech (TTS)** response generation, providing a dynamic, accessible interface. | Custom Voice APIs (e.g., Google/OpenAI), JavaScript STT/TTS |
| **Frontend Interface** | Developed a simple, clean web interface (UI) focused purely on demonstrating the **functional capabilities** of the AI backend and providing a usable testing environment. | HTML, CSS, JavaScript |

---
### Setup and Running Instructions

* **1. Clone the repository:** `git clone [YOUR REPO URL]`
* **2. Install Dependencies:** `pip install -r Backend/requirements.txt`
* **3. API Key:** Configure your Groq API Key (for Chat/Voice) and your Gemini API Key (for Image Analysis) in the application's environment settings.
* **4. Run Backend:** `python Backend/app.py`
