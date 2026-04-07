from unittest.mock import patch
from app.services.availability_service import get_available_meals


BASE_SETTINGS = {
    "offDays": [5, 6],   # Friday=5, Saturday=6 (JS convention: Sun=0)
    "iftarPeriods": [],
}


@patch("app.services.availability_service.get_special_day")
@patch("app.services.availability_service.get_settings")
def test_off_day_returns_no_meals(mock_get_settings, mock_get_special_day):
    # Arrange
    mock_get_settings.return_value = BASE_SETTINGS
    mock_get_special_day.return_value = None

    # Act — 2026-04-10 is a Friday
    result = get_available_meals("2026-04-10")

    # Assert
    assert result == []
    # Also verify get_special_day was never even called —
    # no point checking special days if it's already an off day
    mock_get_special_day.assert_not_called()


@patch("app.services.availability_service.get_special_day")
@patch("app.services.availability_service.get_settings")
def test_office_closed_returns_no_meals(mock_get_settings, mock_get_special_day):
    # Arrange
    mock_get_settings.return_value = BASE_SETTINGS
    mock_get_special_day.return_value = {
        "date": "2026-04-07",
        "type": "OFFICE_CLOSED",
        "name": "Emergency closure",
    }

    # Act — Tuesday (not an off day), but OFFICE_CLOSED
    result = get_available_meals("2026-04-07")

    # Assert
    assert result == []


@patch("app.services.availability_service.get_special_day")
@patch("app.services.availability_service.get_settings")
def test_normal_day_has_lunch_and_snacks(mock_get_settings, mock_get_special_day):
    # Arrange
    mock_get_settings.return_value = BASE_SETTINGS
    mock_get_special_day.return_value = None

    # Act — Monday, normal working day
    result = get_available_meals("2026-04-06")

    # Assert
    meal_types = [m["type"] for m in result]
    assert "LUNCH" in meal_types
    assert "SNACKS" in meal_types


@patch("app.services.availability_service.get_special_day")
@patch("app.services.availability_service.get_settings")
def test_iftar_default_out_outside_period(mock_get_settings, mock_get_special_day):
    # Arrange — no iftar periods defined
    mock_get_settings.return_value = BASE_SETTINGS  # iftarPeriods = []
    mock_get_special_day.return_value = None

    # Act
    result = get_available_meals("2026-04-06")

    # Assert
    iftar = next(m for m in result if m["type"] == "IFTAR")
    assert iftar["default"] == "OUT"


@patch("app.services.availability_service.get_special_day")
@patch("app.services.availability_service.get_settings")
def test_iftar_default_in_during_period(mock_get_settings, mock_get_special_day):
    # Arrange — date falls inside an iftar period
    mock_get_settings.return_value = {
        **BASE_SETTINGS,
        "iftarPeriods": [{"startDate": "2026-03-01", "endDate": "2026-03-31"}],
    }
    mock_get_special_day.return_value = None

    # Act — a date inside the iftar period
    result = get_available_meals("2026-03-15")

    # Assert
    iftar = next(m for m in result if m["type"] == "IFTAR")
    assert iftar["default"] == "IN"


@patch("app.services.availability_service.get_special_day")
@patch("app.services.availability_service.get_settings")
def test_event_dinner_added_with_default_in(mock_get_settings, mock_get_special_day):
    # Arrange
    mock_get_settings.return_value = BASE_SETTINGS
    mock_get_special_day.return_value = {
        "date": "2026-04-06",
        "type": "CELEBRATION",
        "name": "Company Anniversary",
        "meals": ["EVENT_DINNER"],
    }

    # Act
    result = get_available_meals("2026-04-06")

    # Assert — EVENT_DINNER must exist AND have default IN
    event_dinner = next(m for m in result if m["type"] == "EVENT_DINNER")
    assert event_dinner["default"] == "IN"


@patch("app.services.availability_service.get_special_day")
@patch("app.services.availability_service.get_settings")
def test_optional_dinner_added_with_default_out(mock_get_settings, mock_get_special_day):
    # Arrange
    mock_get_settings.return_value = BASE_SETTINGS
    mock_get_special_day.return_value = {
        "date": "2026-04-06",
        "type": "CELEBRATION",
        "name": "Company Anniversary",
        "meals": ["OPTIONAL_DINNER"],
    }

    # Act
    result = get_available_meals("2026-04-06")

    # Assert — OPTIONAL_DINNER must exist AND have default OUT
    optional_dinner = next(m for m in result if m["type"] == "OPTIONAL_DINNER")
    assert optional_dinner["default"] == "OUT"


@patch("app.services.availability_service.get_special_day")
@patch("app.services.availability_service.get_settings")
def test_celebration_without_meals_adds_nothing_extra(mock_get_settings, mock_get_special_day):
    # Arrange — CELEBRATION exists but no meals attached
    mock_get_settings.return_value = BASE_SETTINGS
    mock_get_special_day.return_value = {
        "date": "2026-04-06",
        "type": "CELEBRATION",
        "name": "Casual Friday",
        # no "meals" key at all
    }

    # Act
    result = get_available_meals("2026-04-06")

    # Assert — only base meals present, no dinner meals sneaked in
    meal_types = [m["type"] for m in result]
    assert "EVENT_DINNER" not in meal_types
    assert "OPTIONAL_DINNER" not in meal_types
