from datetime import date as DateType, datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status

from app.auth import get_current_user, require_roles
from app.constants import Roles, MealTypes
from app.models import OptMealRequest, MealOverrideRequest, BulkOverrideRequest
from app.services.availability_service import get_available_meals
from app.services.meal_service import opt_in, opt_out, get_user_meal_status
from app.services.user_service import get_user_by_id
from app.services.settings_service import get_settings
from app.services.audit_service import log_action

router = APIRouter()


def today() -> str:
    return DateType.today().isoformat()


def _check_cutoff(target_date: str, user_role: str):
    """
    Block EMPLOYEE and LOGISTICS after 21:00 the day before target date.
    TL and ADMIN bypass this entirely.
    Cutoff is hardcoded to 21:00 in the Python version (not read from
    settings) to avoid an extra DB read on every mutation.
    """
    if user_role in (Roles.TEAM_LEAD, Roles.ADMIN):
        return
    y, m, d = map(int, target_date.split("-"))
    cutoff = datetime(y, m, d - 1, 21, 0, 0, tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > cutoff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Changes for {target_date} are locked (cutoff was 21:00 the day before).",
        )


def _check_forward_window(target_date: str, user_role: str):
    """EMPLOYEE cannot plan beyond maxForwardPlanningDays days ahead."""
    if user_role != Roles.EMPLOYEE:
        return
    max_days = get_settings().get("maxForwardPlanningDays", 14)
    delta = (DateType.fromisoformat(target_date) - DateType.today()).days
    if delta > max_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date is beyond the allowed forward planning window.",
        )


def _check_past(target_date: str):
    if target_date < today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify records for past dates.")


@router.get("")
def get_meals(date: str, user: dict = Depends(get_current_user)):
    available = get_available_meals(date)
    user_status = get_user_meal_status(user["id"], available, date)
    meals = [{"type": m["type"], "default": m["default"], "status": user_status[m["type"]]} for m in available]
    return {"date": date, "meals": meals}


@router.post("/{meal_type}/opt-out")
def meal_opt_out(meal_type: str, body: OptMealRequest, user: dict = Depends(get_current_user)):
    target_date = body.date or today()
    if meal_type not in MealTypes.ALL:
        raise HTTPException(status_code=400, detail=f"Invalid meal type: {meal_type}")
    _check_past(target_date)
    _check_cutoff(target_date, user["role"])
    _check_forward_window(target_date, user["role"])

    available = get_available_meals(target_date)
    if not available:
        raise HTTPException(status_code=400, detail="No meals available on this date.")
    if not any(m["type"] == meal_type for m in available):
        raise HTTPException(status_code=400, detail=f"{meal_type} is not available on {target_date}.")

    opt_out(user["id"], meal_type, user["id"], target_date)
    try:
        log_action(user["id"], user["name"], user["id"], "MEAL_OPT_OUT", {"date": target_date, "mealType": meal_type})
    except Exception:
        pass
    return {"message": f"Opted out of {meal_type}"}


@router.post("/{meal_type}/opt-in")
def meal_opt_in(meal_type: str, body: OptMealRequest, user: dict = Depends(get_current_user)):
    target_date = body.date or today()
    if meal_type not in MealTypes.ALL:
        raise HTTPException(status_code=400, detail=f"Invalid meal type: {meal_type}")
    _check_past(target_date)
    _check_cutoff(target_date, user["role"])
    _check_forward_window(target_date, user["role"])

    available = get_available_meals(target_date)
    if not available:
        raise HTTPException(status_code=400, detail="No meals available on this date.")
    if not any(m["type"] == meal_type for m in available):
        raise HTTPException(status_code=400, detail=f"{meal_type} is not available on {target_date}.")

    opt_in(user["id"], meal_type, user["id"], target_date)
    try:
        log_action(user["id"], user["name"], user["id"], "MEAL_OPT_IN", {"date": target_date, "mealType": meal_type})
    except Exception:
        pass
    return {"message": f"Opted in to {meal_type}"}


@router.post("/override")
def meal_override(
    body: MealOverrideRequest,
    user: dict = Depends(require_roles([Roles.TEAM_LEAD, Roles.ADMIN])),
):
    target_date = body.date or today()
    if body.mealType not in MealTypes.ALL:
        raise HTTPException(status_code=400, detail=f"Invalid meal type: {body.mealType}")
    if body.status not in ("IN", "OUT"):
        raise HTTPException(status_code=400, detail="status must be IN or OUT")

    target_user = get_user_by_id(body.targetUserId)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    # TL can only override their own team
    if user["role"] == Roles.TEAM_LEAD and user["teamId"] != target_user.get("teamId"):
        raise HTTPException(status_code=403, detail="Team Leads can only override their own team members")

    if body.status == "OUT":
        opt_out(body.targetUserId, body.mealType, user["id"], target_date)
    else:
        opt_in(body.targetUserId, body.mealType, user["id"], target_date)

    try:
        log_action(user["id"], user["name"], body.targetUserId, "MEAL_OVERRIDE",
                   {"date": target_date, "mealType": body.mealType, "status": body.status})
    except Exception:
        pass
    return {"message": f"Overrode {target_user['name']}'s {body.mealType} to {body.status}"}


@router.post("/bulk-override")
def bulk_override(
    body: BulkOverrideRequest,
    user: dict = Depends(require_roles([Roles.TEAM_LEAD, Roles.ADMIN])),
):
    if body.status not in ("IN", "OUT"):
        raise HTTPException(status_code=400, detail="status must be IN or OUT")
    if body.startDate > body.endDate:
        raise HTTPException(status_code=400, detail="startDate must be <= endDate")
    for mt in body.mealTypes:
        if mt not in MealTypes.ALL:
            raise HTTPException(status_code=400, detail=f"Invalid meal type: {mt}")

    target_users = []
    for uid in body.userIds:
        u = get_user_by_id(uid)
        if not u:
            raise HTTPException(status_code=404, detail=f"User not found: {uid}")
        target_users.append(u)

    if user["role"] == Roles.TEAM_LEAD:
        out_of_scope = next((u for u in target_users if u.get("teamId") != user["teamId"]), None)
        if out_of_scope:
            raise HTTPException(status_code=403, detail="Team Leads can only bulk override their own team members")

    # Build date range
    dates = []
    current = DateType.fromisoformat(body.startDate)
    end = DateType.fromisoformat(body.endDate)
    while current <= end:
        dates.append(current.isoformat())
        from datetime import timedelta
        current += timedelta(days=1)

    action = opt_out if body.status == "OUT" else opt_in
    count = 0
    for d in dates:
        for uid in body.userIds:
            for mt in body.mealTypes:
                action(uid, mt, user["id"], d)
                count += 1

    try:
        log_action(user["id"], user["name"], None, "BULK_OVERRIDE",
                   {"startDate": body.startDate, "endDate": body.endDate,
                    "mealTypes": body.mealTypes, "status": body.status, "userIds": body.userIds})
    except Exception:
        pass
    return {"message": f"Applied {count} overrides", "count": count}
