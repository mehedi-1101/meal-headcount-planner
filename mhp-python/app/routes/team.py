from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.constants import Roles
from app.services.user_service import get_all_teams, get_all_users, get_team_members
from app.services.availability_service import get_available_meals
from app.services.meal_service import get_user_meal_status
from app.services.work_location_service import get_effective_location

router = APIRouter()


@router.get("/")
def list_teams(user: dict = Depends(get_current_user)):
    return get_all_teams()


@router.get("/participation")
def team_participation(date: str, user: dict = Depends(get_current_user)):
    """
    Returns per-user participation for a date, scoped by role:
    - ADMIN: all users
    - TEAM_LEAD: own team only
    - LOGISTICS: all users but names are hidden (aggregated view)
    - EMPLOYEE: 403 (no access)
    """
    from fastapi import HTTPException
    if user["role"] == Roles.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Employees cannot view team participation")

    available = get_available_meals(date)

    if user["role"] == Roles.TEAM_LEAD:
        users = get_team_members(user["teamId"])
    else:
        users = get_all_users()

    result = []
    for u in users:
        meal_status = get_user_meal_status(u["id"], available, date)
        location = get_effective_location(u["id"], date)
        entry = {
            "userId": u["id"],
            "name": u["name"] if user["role"] != Roles.LOGISTICS else "—",
            "teamId": u.get("teamId"),
            "location": location,
            "meals": meal_status,
        }
        result.append(entry)

    return {"date": date, "users": result}
