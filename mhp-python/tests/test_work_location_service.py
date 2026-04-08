from unittest.mock import patch
from app.services.work_location_service import get_effective_location


# ---------------------------------------------------------------------------
# get_effective_location() — 3-step resolution:
#   1. Individual record exists → use it
#   2. Date inside company WFH period → WFH
#   3. No data → OFFICE (default)
#
# Two external calls to mock:
#   get_item     → DynamoDB individual record lookup
#   get_settings → DynamoDB settings (has companyWfhPeriods)
# ---------------------------------------------------------------------------


@patch("app.services.work_location_service.get_settings")
@patch("app.services.work_location_service.get_item")
def test_individual_record_office(mock_get_item, mock_get_settings):
    # Arrange — user has an individual OFFICE record
    mock_get_item.return_value = {"userId": "u1", "location": "OFFICE"}
    mock_get_settings.return_value = {"companyWfhPeriods": []}

    # Act
    result = get_effective_location("u1", "2026-04-06")

    # Assert
    assert result == "OFFICE"
    # get_settings should never be called — individual record wins immediately
    mock_get_settings.assert_not_called()


@patch("app.services.work_location_service.get_settings")
@patch("app.services.work_location_service.get_item")
def test_individual_record_wfh(mock_get_item, mock_get_settings):
    # Arrange — user has an individual WFH record
    mock_get_item.return_value = {"userId": "u1", "location": "WFH"}
    mock_get_settings.return_value = {"companyWfhPeriods": []}

    # Act
    result = get_effective_location("u1", "2026-04-06")

    # Assert
    assert result == "WFH"
    mock_get_settings.assert_not_called()


@patch("app.services.work_location_service.get_settings")
@patch("app.services.work_location_service.get_item")
def test_company_wfh_period_overrides_default(mock_get_item, mock_get_settings):
    # Arrange — no individual record, but date is inside a company WFH period
    mock_get_item.return_value = None   # no individual record
    mock_get_settings.return_value = {
        "companyWfhPeriods": [
            {"startDate": "2026-04-01", "endDate": "2026-04-30"},
        ]
    }

    # Act — date falls inside the company WFH period
    result = get_effective_location("u1", "2026-04-06")

    # Assert
    assert result == "WFH"


@patch("app.services.work_location_service.get_settings")
@patch("app.services.work_location_service.get_item")
def test_default_is_office_when_no_record_no_period(mock_get_item, mock_get_settings):
    # Arrange — no individual record, no company WFH period
    mock_get_item.return_value = None
    mock_get_settings.return_value = {"companyWfhPeriods": []}

    # Act
    result = get_effective_location("u1", "2026-04-06")

    # Assert — falls through to default
    assert result == "OFFICE"


@patch("app.services.work_location_service.get_settings")
@patch("app.services.work_location_service.get_item")
def test_company_wfh_period_start_date_inclusive(mock_get_item, mock_get_settings):
    # Arrange — date is exactly on the startDate
    mock_get_item.return_value = None
    mock_get_settings.return_value = {
        "companyWfhPeriods": [
            {"startDate": "2026-04-06", "endDate": "2026-04-10"},
        ]
    }

    # Act — exactly on startDate
    result = get_effective_location("u1", "2026-04-06")

    # Assert — boundary is inclusive, should be WFH
    assert result == "WFH"


@patch("app.services.work_location_service.get_settings")
@patch("app.services.work_location_service.get_item")
def test_company_wfh_period_end_date_inclusive(mock_get_item, mock_get_settings):
    # Arrange — date is exactly on the endDate
    mock_get_item.return_value = None
    mock_get_settings.return_value = {
        "companyWfhPeriods": [
            {"startDate": "2026-04-06", "endDate": "2026-04-10"},
        ]
    }

    # Act — exactly on endDate
    result = get_effective_location("u1", "2026-04-10")

    # Assert — boundary is inclusive, should be WFH
    assert result == "WFH"


@patch("app.services.work_location_service.get_settings")
@patch("app.services.work_location_service.get_item")
def test_date_outside_company_wfh_period(mock_get_item, mock_get_settings):
    # Arrange — date is one day after the period ends
    mock_get_item.return_value = None
    mock_get_settings.return_value = {
        "companyWfhPeriods": [
            {"startDate": "2026-04-06", "endDate": "2026-04-10"},
        ]
    }

    # Act — one day outside the period
    result = get_effective_location("u1", "2026-04-11")

    # Assert — outside period → falls to default OFFICE
    assert result == "OFFICE"
