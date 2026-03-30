"""
Pydantic models — request bodies and response shapes.

Pydantic validates incoming JSON automatically. If a required field is
missing or the wrong type, FastAPI returns a 422 before your code runs.
"""

from typing import Optional
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    username: str
    role: str
    teamId: Optional[str] = None


class LoginResponse(BaseModel):
    user: UserResponse
    token: str


# ---------------------------------------------------------------------------
# Meals
# ---------------------------------------------------------------------------

class OptMealRequest(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD; defaults to today if omitted


class MealOverrideRequest(BaseModel):
    targetUserId: str
    mealType: str
    status: str   # "IN" or "OUT"
    date: Optional[str] = None


class BulkOverrideRequest(BaseModel):
    userIds: list[str]
    mealTypes: list[str]
    status: str        # "IN" or "OUT"
    startDate: str     # YYYY-MM-DD
    endDate: str       # YYYY-MM-DD


# ---------------------------------------------------------------------------
# Work Location
# ---------------------------------------------------------------------------

class SetLocationRequest(BaseModel):
    date: str          # YYYY-MM-DD
    location: str      # "OFFICE" or "WFH"


class LocationOverrideRequest(BaseModel):
    targetUserId: str
    date: str
    location: str


# ---------------------------------------------------------------------------
# Special Days
# ---------------------------------------------------------------------------

class SpecialDayRequest(BaseModel):
    date: str
    type: str                          # OFFICE_CLOSED | GOVT_HOLIDAY | CELEBRATION
    note: Optional[str] = None
    meals: Optional[list[str]] = None  # only for CELEBRATION: EVENT_DINNER / OPTIONAL_DINNER


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

class Period(BaseModel):
    startDate: str
    endDate: str


class SettingsRequest(BaseModel):
    cutoffTime: Optional[str] = None           # HH:mm
    offDays: Optional[list[int]] = None        # 0=Sun … 6=Sat
    iftarPeriods: Optional[list[Period]] = None
    companyWfhPeriods: Optional[list[Period]] = None
    maxForwardPlanningDays: Optional[int] = None
    monthlyWfhAllowance: Optional[int] = None
