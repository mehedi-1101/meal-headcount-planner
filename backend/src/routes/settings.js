import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { getSettings, updateSettings } from "../services/settingsService.js";

const router = express.Router();

router.get("/", requireAuth, requireRole([ROLES.ADMIN]), (req, res) => {
    res.json(getSettings());
});

router.put("/", requireAuth, requireRole([ROLES.ADMIN]), (req, res) => {
    const updated = updateSettings(req.body);
    res.json(updated);
});

export default router;
