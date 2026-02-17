import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { getTeams, getTeamMembers, getAllUsers } from "../services/userService.js";

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
    res.json(getTeams());
});

router.get(
    "/participation",
    requireAuth,
    requireRole([ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.LOGISTICS]),
    (req, res) => {
        const user = req.session.user;

        if (user.role === ROLES.LOGISTICS) {
            // Logistics sees team-level aggregates only, no individual names
            const teams = getTeams();
            const allUsers = getAllUsers();
            const result = teams.map((t) => ({
                teamId: t.id,
                teamName: t.name,
                memberCount: allUsers.filter((u) => u.teamId === t.id).length,
            }));
            return res.json(result);
        }

        // Team Lead sees own team; Admin sees all
        let members;
        if (user.role === ROLES.ADMIN) {
            members = getAllUsers();
        } else {
            members = getTeamMembers(user.teamId);
        }

        // Strip sensitive fields
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
