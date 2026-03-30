"""
Announcement service — generates a markdown-formatted daily announcement
suitable for copy-pasting into Discord or Slack.
Mirrors announcementService.js logic.
"""

from app.services.headcount_service import get_headcount_report
from app.services.special_day_service import get_special_day


def generate_announcement(date_str: str) -> str:
    report = get_headcount_report(date_str)
    special_day = get_special_day(date_str)

    lines = [f"## Meal Headcount — {date_str}"]

    if special_day:
        lines.append(f"\n> **{special_day['type']}**" + (f": {special_day['note']}" if special_day.get("note") else ""))

    if not report["meals"]:
        lines.append("\nNo meals today (office closed or holiday).")
        return "\n".join(lines)

    lines.append(f"\n**Office:** {report['officeCount']}  |  **WFH:** {report['wfhCount']}")
    lines.append("\n| Meal | Headcount |")
    lines.append("|------|-----------|")

    for meal in report["meals"]:
        lines.append(f"| {meal['type']} | {meal['headcount']} |")

    return "\n".join(lines)
