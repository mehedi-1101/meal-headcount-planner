import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { getTeamMembers } from "../services/userService.js";
import { getAuditEntries } from "../services/auditService.js";

const router = express.Router();

/**
 * GET /api/audit?userId=X&date=YYYY-MM-DD
 * Returns audit history for a user on a date.
 * EMPLOYEE → 403. TL → own team only. Admin/Logistics → all.
 */
router.get("/", requireAuth, (req, res) => {
    const currentUser = req.session.user;

    if (currentUser.role === ROLES.EMPLOYEE) {
        return res.status(403).json({ error: "Access denied" });
    }

    const { userId, date } = req.query;
    if (!userId) {
        return res.status(400).json({ error: "userId query param is required" });
    }

    if (currentUser.role === ROLES.TEAM_LEAD) {
        const teamMemberIds = getTeamMembers(currentUser.teamId).map((u) => u.id);
        if (!teamMemberIds.includes(userId)) {
            return res.status(403).json({ error: "Team Leads can only view audit logs for their own team members" });
        }
    }

    const entries = getAuditEntries({
        userId,
        date: date || undefined,
        actorRole: currentUser.role,
        actorTeamId: currentUser.teamId,
    });

    res.json({ userId, date: date || null, entries });
});

export default router;
