from datetime import date as DateType, timedelta
from fastapi import APIRouter, Depends

from app.auth import require_roles
from app.constants import Roles
from app.services.headcount_service import get_headcount_report
from app.services.special_day_service import get_special_days_for_month

router = APIRouter()

_ALLOWED = [Roles.ADMIN, Roles.LOGISTICS]


@router.get("/operational")
def operational(user: dict = Depends(require_roles(_ALLOWED))):
    today = DateType.today()
    tomorrow = today + timedelta(days=1)

    # Upcoming special days — next 14 days
    upcoming_special = []
    for i in range(14):
        d = (today + timedelta(days=i)).isoformat()
        from app.services.special_day_service import get_special_day
        sd = get_special_day(d)
        if sd:
            upcoming_special.append(sd)

    return {
        "today": get_headcount_report(today.isoformat()),
        "tomorrow": get_headcount_report(tomorrow.isoformat()),
        "upcomingSpecialDays": upcoming_special,
    }
