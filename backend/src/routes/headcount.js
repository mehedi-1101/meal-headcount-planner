import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { getHeadcountReport } from "../services/headcountService.js";
import { getAvailableMeals } from "../services/availabilityService.js";
import { getSpecialDay } from "../services/specialDayService.js";

const router = express.Router();

/**
 * GET /api/headcount?date=YYYY-MM-DD
 * Returns enhanced headcount report with per-meal counts,
 * office/WFH split, and per-team breakdown.
 */
router.get(
    "/",
    requireAuth,
    requireRole([ROLES.ADMIN, ROLES.LOGISTICS]),
    (req, res) => {
        const date = req.query.date;

        if (!date) {
            return res.status(400).json({ error: "date query param is required" });
        }

        const report = getHeadcountReport(date);
        res.json(report);
    }
);

/**
 * GET /api/headcount/forecast?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Returns per-date headcount aggregates for a date range.
 * Non-working days return meals: []. Admin/Logistics only.
 */
router.get(
    "/forecast",
    requireAuth,
    requireRole([ROLES.ADMIN, ROLES.LOGISTICS]),
    (req, res) => {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate query params are required" });
        }

        if (startDate > endDate) {
            return res.status(400).json({ error: "startDate must be before or equal to endDate" });
        }

        // Build date range
        const days = [];
        let current = startDate;
        while (current <= endDate) {
            const availableMeals = getAvailableMeals(current);

            if (availableMeals.length === 0) {
                const specialDay = getSpecialDay(current) || null;
                days.push({ date: current, specialDay, officeCount: 0, wfhCount: 0, meals: [] });
            } else {
                const report = getHeadcountReport(current);
                days.push({
                    date: current,
                    specialDay: report.specialDay,
                    officeCount: report.officeCount,
                    wfhCount: report.wfhCount,
                    meals: report.meals,
                });
            }

            // Advance by one day (string arithmetic to avoid timezone issues)
            const [y, m, d] = current.split("-").map(Number);
            const next = new Date(Date.UTC(y, m - 1, d + 1));
            current = next.toISOString().split("T")[0];
        }

        res.json({ startDate, endDate, days });
    }
);

export default router;
