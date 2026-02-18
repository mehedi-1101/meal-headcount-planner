import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { generateAnnouncement } from "../services/announcementService.js";

const router = express.Router();

/**
 * GET /api/announcement?date=YYYY-MM-DD
 * Returns a markdown-formatted announcement string for the given date.
 */
router.get(
    "/",
    requireAuth,
    requireRole([ROLES.ADMIN, ROLES.LOGISTICS]),
    (req, res) => {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ error: "date query param is required" });
        }

        const text = generateAnnouncement(date);
        res.json({ date, text });
    }
);

export default router;
