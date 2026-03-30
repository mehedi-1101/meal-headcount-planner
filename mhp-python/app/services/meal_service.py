"""
Meal participation service.
PK=DATE#<date>, SK=MEAL#<userId>#<mealType>
"""

from datetime import date as DateType
from app.database import get_item, put_item, query_by_pk, date_pk, meal_sk


def today() -> str:
    return DateType.today().isoformat()


def get_records_for_date(date_str: str) -> list[dict]:
    """All meal participation records for a date."""
    items = query_by_pk(date_pk(date_str), "MEAL#")
    for item in items:
        item.pop("PK", None)
        item.pop("SK", None)
    return items


def get_user_meal_status(user_id: str, available_meals: list[dict], date_str: str) -> dict:
    """
    Returns { LUNCH: "IN", SNACKS: "OUT", ... } for a user on a date.
    Falls back to the meal's default when no explicit record exists.
    """
    records = get_records_for_date(date_str)
    record_map = {r["mealType"]: r["status"] for r in records if r["userId"] == user_id}

    return {
        meal["type"]: record_map.get(meal["type"], meal["default"])
        for meal in available_meals
    }


def _upsert(user_id: str, meal_type: str, status: str, updated_by: str, date_str: str):
    from datetime import datetime, timezone
    item = {
        "PK": date_pk(date_str),
        "SK": meal_sk(user_id, meal_type),
        "userId": user_id,
        "date": date_str,
        "mealType": meal_type,
        "status": status,
        "updatedBy": updated_by,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    put_item(item)


def opt_out(user_id: str, meal_type: str, updated_by: str, date_str: str | None = None):
    _upsert(user_id, meal_type, "OUT", updated_by, date_str or today())


def opt_in(user_id: str, meal_type: str, updated_by: str, date_str: str | None = None):
    _upsert(user_id, meal_type, "IN", updated_by, date_str or today())
