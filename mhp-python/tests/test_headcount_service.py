from unittest.mock import patch
from app.services.headcount_service import get_headcount_report


# ---------------------------------------------------------------------------
# Shared test data
#
# 3 users: u1 + u2 in OFFICE, u3 WFH
# 2 teams: team-a (u1, u2), team-b (u3)
# Normal working day: LUNCH + SNACKS available (both default IN)
# ---------------------------------------------------------------------------

USERS = [
    {"id": "u1", "name": "Alice", "teamId": "team-a"},
    {"id": "u2", "name": "Bob",   "teamId": "team-a"},
    {"id": "u3", "name": "Carol", "teamId": "team-b"},
]

TEAMS = [
    {"id": "team-a", "name": "Team A"},
    {"id": "team-b", "name": "Team B"},
]

AVAILABLE_MEALS = [
    {"type": "LUNCH",  "default": "IN"},
    {"type": "SNACKS", "default": "IN"},
]

# location map — used by the get_effective_location mock
LOCATIONS = {
    "u1": "OFFICE",
    "u2": "OFFICE",
    "u3": "WFH",
}


def mock_location_fn(user_id, date_str):
    """Fake get_effective_location — returns from our LOCATIONS map."""
    return LOCATIONS[user_id]


# ---------------------------------------------------------------------------
# FIRST TEST — off day returns zero headcount
# ---------------------------------------------------------------------------

@patch("app.services.headcount_service.get_special_day")
@patch("app.services.headcount_service.get_available_meals")
def test_off_day_returns_zero_headcount(mock_meals, mock_special_day):
    # Arrange — off day means get_available_meals returns []
    mock_meals.return_value = []
    mock_special_day.return_value = None

    # Act
    result = get_headcount_report("2026-04-10")

    # Assert
    assert result["officeCount"] == 0
    assert result["wfhCount"] == 0
    assert result["meals"] == []


# ---------------------------------------------------------------------------
# SECOND TEST — default-IN meal, nobody opted out
#
# Setup:
#   u1, u2 → OFFICE
#   u3     → WFH (excluded from count)
#   No meal records → no one opted out
#
# Expected LUNCH headcount:
#   default IN → headcount = office users - opted out = 2 - 0 = 2
# ---------------------------------------------------------------------------

@patch("app.services.headcount_service.get_effective_location")
@patch("app.services.headcount_service.get_records_for_date")
@patch("app.services.headcount_service.get_all_teams")
@patch("app.services.headcount_service.get_all_users")
@patch("app.services.headcount_service.get_special_day")
@patch("app.services.headcount_service.get_available_meals")
def test_default_in_meal_no_optouts(
    mock_meals, mock_special_day, mock_users,
    mock_teams, mock_records, mock_location
):
    # Arrange
    mock_meals.return_value = AVAILABLE_MEALS
    mock_special_day.return_value = None
    mock_users.return_value = USERS
    mock_teams.return_value = TEAMS
    mock_records.return_value = []        # no one opted in or out
    mock_location.side_effect = mock_location_fn

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert — 2 office users, nobody opted out → headcount = 2
    lunch = next(m for m in result["meals"] if m["type"] == "LUNCH")
    assert lunch["headcount"] == 2


# ---------------------------------------------------------------------------
# THIRD TEST — WFH user's record is ignored
#
# Setup:
#   u1, u2 → OFFICE
#   u3     → WFH
#   u3 has an IN record for LUNCH — should NOT affect headcount
#
# Expected LUNCH headcount:
#   default IN → only office users count
#   u3 is WFH → ignored even though they opted IN
#   headcount = 2 (same as if u3 had no record at all)
# ---------------------------------------------------------------------------

@patch("app.services.headcount_service.get_effective_location")
@patch("app.services.headcount_service.get_records_for_date")
@patch("app.services.headcount_service.get_all_teams")
@patch("app.services.headcount_service.get_all_users")
@patch("app.services.headcount_service.get_special_day")
@patch("app.services.headcount_service.get_available_meals")
def test_wfh_user_excluded_from_headcount(
    mock_meals, mock_special_day, mock_users,
    mock_teams, mock_records, mock_location
):
    # Arrange
    mock_meals.return_value = AVAILABLE_MEALS
    mock_special_day.return_value = None
    mock_users.return_value = USERS
    mock_teams.return_value = TEAMS
    mock_records.return_value = [
        {"userId": "u3", "mealType": "LUNCH", "status": "IN"},  # WFH user opted IN
    ]
    mock_location.side_effect = mock_location_fn

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert — u3 is WFH so their IN record doesn't count
    lunch = next(m for m in result["meals"] if m["type"] == "LUNCH")
    assert lunch["headcount"] == 2


# ---------------------------------------------------------------------------
# FOURTH TEST — office user opts out, headcount drops
#
# Setup:
#   u1, u2 → OFFICE
#   u3     → WFH
#   u1 has an OUT record for LUNCH
#
# Expected LUNCH headcount:
#   default IN → headcount = office users - opted out = 2 - 1 = 1
# ---------------------------------------------------------------------------

@patch("app.services.headcount_service.get_effective_location")
@patch("app.services.headcount_service.get_records_for_date")
@patch("app.services.headcount_service.get_all_teams")
@patch("app.services.headcount_service.get_all_users")
@patch("app.services.headcount_service.get_special_day")
@patch("app.services.headcount_service.get_available_meals")
def test_default_in_meal_one_optout(
    mock_meals, mock_special_day, mock_users,
    mock_teams, mock_records, mock_location
):
    # Arrange
    mock_meals.return_value = AVAILABLE_MEALS
    mock_special_day.return_value = None
    mock_users.return_value = USERS
    mock_teams.return_value = TEAMS
    mock_records.return_value = [
        {"userId": "u1", "mealType": "LUNCH", "status": "OUT"},  # office user opted out
    ]
    mock_location.side_effect = mock_location_fn

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert
    lunch = next(m for m in result["meals"] if m["type"] == "LUNCH")
    assert lunch["headcount"] == 1


# ---------------------------------------------------------------------------
# FIFTH TEST — default-OUT meal, only explicit opt-ins count
#
# Setup:
#   u1, u2 → OFFICE
#   u3     → WFH
#   OPTIONAL_DINNER available (default OUT)
#   Only u1 opted IN to OPTIONAL_DINNER
#
# Expected OPTIONAL_DINNER headcount:
#   default OUT → headcount = only opted-in office users = 1
#   u2 has no record → default OUT → not counted
#   u3 opted IN but WFH → ignored
# ---------------------------------------------------------------------------

@patch("app.services.headcount_service.get_effective_location")
@patch("app.services.headcount_service.get_records_for_date")
@patch("app.services.headcount_service.get_all_teams")
@patch("app.services.headcount_service.get_all_users")
@patch("app.services.headcount_service.get_special_day")
@patch("app.services.headcount_service.get_available_meals")
def test_default_out_meal_counts_only_optins(
    mock_meals, mock_special_day, mock_users,
    mock_teams, mock_records, mock_location
):
    # Arrange — add OPTIONAL_DINNER to available meals
    mock_meals.return_value = [
        {"type": "LUNCH",           "default": "IN"},
        {"type": "OPTIONAL_DINNER", "default": "OUT"},
    ]
    mock_special_day.return_value = None
    mock_users.return_value = USERS
    mock_teams.return_value = TEAMS
    mock_records.return_value = [
        {"userId": "u1", "mealType": "OPTIONAL_DINNER", "status": "IN"},   # office, opted in
        {"userId": "u3", "mealType": "OPTIONAL_DINNER", "status": "IN"},   # WFH, opted in — ignored
    ]
    mock_location.side_effect = mock_location_fn

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert
    optional = next(m for m in result["meals"] if m["type"] == "OPTIONAL_DINNER")
    assert optional["headcount"] == 1


# ---------------------------------------------------------------------------
# SIXTH TEST — officeCount and wfhCount are correct
#
# Setup: u1, u2 OFFICE → u3 WFH
# Expected: officeCount=2, wfhCount=1, totalUsers=3
#
# Why test this separately from headcount?
# The formula uses office_user_ids to calculate meal headcount.
# officeCount/wfhCount are derived independently from the same location loop.
# A bug could make meal headcount correct but officeCount wrong — or vice versa.
# ---------------------------------------------------------------------------

@patch("app.services.headcount_service.get_effective_location")
@patch("app.services.headcount_service.get_records_for_date")
@patch("app.services.headcount_service.get_all_teams")
@patch("app.services.headcount_service.get_all_users")
@patch("app.services.headcount_service.get_special_day")
@patch("app.services.headcount_service.get_available_meals")
def test_office_and_wfh_counts(
    mock_meals, mock_special_day, mock_users,
    mock_teams, mock_records, mock_location
):
    # Arrange
    mock_meals.return_value = AVAILABLE_MEALS
    mock_special_day.return_value = None
    mock_users.return_value = USERS
    mock_teams.return_value = TEAMS
    mock_records.return_value = []
    mock_location.side_effect = mock_location_fn

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert
    assert result["totalUsers"]  == 3
    assert result["officeCount"] == 2
    assert result["wfhCount"]    == 1


# ---------------------------------------------------------------------------
# SEVENTH TEST — byTeam breakdown is correct
#
# Setup:
#   team-a: u1 (OFFICE), u2 (OFFICE) → officeCount=2, wfhCount=0
#   team-b: u3 (WFH)                 → officeCount=0, wfhCount=1
#
# Why test this?
# byTeam is built from a separate dict (team_stats) inside the service.
# A bug there wouldn't affect meal headcount at all — it needs its own test.
# ---------------------------------------------------------------------------

@patch("app.services.headcount_service.get_effective_location")
@patch("app.services.headcount_service.get_records_for_date")
@patch("app.services.headcount_service.get_all_teams")
@patch("app.services.headcount_service.get_all_users")
@patch("app.services.headcount_service.get_special_day")
@patch("app.services.headcount_service.get_available_meals")
def test_by_team_breakdown(
    mock_meals, mock_special_day, mock_users,
    mock_teams, mock_records, mock_location
):
    # Arrange
    mock_meals.return_value = AVAILABLE_MEALS
    mock_special_day.return_value = None
    mock_users.return_value = USERS
    mock_teams.return_value = TEAMS
    mock_records.return_value = []
    mock_location.side_effect = mock_location_fn

    # Act
    result = get_headcount_report("2026-04-06")

    # Assert — find each team in byTeam list
    team_a = next(t for t in result["byTeam"] if t["teamId"] == "team-a")
    team_b = next(t for t in result["byTeam"] if t["teamId"] == "team-b")

    assert team_a["officeCount"] == 2
    assert team_a["wfhCount"]    == 0
    assert team_b["officeCount"] == 0
    assert team_b["wfhCount"]    == 1
