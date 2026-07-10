"""Chat orchestration: red-flag guardrail → RAG retrieval → Gemini.

Pipeline:
1. Screen the message for emergency red flags BEFORE any AI call. On match,
   return a fixed doctor-intervention response with zero medical advice.
2. Retrieve context from the uploaded medical documents (TF-IDF RAG).
3. Call Gemini with the persona tone. If the documents had nothing relevant,
   enable Google Search grounding so basic health questions (cold, fever)
   still get a sourced answer.
"""
import json
import re
import urllib.request

from config import GEMINI_API_KEY, GEMINI_MODEL
from services import rag
from services.persona import TONE_GUIDE, tone_key_for

# Emergency phrases that must never receive AI advice — only a doctor prompt.
RED_FLAGS = [
    "chest pain", "can't breathe", "cannot breathe", "trouble breathing",
    "shortness of breath", "heavy bleeding", "severe bleeding", "bleeding a lot",
    "severe pain", "unbearable pain", "passed out", "fainted", "unconscious",
    "seizure", "stroke", "heart attack", "suicidal", "suicide", "kill myself",
    "self harm", "overdose", "poisoned", "baby not moving", "no fetal movement",
    "water broke", "severe headache", "vision loss", "blurred vision suddenly",
    "high fever", "stiff neck", "coughing blood", "vomiting blood", "blood in stool",
]

DOCTOR_INTERVENTION_REPLY = (
    "⚠️ What you're describing may need urgent medical attention, so I won't offer "
    "suggestions for this. Please contact your doctor right away, or use the Emergency "
    "Alert button to notify your emergency contacts immediately. If this is an emergency, "
    "call your local emergency number now."
)


def check_red_flags(message: str):
    lower = message.lower()
    return any(flag in lower for flag in RED_FLAGS)


def _persona_instruction(persona, variant):
    return TONE_GUIDE.get(tone_key_for(persona, variant), TONE_GUIDE["adult"])


def _call_gemini(prompt: str, use_grounding: bool):
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}")
    body = {"contents": [{"parts": [{"text": prompt}]}]}
    if use_grounding:
        # Tool name differs across Gemini generations; pick by model family.
        if GEMINI_MODEL.startswith(("gemini-2", "gemini-3")):
            body["tools"] = [{"google_search": {}}]
        else:
            body["tools"] = [{"google_search_retrieval": {}}]
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    parts = data["candidates"][0]["content"]["parts"]
    return " ".join(p.get("text", "") for p in parts).strip()


def _extract_reply(raw: str) -> str:
    """The prompt asks for {"response": ...} JSON; extract it defensively."""
    for block in reversed(re.findall(r"\{.*?\}", raw, re.DOTALL)):
        try:
            data = json.loads(block)
            if "response" in data:
                return data["response"]
        except Exception:
            continue
    blocks = [b.strip() for b in raw.split("\n\n") if b.strip()]
    return blocks[-1] if blocks else raw.strip()


def chat_reply(user, persona, variant, message: str, history=None, pregnancy_week=None):
    """Returns (reply_text, meta) where meta notes guardrail/rag/web source."""
    if check_red_flags(message):
        return DOCTOR_INTERVENTION_REPLY, {"source": "guardrail"}

    if not GEMINI_API_KEY:
        return ("The AI assistant isn't configured yet — the server needs a "
                "GEMINI_API_KEY in its environment."), {"source": "unconfigured"}

    context_text, similarity = rag.retrieve(message)
    docs_relevant = similarity >= rag.RELEVANCE_THRESHOLD
    use_grounding = not docs_relevant

    persona_line = _persona_instruction(persona, variant)
    age = f"{user.name}, a {persona}" if user.name else f"a {persona}"
    preg_line = f" She is currently in week {pregnancy_week} of pregnancy." if pregnancy_week else ""

    history_text = ""
    if history:
        lines = [f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}" for m in history]
        history_text = "RECENT CONVERSATION:\n" + "\n".join(lines) + "\n\n"

    knowledge_block = (
        f"MEDICAL KNOWLEDGE BASE CONTEXT (from the user's uploaded documents):\n{context_text}\n\n"
        if docs_relevant else
        "The uploaded documents contain nothing relevant to this question. "
        "Use your web search tool to find current, reputable information.\n\n"
    )

    prompt = (
        f"{persona_line} You are talking to {age}.{preg_line}\n"
        "SAFETY RULES (absolute):\n"
        "- Never give a specific diagnosis or medication dosage.\n"
        "- For mild everyday issues (common cold, mild fever, small aches) you may give "
        "general self-care guidance.\n"
        "- If anything sounds like it needs a doctor (severe, persistent, or worsening "
        "symptoms; anything involving pregnancy complications, infants, chest pain, "
        "bleeding, or breathing), do NOT give advice — tell them to contact their doctor "
        "and mention the in-app Emergency Alert button.\n"
        "CRITICAL INSTRUCTION: Keep your response VERY concise (maximum 4 sentences). "
        'Respond ONLY with a valid JSON object, no markdown: {"response": "your message"}\n\n'
        f"{history_text}{knowledge_block}"
        f"User says: {message}"
    )

    try:
        raw = _call_gemini(prompt, use_grounding)
    except Exception:
        if use_grounding:
            # Grounding tool may be unavailable on some keys/models — retry plain.
            try:
                raw = _call_gemini(prompt, use_grounding=False)
                use_grounding = False
            except Exception as e2:
                return f"AI service error: {e2}", {"source": "error"}
        else:
            return "AI service error — please try again shortly.", {"source": "error"}

    return _extract_reply(raw), {"source": "web" if use_grounding else "docs", "similarity": similarity}
