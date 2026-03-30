"""
Settings service — read and write global app settings from DynamoDB.
PK=SETTINGS, SK=CONFIG (single item, always the same key).
"""

from app.database import get_item, put_item

_PK = "SETTINGS"
_SK = "CONFIG"

# Defaults mirror the Node.js settings.json initial values
_DEFAULTS = {
    "cutoffTime": "21:00",
    "offDays": [5, 6],          # Friday=5, Saturday=6 (0=Sunday)
    "iftarPeriods": [],
    "companyWfhPeriods": [],
    "maxForwardPlanningDays": 14,
    "monthlyWfhAllowance": 5,
}


def get_settings() -> dict:
    item = get_item(_PK, _SK)
    if not item:
        return _DEFAULTS.copy()
    # Strip DynamoDB keys before returning to callers
    item.pop("PK", None)
    item.pop("SK", None)
    return item


def update_settings(updates: dict) -> dict:
    current = get_settings()
    current.update(updates)
    current["PK"] = _PK
    current["SK"] = _SK
    put_item(current)
    current.pop("PK", None)
    current.pop("SK", None)
    return current
