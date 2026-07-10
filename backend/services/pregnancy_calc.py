"""Pregnancy math — tracked from the due date backward (40 weeks total),
the standard clinical convention. Port of vitacircle services/pregnancy.js."""
from datetime import date, datetime, timezone


def weeks_from_due_date(due_date):
    today = date.today()
    days_remaining = max(0, (due_date - today).days)
    weeks_remaining = max(0, -(-days_remaining // 7))  # ceil
    weeks_pregnant = min(42, max(1, 40 - weeks_remaining))
    return {
        "weeks_pregnant": weeks_pregnant,
        "weeks_remaining": weeks_remaining,
        "days_remaining": days_remaining,
        "due_date": due_date,
    }


def trimester_for(week):
    if week <= 13:
        return 1
    if week <= 27:
        return 2
    return 3


def calorie_guidance(week):
    """Public-health ballpark ranges, always framed as guidance."""
    t = trimester_for(week)
    if t == 1:
        return {"extraCalories": "0–50", "note": "Calorie needs barely change in the first trimester."}
    if t == 2:
        return {"extraCalories": "~300",
                "note": "Baby's growth accelerates — most women need roughly 300 extra calories/day."}
    return {"extraCalories": "~450",
            "note": "Third trimester growth is fastest — roughly 450 extra calories/day is a common guideline."}


def hydration_guidance_ml():
    return {"targetMl": 2300,
            "note": "About 10 cups of fluids a day is a common target during pregnancy — "
                    "more if it's hot or you're active."}


def expected_weight_gain_range_kg(pre_weight_kg, height_cm):
    """Expected total gain by end of pregnancy from pre-pregnancy BMI banding.
    Guidance, not diagnosis — always paired with a doctor prompt."""
    if not pre_weight_kg or not height_cm:
        return {"minKg": 11.5, "maxKg": 16, "band": "general"}
    bmi = pre_weight_kg / ((height_cm / 100) ** 2)
    if bmi < 18.5:
        return {"minKg": 12.5, "maxKg": 18, "band": "underweight"}
    if bmi < 25:
        return {"minKg": 11.5, "maxKg": 16, "band": "healthy"}
    if bmi < 30:
        return {"minKg": 7, "maxKg": 11.5, "band": "overweight"}
    return {"minKg": 5, "maxKg": 9, "band": "obese"}


def update_cadence_days(week):
    """Care-circle auto-update cadence: weekly, stepping up to every 3 days
    once she's within 3 weeks of the due date (week 37+)."""
    return 3 if week >= 37 else 7


def is_update_due(last_sent_at, week):
    if not last_sent_at:
        return True
    if last_sent_at.tzinfo is None:
        last_sent_at = last_sent_at.replace(tzinfo=timezone.utc)
    elapsed = datetime.now(timezone.utc) - last_sent_at
    return elapsed.total_seconds() >= update_cadence_days(week) * 86400
