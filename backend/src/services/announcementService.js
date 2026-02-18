import { getHeadcountReport } from "./headcountService.js";

const MEAL_LABELS = {
    LUNCH: "Lunch",
    SNACKS: "Snacks",
    IFTAR: "Iftar",
    EVENT_DINNER: "Event Dinner",
    OPTIONAL_DINNER: "Optional Dinner",
};

function formatDate(dateStr) {
    // Parse manually to avoid timezone shifts
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function specialDayLabel(type) {
    return type
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ");
}

/**
 * Generates a markdown announcement string for the given date.
 * Matches the sample format in technical-design.md (lines 596-624).
 */
export function generateAnnouncement(date) {
    const report = getHeadcountReport(date);
    const formattedDate = formatDate(date);
    const lines = [];

    lines.push(`**Meal Headcount — ${formattedDate}**`);

    if (report.specialDay) {
        lines.push(specialDayLabel(report.specialDay.type));
    }

    lines.push("");

    if (report.meals.length === 0) {
        lines.push("No meals today (office closed or holiday).");
        return lines.join("\n");
    }

    for (const meal of report.meals) {
        const label = MEAL_LABELS[meal.type] || meal.type;
        lines.push(`${label}: ${meal.headcount}`);
    }

    lines.push("");
    lines.push(`In office: ${report.officeCount} · WFH: ${report.wfhCount}`);
    lines.push(`Total: ${report.totalUsers}`);
    lines.push("");

    if (report.specialDay?.note) {
        lines.push(`Note: ${report.specialDay.note}`);
    } else {
        lines.push("Regular working day.");
    }

    return lines.join("\n");
}
