"""
User service — fetch users and teams from DynamoDB.

User items:  PK=USER#<id>, SK=PROFILE
Team data is stored as a field on user records (teamId).
Teams themselves are stored as PK=TEAM#<id>, SK=PROFILE.
"""

from app.database import get_item, put_item, scan_with_filter
from boto3.dynamodb.conditions import Attr


def get_user_by_id(user_id: str) -> dict | None:
    item = get_item(f"USER#{user_id}", "PROFILE")
    if not item:
        return None
    item.pop("PK", None)
    item.pop("SK", None)
    return item


def get_user_by_username(username: str) -> dict | None:
    """
    Scan for a user by username. This is the only place we scan the whole
    table — acceptable at 100 users. At larger scale, add a GSI on username.
    """
    items = scan_with_filter(
        Attr("username").eq(username) & Attr("SK").eq("PROFILE")
    )
    if not items:
        return None
    item = items[0]
    item.pop("PK", None)
    item.pop("SK", None)
    return item


def get_all_users() -> list[dict]:
    """Scan all USER# PROFILE items."""
    items = scan_with_filter(
        Attr("SK").eq("PROFILE") & Attr("PK").begins_with("USER#")
    )
    for item in items:
        item.pop("PK", None)
        item.pop("SK", None)
    return items


def get_all_teams() -> list[dict]:
    """Scan all TEAM# PROFILE items."""
    items = scan_with_filter(
        Attr("SK").eq("PROFILE") & Attr("PK").begins_with("TEAM#")
    )
    for item in items:
        item.pop("PK", None)
        item.pop("SK", None)
    return items


def get_team_members(team_id: str) -> list[dict]:
    users = get_all_users()
    return [u for u in users if u.get("teamId") == team_id]
