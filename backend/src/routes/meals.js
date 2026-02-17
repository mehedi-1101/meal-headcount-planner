import express from "express";
import { MEAL_TYPES } from "../constants/mealTypes.js";
import { ROLES } from "../constants/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { getUserById } from "../services/userService.js";
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

export default router;
