import express from "express";
import { MEAL_TYPES } from "../constants/mealTypes.js";
import { ROLES } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getUserMealStatus, getHeadcount } from "../services/mealService.js";
import { getAllUsers, getUserById } from "../services/userService.js";

const router = express.Router();

/**
 * GET / — redirect to dashboard if logged in, else to login
 */
router.get("/", (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect("/dashboard");
    }
    res.redirect("/login");
});

/**
 * GET /login — render login page
 */
router.get("/login", (req, res) => {
    // If already logged in, go to dashboard
    if (req.session && req.session.user) {
        return res.redirect("/dashboard");
    }
    res.render("login", { error: null });
});

/**
 * POST /login — handle login form submission (form-based, not API)
 */
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render("login", { error: "Please enter both username and password" });
    }

    // Dynamically import to avoid circular deps
    const { getUserByUsername } = await import("../services/userService.js");
    const { verifyPassword } = await import("../services/passwordService.js");

    const user = getUserByUsername(username);

    if (!user) {
        return res.render("login", { error: "Invalid username or password" });
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
        return res.render("login", { error: "Invalid username or password" });
    }

    req.session.user = {
        id: user.id,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
    };

    res.redirect("/dashboard");
});

/**
 * GET /dashboard — employee meal view
 */
router.get("/dashboard", requireAuth, (req, res) => {
    const user = req.session.user;
    const mealStatus = getUserMealStatus(user.id, MEAL_TYPES);

    res.render("dashboard", {
        user,
        mealTypes: MEAL_TYPES,
        mealStatus,
    });
});

/**
 * GET /headcount-view — headcount page for Admin/Logistics
 */
router.get(
    "/headcount-view",
    requireAuth,
    requireRole([ROLES.ADMIN, ROLES.LOGISTICS]),
    (req, res) => {
        const data = getHeadcount(MEAL_TYPES);
        res.render("headcount", {
            user: req.session.user,
            data,
            mealTypes: MEAL_TYPES,
        });
    }
);

/**
 * GET /override — override page for Team Lead / Admin
 */
router.get(
    "/override",
    requireAuth,
    requireRole([ROLES.ADMIN, ROLES.TEAM_LEAD]),
    (req, res) => {
        const currentUser = req.session.user;
        let teamMembers;

        if (currentUser.role === ROLES.ADMIN) {
            // Admin sees all users
            teamMembers = getAllUsers().map((u) => ({
                id: u.id,
                name: u.name,
                username: u.username,
                role: u.role,
                teamId: u.teamId,
            }));
        } else {
            // Team Lead sees only own team
            teamMembers = getAllUsers()
                .filter((u) => u.teamId === currentUser.teamId && u.id !== currentUser.id)
                .map((u) => ({
                    id: u.id,
                    name: u.name,
                    username: u.username,
                    role: u.role,
                    teamId: u.teamId,
                }));
        }

        // Get meal status for each team member
        const membersWithStatus = teamMembers.map((member) => ({
            ...member,
            mealStatus: getUserMealStatus(member.id, MEAL_TYPES),
        }));

        res.render("override", {
            user: currentUser,
            members: membersWithStatus,
            mealTypes: MEAL_TYPES,
        });
    }
);

/**
 * POST /logout — destroy session and redirect to login
 */
router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

export default router;
