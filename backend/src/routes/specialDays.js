import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { SPECIAL_DAY_TYPES } from "../constants/specialDayTypes.js";
import {
    getAllSpecialDays,
    createSpecialDay,
    updateSpecialDay,
    deleteSpecialDay,
} from "../services/specialDayService.js";
import { broadcast } from "../services/sseService.js";

const router = express.Router();

const ALLOWED_ROLES = [ROLES.ADMIN, ROLES.LOGISTICS];
const validTypes = Object.values(SPECIAL_DAY_TYPES);

/**
 * GET /api/special-days?month=YYYY-MM
 * Optional month filter. If omitted, returns all.
 */
router.get("/", requireAuth, requireRole(ALLOWED_ROLES), (req, res) => {
    let days = getAllSpecialDays();
    const month = req.query.month;
    if (month) {
        days = days.filter((d) => d.date.startsWith(month));
    }
    res.json(days);
});

router.post("/", requireAuth, requireRole(ALLOWED_ROLES), (req, res) => {
    const { date, type, note, meals } = req.body;

    if (!date || !type) {
        return res.status(400).json({ error: "date and type are required" });
    }

    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
    }

    try {
        const entry = createSpecialDay({
            date,
            type,
            note,
            meals,
            createdBy: req.session.user.id,
        });
        broadcast("special-day-change", { date });
        res.status(201).json(entry);
    } catch (err) {
        res.status(409).json({ error: err.message });
    }
});

router.put("/:date", requireAuth, requireRole(ALLOWED_ROLES), (req, res) => {
    const { date } = req.params;
    const { type, note, meals } = req.body;

    if (type && !validTypes.includes(type)) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
    }

    try {
        const updated = updateSpecialDay(date, { type, note, meals });
        broadcast("special-day-change", { date });
        res.json(updated);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

router.delete("/:date", requireAuth, requireRole(ALLOWED_ROLES), (req, res) => {
    try {
        deleteSpecialDay(req.params.date);
        broadcast("special-day-change", { date: req.params.date });
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

export default router;
