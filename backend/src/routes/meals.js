import express from "express";
import { MEAL_TYPES } from "../constants/mealTypes.js";
import { ROLES } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getUserById, getTeamMembers } from "../services/userService.js";
import { optOut, optIn } from "../services/mealService.js";

const router = express.Router();

/**
 * POST /meals/:mealType/out
 * Employee opts out of a meal for today.
 */
router.post("/:mealType/out", requireAuth, (req, res) => {
    const { mealType } = req.params;
    const user = req.session.user;

    if (!MEAL_TYPES.includes(mealType)) {
        return res.status(400).json({ error: `Invalid meal type: ${mealType}` });
    }

    optOut(user.id, mealType, user.id);

    res.json({ message: `Opted out of ${mealType}` });
});

/**
 * POST /meals/:mealType/in
 * Employee opts back in to a meal for today.
 */
router.post("/:mealType/in", requireAuth, (req, res) => {
    const { mealType } = req.params;
    const user = req.session.user;

    if (!MEAL_TYPES.includes(mealType)) {
        return res.status(400).json({ error: `Invalid meal type: ${mealType}` });
    }

    optIn(user.id, mealType, user.id);

    res.json({ message: `Opted in to ${mealType}` });
});

/**
 * POST /meals/:mealType/override
 * Team Lead (own team only) or Admin (any user) overrides meal for another user.
 * Body: { targetUserId, status } where status is "IN" or "OUT"
 */
router.post("/:mealType/override", requireAuth, (req, res) => {
    const { mealType } = req.params;
    const { targetUserId, status } = req.body;
    const currentUser = req.session.user;

    // Only TEAM_LEAD and ADMIN can override
    if (![ROLES.TEAM_LEAD, ROLES.ADMIN].includes(currentUser.role)) {
        return res.status(403).json({ error: "Forbidden" });
    }

    if (!MEAL_TYPES.includes(mealType)) {
        return res.status(400).json({ error: `Invalid meal type: ${mealType}` });
    }

    if (!targetUserId || !["IN", "OUT"].includes(status)) {
        return res
            .status(400)
            .json({ error: "Missing targetUserId or invalid status (IN/OUT)" });
    }

    // Verify target user exists
    const targetUser = getUserById(targetUserId);
    if (!targetUser) {
        return res.status(404).json({ error: "Target user not found" });
    }

    // Team Lead: can only override own team members
    if (
        currentUser.role === ROLES.TEAM_LEAD &&
        currentUser.teamId !== targetUser.teamId
    ) {
        return res
            .status(403)
            .json({ error: "Team Leads can only override their own team members" });
    }

    if (status === "OUT") {
        optOut(targetUserId, mealType, currentUser.id);
    } else {
        optIn(targetUserId, mealType, currentUser.id);
    }

    res.json({
        message: `Overrode ${targetUser.name}'s ${mealType} to ${status}`,
    });
});

/**
 * POST /api/meals/bulk-override
 * Bulk override meal participation for multiple users, meals, and dates.
 * Body: { userIds, mealTypes, status, startDate, endDate }
 * TL: own team only. Admin: unrestricted.
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

        // Validate all target users exist and are within scope
        const targetUsers = [];
        for (const uid of userIds) {
            const user = getUserById(uid);
            if (!user) {
                return res.status(404).json({ error: `User not found: ${uid}` });
            }
            targetUsers.push(user);
        }

        // TL scope check: reject entirely if any user is outside their team
        if (currentUser.role === ROLES.TEAM_LEAD) {
            const outOfScope = targetUsers.find((u) => u.teamId !== currentUser.teamId);
            if (outOfScope) {
                return res.status(403).json({
                    error: "Team Leads can only bulk override their own team members",
                });
            }
        }

        // Generate date range
        const dates = [];
        let current = startDate;
        while (current <= endDate) {
            dates.push(current);
            const [y, m, d] = current.split("-").map(Number);
            const next = new Date(y, m - 1, d + 1);
            current = next.toISOString().split("T")[0];
        }

        // Apply overrides
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

        res.json({ message: `Applied ${count} overrides`, count });
    }
);

export default router;
