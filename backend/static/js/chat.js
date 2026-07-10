// AI chat widgets. Standard bubble for most personas; WhatsApp-style panel
// for the pregnancy persona. Both call the same guarded /api/chat pipeline
// (red-flag guardrail → document RAG → Gemini with web-search fallback).

const BOT_NAME = {
  kid: "VitaBuddy — Quests & Fun",
  teen: "Vita — your health buddy",
  adult: "Vita — Medical Assistant",
  senior: "Vita — Medical Assistant",
  "pregnancy.expecting": "Vita — OB/GYN Assistant",
  "pregnancy.postpartum": "Vita — Postpartum Support",
};

function botWelcome(user) {
  const p = user.persona;
  if (p === "kid") return `Hiya ${user.name}! Ask me anything! 🌟`;
  if (p === "pregnancy" && user.variant === "postpartum")
    return `Hi ${user.name}, how are you and the baby doing today? 💛`;
  if (p === "pregnancy") return `Hi ${user.name}, how are you feeling today, mama-to-be? 💗`;
  if (p === "senior") return `Hello ${user.name}. I'm here to help — take your time.`;
  return `Hi ${user.name}! I'm your AI health assistant. How can I help today?`;
}

async function sendChatMessage(text, addBubble, setBusy) {
  setBusy(true);
  try {
    const data = await Api.post("/chat", { message: text });
    addBubble(data.reply, "bot", data.source === "guardrail");
  } catch (e) {
    addBubble("Sorry, I'm having trouble right now. " + e.message, "bot", false);
  } finally {
    setBusy(false);
  }
}

// ---- Standard chat bubble (kid / teen / adult / senior / family) ----
function renderChatBubble(root, user) {
  const key = user.persona === "pregnancy" ? `pregnancy.${user.variant}` : user.persona;
  root.innerHTML = `
    <div class="chat-bubble" id="chatPanel">
      <div class="who"><span>🤖 ${BOT_NAME[key] || BOT_NAME.adult}</span>
        <button class="chat-close" id="chatMin" aria-label="Minimize chat">—</button></div>
      <div class="chat-history" id="chatWindow" aria-live="polite"></div>
      <div class="chat-input">
        <input type="text" id="chatInput" placeholder="Type a symptom or question..." aria-label="Chat message">
        <button id="chatSend" aria-label="Send message">↑</button>
      </div>
    </div>`;
  const win = root.querySelector("#chatWindow");
  const input = root.querySelector("#chatInput");
  const sendBtn = root.querySelector("#chatSend");

  const addBubble = (text, role, guardrail) => {
    const div = document.createElement("div");
    div.className = `bubble ${role}${guardrail ? " guardrail" : ""}`;
    div.textContent = text;
    win.appendChild(div);
    win.scrollTop = win.scrollHeight;
  };
  const setBusy = (b) => { sendBtn.disabled = b; input.disabled = b; if (!b) input.focus(); };

  addBubble(botWelcome(user), "bot", false);

  const send = () => {
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;
    input.value = "";
    addBubble(text, "user", false);
    sendChatMessage(text, addBubble, setBusy);
  };
  sendBtn.onclick = send;
  input.onkeydown = (e) => { if (e.key === "Enter") send(); };
  root.querySelector("#chatMin").onclick = () => {
    root.innerHTML = `<button class="chat-fab" id="chatFab" aria-label="Open chat">💬</button>`;
    root.querySelector("#chatFab").onclick = () => renderChatBubble(root, user);
  };
}

// ---- WhatsApp-style panel (pregnancy persona) ----
function renderWhatsAppChat(root, user, startOpen = false) {
  if (!startOpen) {
    root.innerHTML = `<button class="wa-fab" id="waFab" aria-label="Open chat">💬</button>`;
    root.querySelector("#waFab").onclick = () => renderWhatsAppChat(root, user, true);
    return;
  }
  const isPost = user.variant === "postpartum";
  root.innerHTML = `
    <div class="wa-panel">
      <div class="wa-header">
        <div class="wa-avatar">🤰</div>
        <div>
          <div class="wa-title">Vita</div>
          <div class="wa-subtitle">Online · your ${isPost ? "postpartum" : "pregnancy"} assistant</div>
        </div>
        <button class="wa-close" aria-label="Close chat">✕</button>
      </div>
      <div class="wa-body" aria-live="polite"></div>
      <div class="wa-input-row">
        <input type="text" placeholder="Type a message" aria-label="Chat message">
        <button aria-label="Send message">➤</button>
      </div>
    </div>`;
  const body = root.querySelector(".wa-body");
  const input = root.querySelector("input");
  const sendBtn = root.querySelector(".wa-input-row button");

  const time = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const addBubble = (text, role, guardrail) => {
    const div = document.createElement("div");
    div.className = `wa-bubble ${role === "user" ? "wa-out" : "wa-in"}${guardrail ? " guardrail" : ""}`;
    div.textContent = text;
    const t = document.createElement("span");
    t.className = "wa-time";
    t.textContent = time();
    div.appendChild(t);
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  };
  const setBusy = (b) => { sendBtn.disabled = b; input.disabled = b; if (!b) input.focus(); };

  addBubble(botWelcome(user), "bot", false);

  const send = () => {
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;
    input.value = "";
    addBubble(text, "user", false);
    sendChatMessage(text, addBubble, setBusy);
  };
  sendBtn.onclick = send;
  input.onkeydown = (e) => { if (e.key === "Enter") send(); };
  root.querySelector(".wa-close").onclick = () => renderWhatsAppChat(root, user, false);
}

function mountChat(user) {
  const root = document.getElementById("chatRoot");
  if (user.persona === "pregnancy") renderWhatsAppChat(root, user, false);
  else renderChatBubble(root, user);
}
