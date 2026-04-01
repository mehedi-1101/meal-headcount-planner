from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.constants import Roles
from app.services.audit_service import get_audit_entries

router = APIRouter()


@router.get("")
def get_audit(
    userId: str = None,
    date: str = None,
    user: dict = Depends(get_current_user),
):
    if user["role"] == Roles.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Employees cannot view audit logs")

    entries = get_audit_entries(
        user_id=userId,
        date_str=date,
        actor_role=user["role"],
        actor_team_id=user.get("teamId"),
    )
    return {"userId": userId, "date": date, "entries": entries}
