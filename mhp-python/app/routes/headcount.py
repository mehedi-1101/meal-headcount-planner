from datetime import date as DateType, timedelta
from fastapi import APIRouter, Depends

from app.auth import require_roles
from app.constants import Roles
from app.services.headcount_service import get_headcount_report

router = APIRouter()

_ALLOWED = [Roles.ADMIN, Roles.LOGISTICS]


@router.get("/")
def headcount(date: str, user: dict = Depends(require_roles(_ALLOWED))):
    return get_headcount_report(date)


@router.get("/forecast")
def forecast(startDate: str, endDate: str, user: dict = Depends(require_roles(_ALLOWED))):
    results = []
    current = DateType.fromisoformat(startDate)
    end = DateType.fromisoformat(endDate)
    while current <= end:
        results.append(get_headcount_report(current.isoformat()))
        current += timedelta(days=1)
    return results
