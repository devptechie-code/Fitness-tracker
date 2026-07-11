/* Neo Fit — "Neo" AI chatbot with client-side RAG.
   Pipeline (mirrors the Healthcare RAG Deployment Guide, minus the server):
     1. Red-flag guardrail — emergencies get a fixed "call your doctor" reply,
        never AI advice.
     2. TF-IDF retrieval over the bundled knowledge base (kb.js): the
        pregnancy collection for moms-to-be, the general one for everyone
        (pregnant users search both).
     3. Answering:
        · With a user-supplied Gemini API key (🔑 "Use your own API key"),
          the retrieved context + persona tone go to Gemini.
        · Without a key, Neo answers straight from the knowledge base —
          fully offline, zero tokens spent.
   No API key ships with this code. The user's own key lives only in this
   browser's localStorage and is sent per-request to Google's API. */

"use strict";

/* ---------- BYOK: bring your own key ---------- */
const NEO_KEY_STORAGE = "neofit_gemini_key";
/* Google retires Gemini models over time (gemini-1.5-* no longer works on new
   keys). Try current models in order and remember the first one that answers. */
const NEO_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
const NEO_MODEL_STORAGE = "neofit_gemini_model";
const neoGetKey = () => localStorage.getItem(NEO_KEY_STORAGE) || "";
const neoSetKey = k => k ? localStorage.setItem(NEO_KEY_STORAGE, k)
                         : localStorage.removeItem(NEO_KEY_STORAGE);

/* ---------- Red-flag guardrail ---------- */
const NEO_RED_FLAGS = [
  "chest pain", "can't breathe", "cannot breathe", "trouble breathing",
  "shortness of breath", "heavy bleeding", "severe bleeding", "bleeding a lot",
  "severe pain", "unbearable pain", "passed out", "fainted", "unconscious",
  "seizure", "stroke", "heart attack", "suicidal", "suicide", "kill myself",
  "self harm", "overdose", "poisoned", "baby not moving", "no fetal movement",
  "water broke", "severe headache", "vision loss", "high fever", "stiff neck",
  "coughing blood", "vomiting blood", "blood in stool",
];

const NEO_GUARDRAIL_REPLY =
  "⚠️ What you're describing may need urgent medical attention, so I won't " +
  "offer suggestions for this. Please contact your doctor right away — your " +
  "emergency contact is on your dashboard. If this is an emergency, call your " +
  "local emergency number now.";

function neoRedFlagged(msg) {
  const lower = msg.toLowerCase();
  return NEO_RED_FLAGS.some(f => lower.includes(f));
}

/* ---------- TF-IDF retrieval over kb.js ---------- */
const NEO_STOP = new Set(("a an and are as at be but by for from has have i in is it its of on or " +
  "that the to was we what when where which who why will with you your should how do does can").split(" "));

function neoTokens(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !NEO_STOP.has(w));
}

/* Chunks: one per "## " section of each collection document. */
let _neoChunks = null;
function neoChunks() {
  if (_neoChunks) return _neoChunks;
  _neoChunks = {};
  for (const [coll, doc] of Object.entries(NEOFIT_KB)) {
    _neoChunks[coll] = doc.split(/\n(?=## )/).map(s => s.trim()).filter(s => s.length > 40)
      .map(text => ({ text, tokens: neoTokens(text) }));
  }
  return _neoChunks;
}

/* Returns { context, best } — top-k chunk texts and the best cosine score. */
function neoRetrieve(query, collection, topK = 3) {
  const chunks = collection === "pregnancy"
    ? [...neoChunks().pregnancy, ...neoChunks().general]
    : neoChunks().general;
  const qTokens = neoTokens(query);
  if (!qTokens.length || !chunks.length) return { context: "", best: 0 };

  const df = {};
  chunks.forEach(c => new Set(c.tokens).forEach(t => { df[t] = (df[t] || 0) + 1; }));
  const N = chunks.length;
  const idf = t => Math.log(1 + N / (1 + (df[t] || 0)));

  const vec = tokens => {
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    const v = {};
    let norm = 0;
    for (const [t, f] of Object.entries(tf)) {
      const w = f * idf(t);
      v[t] = w;
      norm += w * w;
    }
    return { v, norm: Math.sqrt(norm) || 1 };
  };

  const q = vec(qTokens);
  const scored = chunks.map(c => {
    const cv = vec(c.tokens);
    let dot = 0;
    for (const [t, w] of Object.entries(q.v)) if (cv.v[t]) dot += w * cv.v[t];
    return { text: c.text, score: dot / (q.norm * cv.norm) };
  }).sort((a, b) => b.score - a.score);

  const top = scored.slice(0, topK).filter(s => s.score > 0.05);
  return { context: top.map(s => s.text).join("\n\n"), best: scored[0]?.score || 0 };
}

/* ---------- Persona tone for the LLM ---------- */
const NEO_TONES = {
  kid: "You are Neo, a playful, encouraging health buddy for a young child. Use very simple words, one emoji, and keep everything positive. Never scary.",
  teen: "You are Neo, a casual, upbeat health assistant for a teenager. Be brief, friendly, a little gamer-flavoured, never preachy.",
  adult: "You are Neo, a clear and professional health assistant. Be concise, practical, and warm.",
  senior: "You are Neo, a patient, respectful health assistant for an older adult. Use calm, clear language, no slang.",
  pregnancy: "You are Neo, a gentle, reassuring assistant for an expecting mother. Be supportive and careful; always defer to her OB for anything specific.",
};

/* ---------- Gemini call (only when the user saved their own key) ---------- */
async function neoAskGemini(message, context, persona, name) {
  const prompt =
    `${NEO_TONES[persona] || NEO_TONES.adult} You are talking to ${name}.\n` +
    "SAFETY RULES (absolute):\n" +
    "- Never give a specific diagnosis or medication dosage.\n" +
    "- For mild everyday issues you may give general self-care guidance.\n" +
    "- If anything sounds like it needs a doctor, say so instead of advising.\n" +
    "Keep your response VERY concise (maximum 4 sentences), plain text only.\n\n" +
    (context
      ? `KNOWLEDGE BASE CONTEXT (answer from this first):\n${context}\n\n`
      : "No knowledge-base context matched; answer from general knowledge, cautiously.\n\n") +
    `User says: ${message}`;

  // Try the remembered model first, then the rest of the candidate list.
  const remembered = localStorage.getItem(NEO_MODEL_STORAGE);
  const models = [...new Set([remembered, ...NEO_GEMINI_MODELS].filter(Boolean))];
  let lastError = "Gemini did not respond.";

  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(neoGetKey())}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });

    if (res.ok) {
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts.map(p => p.text || "").join(" ").trim();
      if (!text) { lastError = "Gemini returned an empty reply — try again."; continue; }
      localStorage.setItem(NEO_MODEL_STORAGE, model);
      return text;
    }

    // Pull Google's actual error message out of the response body.
    let apiMsg = "";
    try { apiMsg = (await res.json())?.error?.message || ""; } catch { /* not JSON */ }

    if (res.status === 404) {
      // Model unknown to this key — try the next candidate.
      lastError = `Model ${model} isn't available on your key.`;
      continue;
    }
    if (res.status === 400 || res.status === 403) {
      throw new Error("Your API key was rejected — check it via the 🔑 button." +
                      (apiMsg ? ` (Google says: ${apiMsg})` : ""));
    }
    if (res.status === 429) {
      throw new Error("Your key's free quota is used up for now — try again in a minute." +
                      (apiMsg ? ` (Google says: ${apiMsg})` : ""));
    }
    lastError = `Gemini error ${res.status}${apiMsg ? `: ${apiMsg}` : "."}`;
  }
  throw new Error(lastError);
}

/* ---------- KB-only answer (no key needed, zero tokens) ---------- */
function neoKbAnswer(context) {
  const first = context.split("\n\n")[0]
    .replace(/^## /, "").replace(/\n/g, " ").trim();
  return `📚 From the Neo Fit knowledge base: ${first}`;
}

/* ---------- Reply orchestration ---------- */
async function neoReply(message) {
  if (neoRedFlagged(message)) return { text: NEO_GUARDRAIL_REPLY, guardrail: true };

  const persona = personaFor(currentUser);
  const collection = persona === "pregnancy" ? "pregnancy" : "general";
  const { context, best } = neoRetrieve(message, collection);

  if (neoGetKey()) {
    const text = await neoAskGemini(message, best >= 0.1 ? context : "",
                                    persona, currentUser.name.split(" ")[0]);
    return { text, guardrail: false };
  }
  if (best >= 0.1 && context) return { text: neoKbAnswer(context), guardrail: false };
  return {
    text: "I couldn't find that in my built-in knowledge base. Tap 🔑 and add " +
          "your own free Gemini API key (aistudio.google.com/apikey) and I'll " +
          "answer anything — on your own quota, so shared tokens never run out.",
    guardrail: false,
  };
}

/* ---------- Widget UI ---------- */
const NEO_WELCOME = {
  kid: n => `Hi ${n}! I'm Neo 🦖 Ask me anything about being healthy!`,
  teen: n => `Yo ${n} — Neo here. Health questions? Fire away ⚡`,
  senior: n => `Hello ${n}. I'm Neo — take your time, I'm here to help.`,
  pregnancy: n => `Hi ${n} 💗 I'm Neo. Ask me anything — pregnancy questions welcome.`,
  adult: n => `Hi ${n}! I'm Neo, your AI health assistant. How can I help today?`,
};

let neoOpen = false;

function mountNeoChat() {
  let root = document.getElementById("neoChatRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "neoChatRoot";
    document.body.appendChild(root);
  }
  root.hidden = false;
  renderNeo(root);
}

function unmountNeoChat() {
  const root = document.getElementById("neoChatRoot");
  if (root) { root.hidden = true; root.innerHTML = ""; }
  neoOpen = false;
}

function renderNeo(root) {
  if (!neoOpen) {
    root.innerHTML = `<button class="neo-fab" id="neoFab" aria-label="Open Neo, the AI health chat">💬</button>`;
    root.querySelector("#neoFab").onclick = () => { neoOpen = true; renderNeo(root); };
    return;
  }
  const persona = personaFor(currentUser);
  root.innerHTML = `
    <div class="neo-panel" role="dialog" aria-label="Neo AI health chat">
      <div class="neo-head">
        <span class="neo-title">🤖 Neo — AI health chat</span>
        <span class="neo-head-btns">
          <button class="neo-hbtn" id="neoKeyBtn" title="Use your own API key" aria-label="Use your own API key">🔑</button>
          <button class="neo-hbtn" id="neoMin" aria-label="Minimize chat">—</button>
        </span>
      </div>
      <div class="neo-body" id="neoBody" aria-live="polite"></div>
      <div class="neo-byok" id="neoByok" hidden></div>
      <div class="neo-input">
        <input type="text" id="neoInput" placeholder="Ask a health question…" aria-label="Chat message">
        <button id="neoSend" aria-label="Send message">➤</button>
      </div>
      <p class="neo-note">${neoGetKey()
        ? "Using <b>your own API key</b> 🔑 — answers by Gemini + Neo Fit knowledge base."
        : "Key-less mode: answers come from the built-in knowledge base. Tap 🔑 to use your own API key."}</p>
    </div>`;

  const body = root.querySelector("#neoBody");
  const input = root.querySelector("#neoInput");
  const sendBtn = root.querySelector("#neoSend");
  const byok = root.querySelector("#neoByok");

  const bubble = (text, role, guardrail = false) => {
    const div = document.createElement("div");
    div.className = `neo-msg ${role}${guardrail ? " guardrail" : ""}`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  };

  bubble((NEO_WELCOME[persona] || NEO_WELCOME.adult)(currentUser.name.split(" ")[0]), "bot");

  const send = async () => {
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;
    input.value = "";
    bubble(text, "user");
    sendBtn.disabled = true;
    input.disabled = true;
    const typing = bubble("…", "bot typing");
    try {
      const r = await neoReply(text);
      typing.remove();
      bubble(r.text, "bot", r.guardrail);
    } catch (e) {
      typing.remove();
      bubble("Sorry — " + e.message, "bot");
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    }
  };
  sendBtn.onclick = send;
  input.onkeydown = e => { if (e.key === "Enter") send(); };

  root.querySelector("#neoKeyBtn").onclick = () => {
    if (!byok.hidden) { byok.hidden = true; return; }
    byok.hidden = false;
    const has = !!neoGetKey();
    byok.innerHTML = `
      <div class="neo-byok-title">🔑 Use your own API key</div>
      <p class="neo-byok-note">Paste a free Gemini API key from
        <b>aistudio.google.com/apikey</b> to chat on your own quota — so shared
        API tokens never get exhausted. The key is stored only in this browser
        and sent straight to Google, never to any Neo Fit server.</p>
      <div class="neo-byok-row">
        <input type="password" placeholder="${has ? "••••••••  (key saved)" : "Paste your Gemini API key"}"
               aria-label="Your Gemini API key" autocomplete="off">
        <button class="btn small" data-act="save">Save</button>
        ${has ? `<button class="btn ghost small" data-act="clear">Remove</button>` : ""}
      </div>`;
    const kInput = byok.querySelector("input");
    byok.querySelector('[data-act="save"]').onclick = () => {
      const k = kInput.value.trim();
      if (!k) { byok.hidden = true; return; }
      neoSetKey(k);
      neoOpen = true;
      renderNeo(root);
      toast("API key saved in this browser 🔑");
    };
    const clearBtn = byok.querySelector('[data-act="clear"]');
    if (clearBtn) clearBtn.onclick = () => {
      neoSetKey("");
      renderNeo(root);
      toast("API key removed — back to key-less mode");
    };
    kInput.onkeydown = e => { if (e.key === "Enter") byok.querySelector('[data-act="save"]').click(); };
    kInput.focus();
  };

  root.querySelector("#neoMin").onclick = () => { neoOpen = false; renderNeo(root); };
  input.focus();
}
