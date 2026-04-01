"""
Special day service.
PK=DATE#<date>, SK=SPECIAL
"""

from datetime import datetime, timezone
from app.database import get_item, put_item, delete_item, query_by_pk, date_pk


def get_special_day(date: str) -> dict | None:
    item = get_item(date_pk(date), "SPECIAL")
    if not item:
        return None
    item.pop("PK", None)
    item.pop("SK", None)
    return item


def get_special_days_for_month(month: str) -> list[dict]:
    """
    DynamoDB doesn't have a native 'month' filter, so we query all DATE#
    items that start with the month prefix and filter for SK=SPECIAL.
    This is a scan with filter — acceptable for small datasets.
    """
    from app.database import scan_with_filter
    from boto3.dynamodb.conditions import Attr

    items = scan_with_filter(
        Attr("SK").eq("SPECIAL") & Attr("PK").begins_with(f"DATE#{month}")
    )
    for item in items:
        item.pop("PK", None)
        item.pop("SK", None)
    return sorted(items, key=lambda x: x["date"])


def create_special_day(data: dict) -> dict:
    data.setdefault("note", "")
    data.setdefault("meals", [])
    data["createdAt"] = datetime.now(timezone.utc).isoformat()
    item = {
        "PK": date_pk(data["date"]),
        "SK": "SPECIAL",
        **data,
    }
    put_item(item)
    return data


def update_special_day(date: str, updates: dict) -> dict:
    existing = get_special_day(date)
    if not existing:
        return None
    existing.update(updates)
    existing["date"] = date
    existing["updatedAt"] = datetime.now(timezone.utc).isoformat()
    item = {"PK": date_pk(date), "SK": "SPECIAL", **existing}
    put_item(item)
    existing.pop("PK", None)
    existing.pop("SK", None)
    return existing


def delete_special_day(date: str) -> bool:
    existing = get_special_day(date)
    if not existing:
        return False
    delete_item(date_pk(date), "SPECIAL")
    return True
