import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { getTeams, getTeamMembers, getAllUsers } from "../services/userService.js";
import { getUserMealStatus } from "../services/mealService.js";
import { getAvailableMeals } from "../services/availabilityService.js";
import { getEffectiveLocation } from "../services/workLocationService.js";

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
    res.json(getTeams());
});

/**
 * GET /api/team/participation?date=YYYY-MM-DD
 * TL: own team members with meal/location status.
 * Admin: all users with meal/location status.
 * Logistics: team-level aggregates only, no individual names.
 */
router.get(
    "/participation",
    requireAuth,
    requireRole([ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.LOGISTICS]),
    (req, res) => {
        const user = req.session.user;
        const date = req.query.date;

        if (user.role === ROLES.LOGISTICS) {
            const teams = getTeams();
            const allUsers = getAllUsers();
            const result = teams.map((t) => ({
                teamId: t.id,
                teamName: t.name,
                memberCount: allUsers.filter((u) => u.teamId === t.id).length,
            }));
            return res.json(result);
        }

        // TL sees own team; Admin sees all
        let members;
        if (user.role === ROLES.ADMIN) {
            members = getAllUsers();
        } else {
            members = getTeamMembers(user.teamId);
        }

        // If date provided, include meal status and location per member
        if (date) {
            const availableMeals = getAvailableMeals(date);

            const result = members.map((m) => ({
                id: m.id,
                name: m.name,
                role: m.role,
                teamId: m.teamId,
                location: getEffectiveLocation(m.id, date),
                meals: getUserMealStatus(m.id, availableMeals, date),
            }));
            return res.json(result);
        }

        // No date: return member list only
        const safe = members.map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            teamId: m.teamId,
        }));

        res.json(safe);
    }
);

export default router;
