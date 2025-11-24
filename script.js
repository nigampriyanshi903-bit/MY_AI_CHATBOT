

// (Chat + Vision(Image) + Voice(STT) + TTS + UI)


/* CONFIG: Backend endpoints */
const API_ORIGIN = "http://127.0.0.1:8000";
const API_CHAT = `${API_ORIGIN}/chat`;
const API_VOICE = `${API_ORIGIN}/voice`;
const API_TTS = `${API_ORIGIN}/tts`;
const API_VISION = `${API_ORIGIN}/vision`;

/* APP STATE */
let chats = [];
let currentChatIndex = -1;
let imageData = null;      // base64 string from file input
let recorder = null;
let audioChunks = [];
let isRecording = false;

/* DOM */
const chatBox = document.getElementById("chat-box");
const historyList = document.getElementById("history-list");
const sendBtn = document.getElementById("send-btn");
const input = document.getElementById("user-input");
const fileInput = document.getElementById("file-input");
const newChatBtn = document.getElementById("new-chat-btn");
const recordBtn = document.getElementById("recordBtn");

const voiceGender = document.getElementById('voiceGender');
const voiceSpeed = document.getElementById('voiceSpeed');
const voicePitch = document.getElementById('voicePitch');
const voiceLang = document.getElementById('voiceLang');
const ttsAudioPlayer = document.getElementById('ttsAudioPlayer'); // optional audio element

/* --------------------------
   Custom UI (non-blocking)
   -------------------------- */
function showCustomAlert(message) {
  console.error("ALERT:", message);
  const box = document.createElement("div");
  box.className = "fixed top-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-xl z-[999]";
  box.textContent = message;
  document.body.appendChild(box);
  setTimeout(() => {
    box.style.opacity = "0";
    box.addEventListener("transitionend", () => box.remove());
  }, 4500);
}

function showCustomConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[999]";
    const card = document.createElement("div");
    card.className = "bg-white p-6 rounded-lg max-w-sm w-full";
    const p = document.createElement("p");
    p.className = "mb-4 text-gray-800";
    p.textContent = message;
    const btnRow = document.createElement("div");
    btnRow.className = "flex justify-end space-x-3";
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "px-3 py-2 bg-gray-200 rounded";
    cancelBtn.onclick = () => { overlay.remove(); resolve(false); };
    const okBtn = document.createElement("button");
    okBtn.textContent = "Delete";
    okBtn.className = "px-3 py-2 bg-red-500 text-white rounded";
    okBtn.onclick = () => { overlay.remove(); resolve(true); };
    btnRow.append(cancelBtn, okBtn);
    card.append(p, btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}

function showCustomPrompt(message, defaultValue = "") {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[999]";
    const card = document.createElement("div");
    card.className = "bg-white p-6 rounded-lg max-w-sm w-full";
    const p = document.createElement("p");
    p.className = "mb-2 text-gray-800";
    p.textContent = message;
    const inputField = document.createElement("input");
    inputField.type = "text";
    inputField.value = defaultValue || "";
    inputField.className = "w-full p-2 border rounded mb-4";
    const btnRow = document.createElement("div");
    btnRow.className = "flex justify-end space-x-3";
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "px-3 py-2 bg-gray-200 rounded";
    cancelBtn.onclick = () => { overlay.remove(); resolve(null); };
    const okBtn = document.createElement("button");
    okBtn.textContent = "Save";
    okBtn.className = "px-3 py-2 bg-blue-600 text-white rounded";
    okBtn.onclick = () => { overlay.remove(); resolve(inputField.value); };
    inputField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { okBtn.click(); }
    });
    btnRow.append(cancelBtn, okBtn);
    card.append(p, inputField, btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    inputField.focus();
  });
}

/* --------------------------
   LocalStorage: save/load
   -------------------------- */
function saveChats() {
  localStorage.setItem("ai_chats", JSON.stringify(chats));
  localStorage.setItem("ai_current_index", currentChatIndex);
}

function loadSavedChats() {
  const s = localStorage.getItem("ai_chats");
  const idx = localStorage.getItem("ai_current_index");
  if (s) {
    try {
      chats = JSON.parse(s);
      currentChatIndex = parseInt(idx);
      if (Number.isNaN(currentChatIndex) || currentChatIndex < 0) currentChatIndex = 0;
      if (currentChatIndex >= chats.length) currentChatIndex = chats.length - 1;
    } catch (e) {
      chats = [{ title: "New Chat", messages: [] }];
      currentChatIndex = 0;
    }
  } else {
    chats = [{ title: "New Chat", messages: [] }];
    currentChatIndex = 0;
  }
}

/* --------------------------
   Render UI
   -------------------------- */
function renderChatList() {
  historyList.innerHTML = "";
  chats.forEach((c, idx) => {
    const li = document.createElement("li");
    li.className = `chat-item ${idx === currentChatIndex ? "active" : ""}`;
    li.dataset.chatIndex = idx;
    li.setAttribute('tabindex', '0');

    const title = document.createElement("span");
    title.className = "chat-title";
    title.textContent = c.title || `Chat ${idx + 1}`;
    /*title.onclick = () => loadChat(idx);*/
    
    li.onclick = (e) => {
        
        if (!e.target.classList.contains("menu-btn")) {
            loadChat(idx);
        }
    };
    
    
    li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); 
            loadChat(idx);
        }
    });

    const menuBtn = document.createElement("button");
    menuBtn.className = "menu-btn ml-2";
    menuBtn.textContent = "⋮";

    const popup = document.createElement("div");
    popup.className = "menu-popup hidden absolute bg-white shadow rounded p-2";
    popup.style.minWidth = "140px";
    popup.innerHTML = `
      <div class="menu-option rename cursor-pointer px-2 py-1">✏️ Rename</div>
      <div class="menu-option delete cursor-pointer px-2 py-1">🗑 Delete</div>
    `;

    menuBtn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll(".menu-popup").forEach(p => p.classList.add("hidden"));
      popup.classList.toggle("hidden");
    };

    li.append(title, menuBtn, popup);
    historyList.appendChild(li);
  });
}

function loadChat(index) {
  currentChatIndex = index;
  renderCurrentChat();
  renderChatList();
  saveChats();
}

function renderCurrentChat() {
  chatBox.innerHTML = "";
  if (!chats[currentChatIndex]) return;
  const messages = chats[currentChatIndex].messages || [];
  messages.forEach(m => renderMessage(m));
  chatBox.scrollTop = chatBox.scrollHeight;
}

function renderMessage(msg) {
  const wrapper = document.createElement("div");
  wrapper.className = `msg ${msg.type}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble p-3 rounded my-2 max-w-[80%]";

  if (msg.type === "bot") {
    bubble.innerHTML = marked.parse(msg.text || "");
  } else {
    bubble.textContent = msg.text || "";
    // fileInfo display
    if (msg.fileInfo) {
      const fileDisplay = document.createElement('div');
      fileDisplay.className = 'text-xs mt-1 text-gray-500 italic font-mono';
      fileDisplay.textContent = `📎 ${msg.fileInfo}`;
      bubble.appendChild(fileDisplay);
    }
  }

  wrapper.appendChild(bubble);

  if (msg.type === "bot") {
    const speakBtn = document.createElement("button");
    speakBtn.className = "speakBtn ml-2";
    speakBtn.textContent = "🔊";
    speakBtn.onclick = () => playTTS(msg.text);
    wrapper.appendChild(speakBtn);
  }

  // If message contains an inline image_url (user uploaded)
  if (msg.image_url) {
    const img = document.createElement("img");
    img.src = msg.image_url;
    img.className = "attached-image mt-2 max-w-sm rounded shadow";
    wrapper.appendChild(img);
  }

  chatBox.appendChild(wrapper);
}

/* --------------------------
   New Chat
   -------------------------- */
newChatBtn.onclick = () => {
  chats.push({ title: `Chat ${chats.length + 1}`, messages: [] });
  currentChatIndex = chats.length - 1;
  renderCurrentChat();
  renderChatList();
  saveChats();
};

/* --------------------------
   File input -> base64
   -------------------------- */
fileInput.addEventListener("change", () => {
  const f = fileInput.files[0];
  if (!f) {
    imageData = null;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    imageData = reader.result; // data:[mime];base64,...
  };
  reader.readAsDataURL(f);
});

/* --------------------------
   Send message (chat or vision)
   -------------------------- */
async function sendMessage(msgOverride = null) {
  const text = (msgOverride !== null) ? msgOverride.trim() : input.value.trim();
  const file = fileInput.files[0];

  if (!text && !file) return;

  // Ensure at least one chat exists
  if (currentChatIndex === -1 || !chats[currentChatIndex]) {
    chats.push({ title: `Chat ${chats.length + 1}`, messages: [] });
    currentChatIndex = chats.length - 1;
  }

  // Create user message object and push to UI immediately
  const userMsg = {
    type: "user",
    text: text,
    ts: Date.now(),
    fileInfo: file ? `(File: ${file.name})` : null,
    image_url: (file && imageData && file.type.startsWith("image/")) ? imageData : null
  };
  chats[currentChatIndex].messages.push(userMsg);
  renderMessage(userMsg);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Clear input & file UI
  input.value = "";
  fileInput.value = "";

  // Prepare history for backend as earlier (exclude current message)
  const historyForApi = chats[currentChatIndex].messages.slice(0, -1).map(m => {
    return {
      role: m.type === "user" ? "user" : "assistant",
      parts: [{ text: m.text || "" }]
    };
  });

  // Disable send while fetching
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="loading-spinner"></span>';

  try {
    let botReply = "⚠ No response from server";

    // If there is an image and it's an image file => call /vision (JSON)
    if (file && imageData && file.type.startsWith("image/")) {
      const payload = {
        text_prompt: text,
        base64_image: imageData.split(",")[1], // without data:mime;base64,
        mime_type: file.type,
        chat_history: historyForApi.map(h => ({ role: h.role, text: h.parts[0].text }))
      };

      const res = await fetch(API_VISION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Vision API error: ${res.status} ${errText}`);
      }

      const data = await res.json();
      botReply = data.response || (data.reply || "No response from vision API");
    } else {
      // Normal chat => send multipart FormData (supports file uploads too)
      const form = new FormData();
      form.append("message", text);
      if (file) form.append("file", file);
      form.append("history", JSON.stringify(historyForApi));

      const res = await fetch(API_CHAT, { method: "POST", body: form });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Chat API error: ${res.status} ${errText}`);
      }

      const data = await res.json();
      botReply = data.reply || data.response || "No reply from server";
    }

    // Push bot message and render
    const botMsg = { type: "bot", text: botReply, ts: Date.now() };
    chats[currentChatIndex].messages.push(botMsg);
    renderMessage(botMsg);
    saveChats();
    chatBox.scrollTop = chatBox.scrollHeight;

    // Auto TTS for bot reply
    playTTS(botReply);

  } catch (err) {
    console.error("Send message error:", err);
    const errMsg = { type: "bot", text: `⚠ Server error: ${err.message}`, ts: Date.now() };
    chats[currentChatIndex].messages.push(errMsg);
    renderMessage(errMsg);
    showCustomAlert(`Server error: ${err.message}`);
    saveChats();
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = 'Send';
    // reset stored imageData only after request (we already set image_url in UI)
    imageData = null;
    renderChatList();
  }
}

/* --------------------------
   Voice Recording -> /voice
   -------------------------- */
recordBtn.onclick = async () => {
  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream);
      audioChunks = [];
      recorder.ondataavailable = e => audioChunks.push(e.data);
      recorder.start();
      isRecording = true;
      recordBtn.textContent = "🔴 Recording...";
      recordBtn.classList.add("recording");
    } catch (e) {
      showCustomAlert("Microphone permission denied or unavailable.");
      console.error(e);
    }
  } else {
    // Stop & send to /voice
    recorder.stop();
    isRecording = false;
    recordBtn.textContent = "🎤";
    recordBtn.classList.remove("recording");

    recorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/wav" });
      const form = new FormData();
      form.append("file", blob, "voice.wav");

      // Temporary message
      const temp = { type: "bot", text: "Transcribing audio...", ts: Date.now() };
      chats[currentChatIndex].messages.push(temp);
      renderCurrentChat();

      try {
        const res = await fetch(API_VOICE, { method: "POST", body: form });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Voice API ${res.status}: ${errText}`);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error || "Transcription failed");
        const transcribedText = data.text || "";

        // Remove temp message
        chats[currentChatIndex].messages.pop();

        // Send the transcribed text as a normal message
        await sendMessage(transcribedText);

      } catch (err) {
        console.error("Voice error:", err);
        // remove temp
        chats[currentChatIndex].messages.pop();
        renderCurrentChat();
        showCustomAlert("Voice API error: " + err.message);
      }
    };
  }
};

/* --------------------------
   TTS: call /tts -> play returned audio
   -------------------------- */
async function playTTS(text) {
  // If no voice controls found, fallback to Web Speech
  if (!voiceGender || !voiceSpeed || !voicePitch || !voiceLang) {
    // fallback: browser TTS
    const ut = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(ut);
    return;
  }

  try {
    const form = new FormData();
    form.append("text", text);
    form.append("gender", voiceGender.value || "female");
    form.append("speed", voiceSpeed.value || "1.0");
    form.append("pitch", voicePitch.value || "1.0");
    form.append("lang", voiceLang.value || "en-US");

    const res = await fetch(API_TTS, { method: "POST", body: form });
    if (!res.ok) {
      const errText = await res.text();
      console.error("TTS error:", res.status, errText);
      showCustomAlert("TTS server error");
      return;
    }
    const data = await res.json();
    if (data.error) {
      console.error("TTS returned error:", data.error);
      showCustomAlert("TTS generation error");
      return;
    }

    const audioUrl = data.audio_url; // server returns relative path like /tts_audio/<file>
    if (!audioUrl) {
      console.warn("TTS returned no audio URL.");
      return;
    }

    const fullUrl = (audioUrl.startsWith("http")) ? audioUrl : (API_ORIGIN + audioUrl);
    if (ttsAudioPlayer) {
      ttsAudioPlayer.src = fullUrl;
      ttsAudioPlayer.play();
    } else {
      const a = new Audio(fullUrl);
      a.play();
    }
  } catch (err) {
    console.error("TTS client error:", err);
  }
}

/* --------------------------
   Global event listener for menu actions (rename/delete)
   -------------------------- */
document.addEventListener("click", function (e) {
  // hide all popup menus when clicked outside
  if (!e.target.classList.contains("menu-btn")) {
    document.querySelectorAll(".menu-popup").forEach(p => p.classList.add("hidden"));
  }

  const chatItem = e.target.closest(".chat-item");
  if (!chatItem) return;
  const index = parseInt(chatItem.dataset.chatIndex);
  if (isNaN(index)) return;

  if (e.target.classList.contains("rename")) {
    (async () => {
      const old = chats[index].title;
      const v = await showCustomPrompt("Enter new chat name:", old);
      if (v !== null && v.trim() !== "" && v.trim() !== old) {
        chats[index].title = v.trim();
        renderChatList();
        saveChats();
      }
    })();
  }

  if (e.target.classList.contains("delete")) {
    (async () => {
      const ok = await showCustomConfirm(`Delete "${chats[index].title}"?`);
      if (!ok) return;
      chats.splice(index, 1);
      if (chats.length === 0) {
        chats.push({ title: "New Chat", messages: [] });
        currentChatIndex = 0;
      } else if (index === currentChatIndex) {
        currentChatIndex = Math.max(0, index - 1);
      } else if (index < currentChatIndex) {
        currentChatIndex--;
      }
      renderChatList();
      renderCurrentChat();
      saveChats();
    })();
  }
});

/* --------------------------
   Send button & Enter key
   -------------------------- */
sendBtn.onclick = () => sendMessage();
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

/* --------------------------
   Init
   -------------------------- */
loadSavedChats();
renderChatList();
renderCurrentChat();






