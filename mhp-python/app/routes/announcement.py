from fastapi import APIRouter, Depends
from datetime import date as DateType

from app.auth import require_roles
from app.constants import Roles
from app.services.announcement_service import generate_announcement

router = APIRouter()


@router.get("")
def announcement(date: str = None, user: dict = Depends(require_roles([Roles.ADMIN, Roles.LOGISTICS]))):
    target = date or DateType.today().isoformat()
    text = generate_announcement(target)
    return {"date": target, "text": text}
