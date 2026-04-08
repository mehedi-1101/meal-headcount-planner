"""
Shared fixtures for all test files.
pytest loads this file automatically — no import needed in test files.
"""

import pytest
from unittest.mock import patch


# ---------------------------------------------------------------------------
# Shared test data — defined here so both test files can use them
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

LOCATIONS = {
    "u1": "OFFICE",
    "u2": "OFFICE",
    "u3": "WFH",
}


def mock_location_fn(user_id, date_str):
    """Fake get_effective_location — returns from LOCATIONS map."""
    return LOCATIONS[user_id]


# ---------------------------------------------------------------------------
# Fixture for headcount_service tests
#
# Patches all 6 external calls that get_headcount_report() makes.
# Sets sensible defaults — each test only overrides what it needs.
#
# Yields a dict of the mocks that tests care about:
#   - "meals"    → control which meals are available
#   - "records"  → control who opted in/out
#   - "location" → control office/WFH per user (uses side_effect by default)
#
# special_day, users, teams are set to defaults and rarely need changing.
# ---------------------------------------------------------------------------

@pytest.fixture
def headcount_mocks():
    with patch("app.services.headcount_service.get_available_meals")     as mock_meals, \
         patch("app.services.headcount_service.get_special_day")          as mock_special_day, \
         patch("app.services.headcount_service.get_all_users")            as mock_users, \
         patch("app.services.headcount_service.get_all_teams")            as mock_teams, \
         patch("app.services.headcount_service.get_records_for_date")     as mock_records, \
         patch("app.services.headcount_service.get_effective_location")   as mock_location:

        # Defaults — tests override only what they need
        mock_special_day.return_value = None
        mock_users.return_value = USERS
        mock_teams.return_value = TEAMS
        mock_records.return_value = []
        mock_location.side_effect = mock_location_fn

        yield {
            "meals":    mock_meals,
            "records":  mock_records,
            "location": mock_location,
        }
