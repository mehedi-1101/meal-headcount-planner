import express from "express";
import { MEAL_TYPES } from "../constants/mealTypes.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import { getHeadcount } from "../services/mealService.js";

const router = express.Router();

/**
 * GET /headcount
 * Returns aggregated headcount per meal type for today.
 * Only ADMIN and LOGISTICS can access this.
 */
router.get(
    "/",
    requireAuth,
    requireRole([ROLES.ADMIN, ROLES.LOGISTICS]),
    (req, res) => {
        const data = getHeadcount(MEAL_TYPES);
        res.json(data);
    }
);

export default router;
