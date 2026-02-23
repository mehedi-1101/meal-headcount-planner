import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { getAllUsers, getTeamMembers } from "../services/userService.js";
import { getMonthlyWfhUsage } from "../services/workLocationService.js";
import { getSettings } from "../services/settingsService.js";

const router = express.Router();

/**
 * GET /api/reports/wfh-overage?month=YYYY-MM
 * Returns only over-limit employees with rollup summary.
 * Employee → 403. TL → own team. Admin/Logistics → all.
 */
router.get("/wfh-overage", requireAuth, (req, res) => {
    const user = req.session.user;

    if (user.role === ROLES.EMPLOYEE) {
        return res.status(403).json({ error: "Access denied" });
    }

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const { monthlyWfhAllowance } = getSettings();

    let userList;
    if (user.role === ROLES.TEAM_LEAD) {
        userList = getTeamMembers(user.teamId);
    } else {
        userList = getAllUsers();
    }

    const allUsage = getMonthlyWfhUsage(userList, month, monthlyWfhAllowance);
    const overLimit = allUsage.filter((u) => u.overLimit);

    const summary = {
        overLimitCount: overLimit.length,
        totalExtraDays: overLimit.reduce((sum, u) => sum + (u.extraDays || 0), 0),
    };

    res.json({ month, allowance: monthlyWfhAllowance, summary, employees: overLimit });
});

export default router;
