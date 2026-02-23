import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { getSettings, updateSettings } from "../services/settingsService.js";

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
    res.json(getSettings());
});

router.put("/", requireAuth, requireRole([ROLES.ADMIN]), (req, res) => {
    const { cutoffTime, offDays, iftarPeriods, companyWfhPeriods, maxForwardPlanningDays, monthlyWfhAllowance } = req.body;
    
    // Validate cutoffTime format (HH:mm)
    if (cutoffTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(cutoffTime)) {
        return res.status(400).json({ error: "Invalid cutoffTime format. Use HH:mm (e.g., 22:00)" });
    }
    
    // Validate offDays array (0-6)
    if (offDays && (!Array.isArray(offDays) || offDays.some(d => d < 0 || d > 6))) {
        return res.status(400).json({ error: "offDays must be array of numbers 0-6" });
    }
    
    // Validate date ranges in periods
    const validatePeriods = (periods, name) => {
        if (!Array.isArray(periods)) return `${name} must be an array`;
        for (const p of periods) {
            if (!p.startDate || !p.endDate) return `${name} missing startDate or endDate`;
            if (p.startDate > p.endDate) return `${name} has startDate after endDate`;
        }
        return null;
    };
    
    if (iftarPeriods) {
        const err = validatePeriods(iftarPeriods, "iftarPeriods");
        if (err) return res.status(400).json({ error: err });
    }
    
    if (companyWfhPeriods) {
        const err = validatePeriods(companyWfhPeriods, "companyWfhPeriods");
        if (err) return res.status(400).json({ error: err });
    }

    if (maxForwardPlanningDays !== undefined) {
        const n = Number(maxForwardPlanningDays);
        if (!Number.isInteger(n) || n < 1 || n > 60) {
            return res.status(400).json({ error: "maxForwardPlanningDays must be an integer between 1 and 60" });
        }
    }

    if (monthlyWfhAllowance !== undefined) {
        const n = Number(monthlyWfhAllowance);
        if (!Number.isInteger(n) || n < 0 || n > 31) {
            return res.status(400).json({ error: "monthlyWfhAllowance must be an integer between 0 and 31" });
        }
    }

    const updated = updateSettings(req.body);
    res.json(updated);
});

export default router;
