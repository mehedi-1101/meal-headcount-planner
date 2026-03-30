"""
Audit service.
PK=AUDIT#<YYYY-MM>, SK=LOG#<iso-timestamp>#<actorId>

Audit entries are append-only — we never delete or update them.
Monthly partitioning: each month's entries share the same PK so one
Query fetches all entries for a month without scanning the whole table.
"""

from datetime import datetime, timezone
import uuid
from app.database import put_item, query_by_pk, audit_pk, audit_sk
from app.constants import Roles


def log_action(
    actor_id: str,
    actor_name: str,
    target_user_id: str | None,
    action_type: str,
    details: dict,
):
    """
    Append an audit entry. Non-blocking by design — callers should catch
    exceptions so a failed audit write never breaks the main operation.

    action_type values (match Node.js):
      MEAL_OPT_OUT | MEAL_OPT_IN | MEAL_OVERRIDE | BULK_OVERRIDE |
      LOCATION_CHANGE | LOCATION_OVERRIDE
    """
    now = datetime.now(timezone.utc)
    timestamp = now.isoformat()

    # Partition by the *event's* date (not the write timestamp) so reads
    # always land in the same partition regardless of server timezone.
    event_date = details.get("date") or details.get("startDate", "")
    month = event_date[:7] if event_date else now.strftime("%Y-%m")

    item = {
        "PK": audit_pk(month),
        "SK": audit_sk(timestamp, actor_id),
        "id": str(uuid.uuid4()),
        "timestamp": timestamp,
        "actorId": actor_id,
        "actorName": actor_name,
        "targetUserId": target_user_id,
        "actionType": action_type,
        "details": details,
    }
    put_item(item)


def get_audit_entries(
    user_id: str | None,
    date_str: str | None,
    actor_role: str,
    actor_team_id: str | None,
) -> list[dict]:
    """
    Fetch audit entries scoped by role.
    TL sees only their team members; ADMIN/LOGISTICS see all.
    """
    from app.services.user_service import get_team_members

    # Determine which month to read
    if date_str:
        month = date_str[:7]
    else:
        month = datetime.now(timezone.utc).strftime("%Y-%m")

    items = query_by_pk(audit_pk(month), "LOG#")

    # Filter by target user
    if user_id:
        items = [i for i in items if i.get("targetUserId") == user_id]

    # Filter by date
    if date_str:
        items = [i for i in items if i.get("details", {}).get("date") == date_str]

    # Team Lead: only see entries for their own team members
    if actor_role == Roles.TEAM_LEAD and actor_team_id:
        member_ids = {u["id"] for u in get_team_members(actor_team_id)}
        items = [i for i in items if i.get("targetUserId") in member_ids]

    # Strip DynamoDB keys
    for item in items:
        item.pop("PK", None)
        item.pop("SK", None)

    return sorted(items, key=lambda x: x["timestamp"])
