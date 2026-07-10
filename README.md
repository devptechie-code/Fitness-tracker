# VitaCircle — Age-Adaptive Family Fitness Tracker

One app, every age. The interface, tone, and feature set adapt to who's signed
in — kid, teen, adult man/woman, senior, or expecting/new mom — with a family
head who monitors goal completion (never raw medical data) across the household.

## Stack

- **Backend:** Python — FastAPI, SQLAlchemy, SQLite, APScheduler
- **Frontend:** Vanilla JavaScript + CSS (served as static files by the backend), Chart.js
- **AI chat:** Google Gemini with document RAG (TF-IDF over `medical_knowledge.txt`
  + uploaded PDFs) and Google-Search grounding fallback, behind a medical
  red-flag guardrail
- **Auth:** bcrypt-hashed passwords + JWT
- **Alerts:** Make.com webhook (emergency), SMTP email (care-circle updates)

## Run locally

```bash
cd backend
cp .env.example .env    # fill in GEMINI_API_KEY, JWT_SECRET, etc.
pip install -r requirements.txt
python main.py          # http://localhost:8000
```

## Features

| Area | What it does |
|---|---|
| Sign-in / sign-up | First screen; JWT sessions, hashed passwords |
| Personas | kid 🦖 / teen 🎮 / adult 💼 / senior 🌿 / pregnancy 🤰 — theme, copy, and AI tone all follow `services/persona.py` |
| Pregnancy detection | Female profiles are asked "Are you pregnant?" during setup; if yes, the whole app switches to the Pregnancy Premium dashboard |
| Pregnancy Premium | Due-date countdown, week-by-week fetal development theme, weight gain vs BMI-band range, blood-test charts, hydration/calorie guidance by trimester, care-circle auto-updates (weekly → every 3 days from week 37), postpartum mode, simulated smart ring |
| Goals & vitals | Server-side goals, BMI + TDEE, daily logs (weight/water/calories, kicks & symptoms when pregnant), 7-day history |
| Documents | Private scans/prescriptions per user; explicit, revocable share grants gate every download |
| Family view | Head-only overview: completion % and due/ok status. No medical data |
| AI chat | Persona-toned Gemini; answers from your uploaded documents first (RAG), falls back to live web search for basic health questions; **emergency red flags get a fixed "contact your doctor" response with no advice** |
| Emergency alert | One tap notifies emergency contact, guardian, and doctor via webhook |

## Security notes

- All secrets come from environment variables — see `backend/.env.example`.
- ⚠️ A Gemini API key was previously hardcoded here and exists in old git
  history. **That key must be treated as compromised — regenerate it in
  Google AI Studio.** The current code never reads a hardcoded key.

## What's simulated / stubbed

- **Smart ring** — `services/ring_simulator.py`, clearly badged in the UI;
  swap for real hardware without touching routes or UI.
- **Premium payment** — a single "activate" call; swap for Stripe/Play Billing.
