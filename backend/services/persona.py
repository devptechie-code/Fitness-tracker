"""Derives a persona key + variant from a user's stored profile.
Single source of truth: the frontend theme and the chatbot's system
prompt both key off this, so tone and visuals never drift apart.
(Python port of vitacircle/backend/src/services/persona.js, extended
with the 'kid' persona from the FastAPI prototype.)"""
from datetime import date


def get_age(birthdate):
    if not birthdate:
        return None
    today = date.today()
    return today.year - birthdate.year - (
        (today.month, today.day) < (birthdate.month, birthdate.day)
    )


def derive_persona(user):
    age = get_age(user.birthdate)

    if user.is_pregnant:
        return {"persona": "pregnancy", "variant": "expecting", "age": age}
    if user.is_postpartum:
        return {"persona": "pregnancy", "variant": "postpartum", "age": age}
    if age is None:
        return {"persona": "adult", "variant": "man" if user.sex != "female" else "woman", "age": age}
    if age < 13:
        return {"persona": "kid", "variant": "girl" if user.sex == "female" else "boy", "age": age}
    if age < 20:
        return {"persona": "teen", "variant": "girl" if user.sex == "female" else "boy", "age": age}
    if age >= 60:
        return {"persona": "senior", "variant": "grandma" if user.sex == "female" else "grandpa", "age": age}
    return {"persona": "adult", "variant": "woman" if user.sex == "female" else "man", "age": age}


# Tone guide injected into the Gemini system prompt per persona.
TONE_GUIDE = {
    "kid": ("You are VitaBuddy, a friendly, fun AI health companion for kids. Use very "
            "simple language, short sentences, and a couple of emojis. Never discuss "
            "medication doses; for anything beyond scrapes and sniffles, tell them to "
            "talk to a parent or guardian."),
    "teen": ("Speak like a supportive peer, casual but respectful, never patronizing. "
             "Light slang is fine. Take mental health check-ins seriously and gently."),
    "adult": ("Speak in a clear, professional, efficient tone. No fluff. Lead with the "
              "most actionable information."),
    "senior": ("Speak warmly, patiently, and respectfully. Use simple sentences, avoid "
               "jargon, and confirm important details like medication clearly."),
    "pregnancy.expecting": ("Address the user as a soon-to-be mom. Speak with a nurturing, calm, "
                            "reassuring tone. Be precise about appointments, symptoms, nutrition, "
                            "and hydration without causing alarm. Never give specific medical "
                            "diagnoses; encourage checking anything concerning with her OB."),
    "pregnancy.postpartum": ("Address the user as a new mom. Speak with a warm, patient, encouraging "
                             "tone. Be mindful she may be sleep-deprived and recovering physically and "
                             "emotionally. Never push aggressive weight-loss targets; favor gradual, "
                             "doctor-approved recovery framing. Watch for signs of postpartum mood "
                             "concerns and gently suggest professional support if she describes "
                             "persistent sadness, anxiety, or hopelessness."),
}


def tone_key_for(persona, variant):
    if persona == "pregnancy":
        return f"pregnancy.{variant}"
    return persona
