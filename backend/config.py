"""Central configuration. Every secret comes from the environment —
nothing sensitive is ever hardcoded in source again."""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass  # dotenv is optional in production (Render injects real env vars)

BASE_DIR = Path(__file__).parent

# --- AI ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")

# --- Auth ---
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = int(os.environ.get("JWT_EXPIRY_HOURS", "72"))

# --- Database ---
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{BASE_DIR / 'fitness.db'}")

# --- Emergency alert webhook (Make.com etc.) ---
ALERT_WEBHOOK_URL = os.environ.get("ALERT_WEBHOOK_URL", "")

# --- Email (care-circle updates). If SMTP_HOST is unset, emails are logged. ---
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "VitaCircle <no-reply@vitacircle.app>")

# --- File storage for scans/prescriptions ---
STORAGE_ROOT = Path(os.environ.get("STORAGE_ROOT", BASE_DIR / "storage"))
