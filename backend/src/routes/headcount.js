import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { getHeadcountReport } from "../services/headcountService.js";

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

export default router;
