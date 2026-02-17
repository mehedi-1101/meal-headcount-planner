import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { LOCATIONS } from "../constants/locations.js";
import { getUserById } from "../services/userService.js";
import {
    getEffectiveLocation,
    setLocation,
} from "../services/workLocationService.js";

const router = express.Router();

const validLocations = Object.values(LOCATIONS);

/**
 * GET /api/work-location?userId=...&date=...
 * Returns effective location for a user on a date.
 * If no userId, returns for the logged-in user.
 */
router.get("/", requireAuth, (req, res) => {
    const userId = req.query.userId || req.session.user.id;
    const date = req.query.date;

    if (!date) {
        return res.status(400).json({ error: "date query param is required" });
    }

    const location = getEffectiveLocation(userId, date);
    res.json({ userId, date, location });
});

/**
 * POST /api/work-location
 * Employee sets their own location for a date.
 * Body: { date, location }
 */
router.post("/", requireAuth, (req, res) => {
    const { date, location } = req.body;
    const user = req.session.user;

    if (!date || !location) {
        return res.status(400).json({ error: "date and location are required" });
    }

    if (!validLocations.includes(location)) {
        return res.status(400).json({ error: `Invalid location. Must be one of: ${validLocations.join(", ")}` });
    }

    setLocation(user.id, date, location, user.id);
    res.json({ message: `Location set to ${location} for ${date}` });
});

/**
 * POST /api/work-location/override
 * TL overrides own team; Admin overrides anyone.
 * Body: { targetUserId, date, location }
 */
router.post(
    "/override",
    requireAuth,
    requireRole([ROLES.TEAM_LEAD, ROLES.ADMIN]),
    (req, res) => {
        const { targetUserId, date, location } = req.body;
        const currentUser = req.session.user;

        if (!targetUserId || !date || !location) {
            return res.status(400).json({ error: "targetUserId, date, and location are required" });
        }

        if (!validLocations.includes(location)) {
            return res.status(400).json({ error: `Invalid location. Must be one of: ${validLocations.join(", ")}` });
        }

        const targetUser = getUserById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ error: "Target user not found" });
        }

        if (
            currentUser.role === ROLES.TEAM_LEAD &&
            currentUser.teamId !== targetUser.teamId
        ) {
            return res.status(403).json({ error: "Team Leads can only override their own team members" });
        }

        setLocation(targetUserId, date, location, currentUser.id);
        res.json({ message: `Set ${targetUser.name}'s location to ${location} for ${date}` });
    }
);

export default router;
