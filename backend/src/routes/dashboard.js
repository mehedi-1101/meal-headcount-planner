import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { getHeadcountReport } from "../services/headcountService.js";
import { getAvailableMeals } from "../services/availabilityService.js";
import { getAllSpecialDays, getSpecialDay } from "../services/specialDayService.js";

const router = express.Router();

function localDateString() {
    // Asia/Dhaka is UTC+6; derive YYYY-MM-DD without relying on system locale
    const now = new Date();
    const offset = 6 * 60; // minutes
    const local = new Date(now.getTime() + offset * 60 * 1000);
    return local.toISOString().split("T")[0];
}

function addOneDay(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const next = new Date(y, m - 1, d + 1);
    return next.toISOString().split("T")[0];
}

/**
 * GET /api/dashboard/operational
 * Consolidated view: today's headcount snapshot, tomorrow's forecast,
 * and upcoming special days (next 14 days). Admin/Logistics only.
 */
router.get(
    "/operational",
    requireAuth,
    requireRole([ROLES.ADMIN, ROLES.LOGISTICS]),
    (req, res) => {
        const today = localDateString();
        const tomorrow = addOneDay(today);

        const todayReport = getHeadcountReport(today);

        const tomorrowMeals = getAvailableMeals(tomorrow);
        let tomorrowReport;
        if (tomorrowMeals.length > 0) {
            tomorrowReport = getHeadcountReport(tomorrow);
        } else {
            tomorrowReport = {
                date: tomorrow,
                specialDay: getSpecialDay(tomorrow) || null,
                officeCount: 0,
                wfhCount: 0,
                meals: [],
            };
        }

        const activeSpecialDays = getAllSpecialDays()
            .filter((d) => d.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 14);

        res.json({ today: todayReport, tomorrow: tomorrowReport, activeSpecialDays });
    }
);

export default router;
