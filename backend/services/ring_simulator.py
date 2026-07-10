"""⚠️ SIMULATED DATA SOURCE
No real ring hardware here. Generates plausible fetal/maternal readings so
the premium UI can be fully built and demoed. Swap generate_reading() for a
real Bluetooth/vendor-SDK read later — everything downstream (routes, UI)
already expects this exact shape."""
import random
from datetime import datetime, timezone


def generate_reading():
    return {
        "fetalHrBpm": random.randint(120, 160),   # normal fetal heart-rate range
        "movementCount": random.randint(0, 4),
        "maternalHrBpm": random.randint(70, 95),
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "source": "SIMULATED",  # always present so the frontend can badge it
    }


CALMING_SOUNDS = [
    {"id": 1, "title": "Ocean Waves", "durationSec": 600},
    {"id": 2, "title": "Prenatal Lullaby", "durationSec": 480},
    {"id": 3, "title": "Rainfall", "durationSec": 900},
    {"id": 4, "title": "Soft Piano", "durationSec": 720},
]
