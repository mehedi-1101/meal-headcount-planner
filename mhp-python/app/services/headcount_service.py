"""
Headcount service — builds the headcount report for a date.

Dual-default formula (mirror of headcountService.js):
  default-IN  meals: headcount = office_users - opted_out_office_users
  default-OUT meals: headcount = opted_in_office_users
WFH users are excluded from ALL meal counts regardless of their records.
"""

from app.constants import Locations
from app.services.availability_service import get_available_meals
from app.services.special_day_service import get_special_day
from app.services.user_service import get_all_users, get_all_teams
from app.services.meal_service import get_records_for_date
from app.services.work_location_service import get_effective_location


def get_headcount_report(date_str: str) -> dict:
    available_meals = get_available_meals(date_str)
    special_day = get_special_day(date_str)

    if not available_meals:
        return {
            "date": date_str,
            "specialDay": special_day,
            "totalUsers": 0,
            "officeCount": 0,
            "wfhCount": 0,
            "meals": [],
            "byTeam": [],
        }

    users = get_all_users()
    teams = get_all_teams()
    meal_records = get_records_for_date(date_str)

    # Classify each user as office or WFH
    office_user_ids: set[str] = set()
    team_stats: dict[str, dict] = {
        t["id"]: {"teamId": t["id"], "name": t["name"], "officeCount": 0, "wfhCount": 0}
        for t in teams
    }

    for user in users:
        loc = get_effective_location(user["id"], date_str)
        if loc != Locations.WFH:
            office_user_ids.add(user["id"])

        team_id = user.get("teamId")
        if not team_id:
            continue
        if team_id not in team_stats:
            team_stats[team_id] = {"teamId": team_id, "name": team_id, "officeCount": 0, "wfhCount": 0}

        if loc == Locations.WFH:
            team_stats[team_id]["wfhCount"] += 1
        else:
            team_stats[team_id]["officeCount"] += 1

    # Apply dual-default formula per meal
    meals = []
    for meal in available_meals:
        if meal["default"] == "IN":
            opted_out = sum(
                1 for r in meal_records
                if r["mealType"] == meal["type"]
                and r["status"] == "OUT"
                and r["userId"] in office_user_ids
            )
            headcount = len(office_user_ids) - opted_out
        else:
            headcount = sum(
                1 for r in meal_records
                if r["mealType"] == meal["type"]
                and r["status"] == "IN"
                and r["userId"] in office_user_ids
            )
        meals.append({"type": meal["type"], "default": meal["default"], "headcount": headcount})

    by_team = [t for t in team_stats.values() if t["officeCount"] > 0 or t["wfhCount"] > 0]

    return {
        "date": date_str,
        "specialDay": special_day,
        "totalUsers": len(users),
        "officeCount": len(office_user_ids),
        "wfhCount": len(users) - len(office_user_ids),
        "meals": meals,
        "byTeam": by_team,
    }
