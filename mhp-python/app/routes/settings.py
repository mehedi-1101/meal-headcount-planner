from fastapi import APIRouter, Depends

from app.auth import get_current_user, require_roles
from app.constants import Roles
from app.models import SettingsRequest
from app.services.settings_service import get_settings, update_settings

router = APIRouter()


@router.get("")
def read_settings(user: dict = Depends(get_current_user)):
    return get_settings()


@router.put("")
def write_settings(
    body: SettingsRequest,
    user: dict = Depends(require_roles([Roles.ADMIN])),
):
    updates = body.model_dump(exclude_none=True)
    return update_settings(updates)
