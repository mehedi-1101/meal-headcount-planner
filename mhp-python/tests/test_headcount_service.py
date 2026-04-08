from unittest.mock import patch
from app.services.headcount_service import get_headcount_report
from tests.conftest import AVAILABLE_MEALS


# ---------------------------------------------------------------------------
# FIRST TEST — off day returns zero headcount
#
# This test doesn't use the headcount_mocks fixture because an off day
# returns early — get_available_meals returns [] and the rest never runs.
# Only two patches needed here.
# ---------------------------------------------------------------------------

@patch("app.services.headcount_service.get_special_day")
@patch("app.services.headcount_service.get_available_meals")
def test_off_day_returns_zero_headcount(mock_meals, mock_special_day):
    # Arrange
    mock_meals.return_value = []
    mock_special_day.return_value = None

    # Act
    result = get_headcount_report("2026-04-10")

    # Assert
    assert result["officeCount"] == 0
    assert result["wfhCount"]    == 0
    assert result["meals"]       == []


# ---------------------------------------------------------------------------
# SECOND TEST — default-IN meal, nobody opted out
#
# u1, u2 OFFICE, u3 WFH, no records → headcount = 2
# ---------------------------------------------------------------------------

def test_default_in_meal_no_optouts(headcount_mocks):
    # Arrange — only set meals, everything else uses fixture defaults
    headcount_mocks["meals"].return_value = AVAILABLE_MEALS

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert
    lunch = next(m for m in result["meals"] if m["type"] == "LUNCH")
    assert lunch["headcount"] == 2


# ---------------------------------------------------------------------------
# THIRD TEST — WFH user's record is ignored
#
# u3 is WFH and opts IN — should not affect headcount
# ---------------------------------------------------------------------------

def test_wfh_user_excluded_from_headcount(headcount_mocks):
    # Arrange
    headcount_mocks["meals"].return_value = AVAILABLE_MEALS
    headcount_mocks["records"].return_value = [
        {"userId": "u3", "mealType": "LUNCH", "status": "IN"},  # WFH user opted IN
    ]

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert — u3 is WFH so their IN record doesn't count
    lunch = next(m for m in result["meals"] if m["type"] == "LUNCH")
    assert lunch["headcount"] == 2


# ---------------------------------------------------------------------------
# FOURTH TEST — office user opts out, headcount drops
#
# u1 opted OUT → headcount = 2 - 1 = 1
# ---------------------------------------------------------------------------

def test_default_in_meal_one_optout(headcount_mocks):
    # Arrange
    headcount_mocks["meals"].return_value = AVAILABLE_MEALS
    headcount_mocks["records"].return_value = [
        {"userId": "u1", "mealType": "LUNCH", "status": "OUT"},
    ]

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert
    lunch = next(m for m in result["meals"] if m["type"] == "LUNCH")
    assert lunch["headcount"] == 1


# ---------------------------------------------------------------------------
# FIFTH TEST — default-OUT meal, only explicit opt-ins count
#
# u1 OFFICE opted IN, u3 WFH opted IN → only u1 counts → headcount = 1
# ---------------------------------------------------------------------------

def test_default_out_meal_counts_only_optins(headcount_mocks):
    # Arrange
    headcount_mocks["meals"].return_value = [
        {"type": "LUNCH",           "default": "IN"},
        {"type": "OPTIONAL_DINNER", "default": "OUT"},
    ]
    headcount_mocks["records"].return_value = [
        {"userId": "u1", "mealType": "OPTIONAL_DINNER", "status": "IN"},  # office, opted in
        {"userId": "u3", "mealType": "OPTIONAL_DINNER", "status": "IN"},  # WFH — ignored
    ]

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert
    optional = next(m for m in result["meals"] if m["type"] == "OPTIONAL_DINNER")
    assert optional["headcount"] == 1


# ---------------------------------------------------------------------------
# SIXTH TEST — officeCount and wfhCount are correct
# ---------------------------------------------------------------------------

def test_office_and_wfh_counts(headcount_mocks):
    # Arrange
    headcount_mocks["meals"].return_value = AVAILABLE_MEALS

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert
    assert result["totalUsers"]  == 3
    assert result["officeCount"] == 2
    assert result["wfhCount"]    == 1


# ---------------------------------------------------------------------------
# SEVENTH TEST — byTeam breakdown is correct
# ---------------------------------------------------------------------------

def test_by_team_breakdown(headcount_mocks):
    # Arrange
    headcount_mocks["meals"].return_value = AVAILABLE_MEALS

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert
    team_a = next(t for t in result["byTeam"] if t["teamId"] == "team-a")
    team_b = next(t for t in result["byTeam"] if t["teamId"] == "team-b")

    assert team_a["officeCount"] == 2
    assert team_a["wfhCount"]    == 0
    assert team_b["officeCount"] == 0
    assert team_b["wfhCount"]    == 1
