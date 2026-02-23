import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { LOCATIONS } from "../constants/locations.js";
import { getUserById, getAllUsers, getTeamMembers } from "../services/userService.js";
import {
    getEffectiveLocation,
    setLocation,
    getMonthlyWfhUsage,
} from "../services/workLocationService.js";
import { enforceCutoff } from "../middleware/cutoff.js";
import { broadcast } from "../services/sseService.js";
import { logAction } from "../services/auditService.js";
import { getSettings } from "../services/settingsService.js";

const router = express.Router();

const validLocations = Object.values(LOCATIONS);

function getTodayDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function isPastDate(date) {
    return date < getTodayDate();
}

function isDateBeyondForwardWindow(dateStr, maxDays) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + "T00:00:00");
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    return diffDays > maxDays;
}

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
router.post("/", requireAuth, enforceCutoff((req) => req.body.date), (req, res) => {
    const { date, location } = req.body;
    const user = req.session.user;

    if (!date || !location) {
        return res.status(400).json({ error: "date and location are required" });
    }

    if (isPastDate(date)) {
        return res.status(400).json({ error: "Cannot change work location for past dates" });
    }

    if (!validLocations.includes(location)) {
        return res.status(400).json({ error: `Invalid location. Must be one of: ${validLocations.join(", ")}` });
    }

    if (user.role === ROLES.EMPLOYEE) {
        const { maxForwardPlanningDays } = getSettings();
        if (isDateBeyondForwardWindow(date, maxForwardPlanningDays)) {
            return res.status(400).json({ error: "Date is beyond the allowed forward planning window." });
        }
    }

    setLocation(user.id, date, location, user.id);
    broadcast("headcount-update", { date });

    try {
        logAction({ actorId: user.id, actorName: user.name, targetUserId: user.id, actionType: "LOCATION_CHANGE", details: { date, location } });
    } catch (e) {
        console.error("Audit write failed:", e);
    }

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

        if (isPastDate(date)) {
            return res.status(400).json({ error: "Cannot change work location for past dates" });
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
        broadcast("headcount-update", { date });

        try {
            logAction({ actorId: currentUser.id, actorName: currentUser.name, targetUserId, actionType: "LOCATION_OVERRIDE", details: { date, location } });
        } catch (e) {
            console.error("Audit write failed:", e);
        }

        res.json({ message: `Set ${targetUser.name}'s location to ${location} for ${date}` });
    }
);

/**
 * GET /api/work-location/monthly-usage?month=YYYY-MM
 * Returns WFH day counts per user for the given month, scoped by role.
 * Employee: own record only. TL: own team. Admin/Logistics: all.
 */
router.get("/monthly-usage", requireAuth, (req, res) => {
    const user = req.session.user;
    const month = req.query.month || getTodayDate().slice(0, 7);
    const { monthlyWfhAllowance } = getSettings();

    let userList;
    if (user.role === ROLES.EMPLOYEE) {
        userList = [getUserById(user.id)];
    } else if (user.role === ROLES.TEAM_LEAD) {
        userList = getTeamMembers(user.teamId);
    } else {
        userList = getAllUsers();
    }

    const users = getMonthlyWfhUsage(userList, month, monthlyWfhAllowance);
    res.json({ month, allowance: monthlyWfhAllowance, users });
});

export default router;
