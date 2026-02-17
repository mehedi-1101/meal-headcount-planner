import { getSettings } from "./settingsService.js";
import { getSpecialDay } from "./specialDayService.js";
import { SPECIAL_DAY_TYPES } from "../constants/specialDayTypes.js";

function isOffDay(date, offDays) {
    // Parse YYYY-MM-DD manually to avoid timezone issues
    const [y, m, d] = date.split("-").map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    return offDays.includes(dayOfWeek);
}

function isInAnyPeriod(date, periods) {
    return periods.some((p) => date >= p.startDate && date <= p.endDate);
}

export function getAvailableMeals(date) {
    const settings = getSettings();

    if (isOffDay(date, settings.offDays)) {
        return [];
    }

    const specialDay = getSpecialDay(date);
    if (
        specialDay &&
        (specialDay.type === SPECIAL_DAY_TYPES.OFFICE_CLOSED ||
            specialDay.type === SPECIAL_DAY_TYPES.GOVT_HOLIDAY)
    ) {
        return [];
    }

    const meals = [
        { type: "LUNCH", default: "IN" },
        { type: "SNACKS", default: "IN" },
    ];

    if (isInAnyPeriod(date, settings.iftarPeriods)) {
        meals.push({ type: "IFTAR", default: "IN" });
    } else {
        meals.push({ type: "IFTAR", default: "OUT" });
    }

    if (specialDay && specialDay.meals) {
        for (const meal of specialDay.meals) {
            if (meal === "EVENT_DINNER") {
                meals.push({ type: "EVENT_DINNER", default: "IN" });
            }
            if (meal === "OPTIONAL_DINNER") {
                meals.push({ type: "OPTIONAL_DINNER", default: "OUT" });
            }
        }
    }

    return meals;
}

export function getSpecialDayInfo(date) {
    return getSpecialDay(date);
}
