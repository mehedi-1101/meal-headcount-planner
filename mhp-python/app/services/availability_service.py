"""
Availability service — which meals are available on a given date.

This is pure business logic (no DB writes), so it's easy to test.
Mirrors availabilityService.js exactly.
"""

from datetime import date as DateType
from app.constants import SpecialDayTypes
from app.services.settings_service import get_settings
from app.services.special_day_service import get_special_day


def _is_off_day(date_str: str, off_days: list[int]) -> bool:
    # Parse manually to avoid any timezone ambiguity
    y, m, d = map(int, date_str.split("-"))
    # weekday(): Mon=0 … Sun=6 — but our offDays use JS convention: Sun=0 … Sat=6
    # Convert: JS_day = (python_weekday + 1) % 7
    js_day = (DateType(y, m, d).weekday() + 1) % 7
    return js_day in off_days


def _in_any_period(date_str: str, periods: list[dict]) -> bool:
    return any(p["startDate"] <= date_str <= p["endDate"] for p in periods)


def get_available_meals(date_str: str) -> list[dict]:
    """
    Returns list of { type, default } dicts for meals available on date_str.
    Returns [] for off days, office-closed, and govt holidays.
    """
    settings = get_settings()

    if _is_off_day(date_str, settings["offDays"]):
        return []

    special_day = get_special_day(date_str)
    if special_day and special_day["type"] in (
        SpecialDayTypes.OFFICE_CLOSED,
        SpecialDayTypes.GOVT_HOLIDAY,
    ):
        return []

    meals = [
        {"type": "LUNCH",  "default": "IN"},
        {"type": "SNACKS", "default": "IN"},
    ]

    # IFTAR: default IN during iftar period, default OUT outside it
    if _in_any_period(date_str, settings.get("iftarPeriods", [])):
        meals.append({"type": "IFTAR", "default": "IN"})
    else:
        meals.append({"type": "IFTAR", "default": "OUT"})

    # Event meals only exist when a CELEBRATION special day attaches them
    if special_day and special_day.get("meals"):
        for meal in special_day["meals"]:
            if meal == "EVENT_DINNER":
                meals.append({"type": "EVENT_DINNER", "default": "IN"})
            if meal == "OPTIONAL_DINNER":
                meals.append({"type": "OPTIONAL_DINNER", "default": "OUT"})

    return meals
