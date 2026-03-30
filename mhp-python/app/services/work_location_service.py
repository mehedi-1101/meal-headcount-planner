"""
Work location service.
PK=DATE#<date>, SK=LOC#<userId>

Location resolution order (same as Node.js):
  1. Individual record exists → use it
  2. Company WFH period active → WFH
  3. Default → OFFICE
"""

from datetime import date as DateType, datetime, timezone
from app.database import get_item, put_item, query_by_pk, date_pk, location_sk
from app.constants import Locations
from app.services.settings_service import get_settings


def get_effective_location(user_id: str, date_str: str) -> str:
    item = get_item(date_pk(date_str), location_sk(user_id))
    if item:
        return item["location"]

    settings = get_settings()
    for period in settings.get("companyWfhPeriods", []):
        if period["startDate"] <= date_str <= period["endDate"]:
            return Locations.WFH

    return Locations.OFFICE


def set_location(user_id: str, date_str: str, location: str, updated_by: str):
    item = {
        "PK": date_pk(date_str),
        "SK": location_sk(user_id),
        "userId": user_id,
        "date": date_str,
        "location": location,
        "updatedBy": updated_by,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    put_item(item)


def get_location_record(user_id: str, date_str: str) -> dict | None:
    item = get_item(date_pk(date_str), location_sk(user_id))
    if not item:
        return None
    item.pop("PK", None)
    item.pop("SK", None)
    return item


def get_all_locations_for_date(date_str: str) -> list[dict]:
    """All location records for a date — used by headcount service."""
    items = query_by_pk(date_pk(date_str), "LOC#")
    for item in items:
        item.pop("PK", None)
        item.pop("SK", None)
    return items


def get_monthly_wfh_usage(user_list: list[dict], month: str, allowance: int) -> list[dict]:
    """
    Count WFH days per user for a calendar month.
    month = "YYYY-MM"
    Note: we scan each user's dates for the month. This works fine at 100 users.
    """
    from app.database import scan_with_filter
    from boto3.dynamodb.conditions import Attr

    # Fetch all LOC records for the month in one scan
    items = scan_with_filter(
        Attr("SK").begins_with("LOC#") & Attr("date").begins_with(month)
    )

    # Build a map: userId → wfh day count
    wfh_counts: dict[str, int] = {}
    for item in items:
        if item.get("location") == Locations.WFH:
            uid = item["userId"]
            wfh_counts[uid] = wfh_counts.get(uid, 0) + 1

    result = []
    for user in user_list:
        wfh_days = wfh_counts.get(user["id"], 0)
        over_limit = wfh_days > allowance
        entry = {
            "userId": user["id"],
            "name": user["name"],
            "teamId": user.get("teamId"),
            "wfhDays": wfh_days,
            "overLimit": over_limit,
        }
        if over_limit:
            entry["extraDays"] = wfh_days - allowance
        result.append(entry)
    return result
