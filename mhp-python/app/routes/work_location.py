from datetime import date as DateType
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user, require_roles
from app.constants import Roles, Locations
from app.models import SetLocationRequest, LocationOverrideRequest
from app.services.work_location_service import (
    get_effective_location, set_location, get_location_record, get_monthly_wfh_usage,
)
from app.services.user_service import get_user_by_id, get_all_users, get_team_members
from app.services.settings_service import get_settings
from app.services.audit_service import log_action

router = APIRouter()


def today() -> str:
    return DateType.today().isoformat()


def _check_past(target_date: str):
    if target_date < today():
        raise HTTPException(status_code=400, detail="Cannot modify records for past dates.")


@router.get("/")
def get_location(userId: str, date: str, user: dict = Depends(get_current_user)):
    location = get_effective_location(userId, date)
    record = get_location_record(userId, date)
    return {"userId": userId, "date": date, "location": location, "record": record}


@router.post("/")
def set_own_location(body: SetLocationRequest, user: dict = Depends(get_current_user)):
    if body.location not in (Locations.OFFICE, Locations.WFH):
        raise HTTPException(status_code=400, detail="location must be OFFICE or WFH")
    _check_past(body.date)

    set_location(user["id"], body.date, body.location, user["id"])
    try:
        log_action(user["id"], user["name"], user["id"], "LOCATION_CHANGE",
                   {"date": body.date, "location": body.location})
    except Exception:
        pass
    return {"message": f"Location set to {body.location} for {body.date}"}


@router.post("/override")
def override_location(
    body: LocationOverrideRequest,
    user: dict = Depends(require_roles([Roles.TEAM_LEAD, Roles.ADMIN])),
):
    if body.location not in (Locations.OFFICE, Locations.WFH):
        raise HTTPException(status_code=400, detail="location must be OFFICE or WFH")

    target_user = get_user_by_id(body.targetUserId)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    if user["role"] == Roles.TEAM_LEAD and user["teamId"] != target_user.get("teamId"):
        raise HTTPException(status_code=403, detail="Team Leads can only override their own team members")

    set_location(body.targetUserId, body.date, body.location, user["id"])
    try:
        log_action(user["id"], user["name"], body.targetUserId, "LOCATION_OVERRIDE",
                   {"date": body.date, "location": body.location})
    except Exception:
        pass
    return {"message": f"Overrode {target_user['name']}'s location to {body.location}"}


@router.get("/monthly-usage")
def monthly_usage(month: str, user: dict = Depends(get_current_user)):
    """
    Return WFH day counts for a month.
    Scoped by role: TL → own team, ADMIN/LOGISTICS → all, EMPLOYEE → own only.
    """
    settings = get_settings()
    allowance = settings.get("monthlyWfhAllowance", 5)

    if user["role"] == Roles.EMPLOYEE:
        user_obj = get_user_by_id(user["id"])
        user_list = [user_obj] if user_obj else []
    elif user["role"] == Roles.TEAM_LEAD:
        user_list = get_team_members(user["teamId"])
    else:
        user_list = get_all_users()

    return get_monthly_wfh_usage(user_list, month, allowance)
