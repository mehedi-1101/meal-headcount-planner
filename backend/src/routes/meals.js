import express from "express";
import { MEAL_TYPES } from "../constants/mealTypes.js";
import { ROLES } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getUserById } from "../services/userService.js";
import { optOut, optIn, getUserMealStatus } from "../services/mealService.js";
import { getAvailableMeals } from "../services/availabilityService.js";
import { enforceCutoff } from "../middleware/cutoff.js";
import { broadcast } from "../services/sseService.js";

const router = express.Router();

const mealDateExtractor = (req) => req.body.date || new Date().toISOString().split("T")[0];

/**
 * GET /api/meals?date=YYYY-MM-DD
 * Returns available meals for the date and the logged-in user's status for each.
 */
router.get("/", requireAuth, (req, res) => {
    const date = req.query.date;
    if (!date) {
        return res.status(400).json({ error: "date query param is required" });
    }

    const user = req.session.user;
    const availableMeals = getAvailableMeals(date);
    const mealTypes = availableMeals.map((m) => m.type);
    const userStatus = getUserMealStatus(user.id, mealTypes, date);

    const meals = availableMeals.map((m) => ({
        type: m.type,
        default: m.default,
        status: userStatus[m.type],
    }));

    res.json({ date, meals });
});

/**
 * POST /api/meals/:mealType/opt-out
 * Employee opts out of a meal. Body: { date? }
 */
router.post("/:mealType/opt-out", requireAuth, enforceCutoff(mealDateExtractor), (req, res) => {
    const { mealType } = req.params;
    const user = req.session.user;
    const date = req.body.date;

    if (!MEAL_TYPES.includes(mealType)) {
        return res.status(400).json({ error: `Invalid meal type: ${mealType}` });
    }

    const targetDate = date || new Date().toISOString().split("T")[0];
    const available = getAvailableMeals(targetDate);
    if (available.length === 0) {
        return res.status(400).json({ error: "No meals available on this date (holiday or office closed)" });
    }

    optOut(user.id, mealType, user.id, date);
    broadcast("headcount-update", { date: targetDate });
    res.json({ message: `Opted out of ${mealType}` });
});

/**
 * POST /api/meals/:mealType/opt-in
 * Employee opts back in to a meal. Body: { date? }
 */
router.post("/:mealType/opt-in", requireAuth, enforceCutoff(mealDateExtractor), (req, res) => {
    const { mealType } = req.params;
    const user = req.session.user;
    const date = req.body.date;

    if (!MEAL_TYPES.includes(mealType)) {
        return res.status(400).json({ error: `Invalid meal type: ${mealType}` });
    }

    const targetDate = date || new Date().toISOString().split("T")[0];
    const available = getAvailableMeals(targetDate);
    if (available.length === 0) {
        return res.status(400).json({ error: "No meals available on this date (holiday or office closed)" });
    }

    optIn(user.id, mealType, user.id, date);
    broadcast("headcount-update", { date: targetDate });
    res.json({ message: `Opted in to ${mealType}` });
});

/**
 * POST /api/meals/override
 * TL (own team) or Admin (any user) overrides a single meal.
 * Body: { targetUserId, mealType, status, date? }
 */
router.post(
    "/override",
    requireAuth,
    requireRole([ROLES.TEAM_LEAD, ROLES.ADMIN]),
    (req, res) => {
        const { targetUserId, mealType, status, date } = req.body;
        const currentUser = req.session.user;

        if (!targetUserId || !mealType || !["IN", "OUT"].includes(status)) {
            return res.status(400).json({
                error: "targetUserId, mealType, and status (IN/OUT) are required",
            });
        }

        if (!MEAL_TYPES.includes(mealType)) {
            return res.status(400).json({ error: `Invalid meal type: ${mealType}` });
        }

        const targetUser = getUserById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ error: "Target user not found" });
        }

        if (
            currentUser.role === ROLES.TEAM_LEAD &&
            currentUser.teamId !== targetUser.teamId
        ) {
            return res.status(403).json({
                error: "Team Leads can only override their own team members",
            });
        }

        if (status === "OUT") {
            optOut(targetUserId, mealType, currentUser.id, date);
        } else {
            optIn(targetUserId, mealType, currentUser.id, date);
        }

        const targetDate = date || new Date().toISOString().split("T")[0];
        broadcast("headcount-update", { date: targetDate });
        res.json({
            message: `Overrode ${targetUser.name}'s ${mealType} to ${status}`,
        });
    }
);

/**
 * POST /api/meals/bulk-override
 * Bulk override meal participation for multiple users, meals, and dates.
 * Body: { userIds, mealTypes, status, startDate, endDate }
 * Rejects entirely if any target user is outside actor's scope.
 */
router.post(
    "/bulk-override",
    requireAuth,
    requireRole([ROLES.TEAM_LEAD, ROLES.ADMIN]),
    (req, res) => {
        const { userIds, mealTypes, status, startDate, endDate } = req.body;
        const currentUser = req.session.user;

        if (!userIds || !mealTypes || !status || !startDate || !endDate) {
            return res.status(400).json({
                error: "userIds, mealTypes, status, startDate, and endDate are required",
            });
        }

        if (!Array.isArray(userIds) || !Array.isArray(mealTypes)) {
            return res.status(400).json({ error: "userIds and mealTypes must be arrays" });
        }

        if (!["IN", "OUT"].includes(status)) {
            return res.status(400).json({ error: "status must be IN or OUT" });
        }

        for (const mt of mealTypes) {
            if (!MEAL_TYPES.includes(mt)) {
                return res.status(400).json({ error: `Invalid meal type: ${mt}` });
            }
        }

        const targetUsers = [];
        for (const uid of userIds) {
            const user = getUserById(uid);
            if (!user) {
                return res.status(404).json({ error: `User not found: ${uid}` });
            }
            targetUsers.push(user);
        }

        if (currentUser.role === ROLES.TEAM_LEAD) {
            const outOfScope = targetUsers.find((u) => u.teamId !== currentUser.teamId);
            if (outOfScope) {
                return res.status(403).json({
                    error: "Team Leads can only bulk override their own team members",
                });
            }
        }

        const dates = [];
        let current = startDate;
        while (current <= endDate) {
            dates.push(current);
            const [y, m, d] = current.split("-").map(Number);
            const next = new Date(y, m - 1, d + 1);
            current = next.toISOString().split("T")[0];
        }

        const action = status === "OUT" ? optOut : optIn;
        let count = 0;
        for (const date of dates) {
            for (const uid of userIds) {
                for (const mt of mealTypes) {
                    action(uid, mt, currentUser.id, date);
                    count++;
                }
            }
        }

        // Broadcast for each unique date affected
        for (const date of dates) {
            broadcast("headcount-update", { date });
        }
        res.json({ message: `Applied ${count} overrides`, count });
    }
);

export default router;
