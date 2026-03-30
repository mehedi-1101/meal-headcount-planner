from fastapi import APIRouter, Depends, HTTPException
from datetime import date as DateType

from app.auth import get_current_user
from app.constants import Roles
from app.services.work_location_service import get_monthly_wfh_usage
from app.services.user_service import get_all_users, get_team_members
from app.services.settings_service import get_settings

router = APIRouter()


@router.get("/wfh-overage")
def wfh_overage(month: str, user: dict = Depends(get_current_user)):
    if user["role"] == Roles.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Employees cannot view WFH overage reports")

    settings = get_settings()
    allowance = settings.get("monthlyWfhAllowance", 5)

    if user["role"] == Roles.TEAM_LEAD:
        user_list = get_team_members(user["teamId"])
    else:
        user_list = get_all_users()

    usage = get_monthly_wfh_usage(user_list, month, allowance)
    over = [u for u in usage if u["overLimit"]]

    return {
        "month": month,
        "allowance": allowance,
        "overageCount": len(over),
        "users": over,
    }
