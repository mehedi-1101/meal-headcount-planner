from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_roles
from app.constants import Roles, SpecialDayTypes
from app.models import SpecialDayRequest
from app.services.special_day_service import (
    get_special_days_for_month, create_special_day, update_special_day, delete_special_day, get_special_day,
)

router = APIRouter()

_ALLOWED = [Roles.ADMIN, Roles.LOGISTICS]


@router.get("")
def list_special_days(month: str = None, user: dict = Depends(require_roles(_ALLOWED))):
    from datetime import date as DateType
    m = month or DateType.today().strftime("%Y-%m")
    return get_special_days_for_month(m)


@router.post("")
def create(body: SpecialDayRequest, user: dict = Depends(require_roles(_ALLOWED))):
    if body.type not in (SpecialDayTypes.OFFICE_CLOSED, SpecialDayTypes.GOVT_HOLIDAY, SpecialDayTypes.CELEBRATION):
        raise HTTPException(status_code=400, detail="Invalid special day type")

    existing = get_special_day(body.date)
    if existing:
        raise HTTPException(status_code=400, detail=f"A special day already exists for {body.date}")

    data = body.model_dump(exclude_none=True)
    data["createdBy"] = user["id"]
    return create_special_day(data)


@router.put("/{date}")
def update(date: str, body: SpecialDayRequest, user: dict = Depends(require_roles(_ALLOWED))):
    result = update_special_day(date, body.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail=f"No special day found for {date}")
    return result


@router.delete("/{date}")
def delete(date: str, user: dict = Depends(require_roles(_ALLOWED))):
    if not delete_special_day(date):
        raise HTTPException(status_code=404, detail=f"No special day found for {date}")
    return {"message": f"Special day {date} deleted"}
