import express from "express";
import { getUserByUsername } from "../services/userService.js";
import { verifyPassword } from "../services/passwordService.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const user = getUserByUsername(username);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordValid = await verifyPassword(
    password,
    user.passwordHash
  );

  if (!passwordValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  req.session.user = {
    id: user.id,
    role: user.role,
    teamId: user.teamId,
  };

  res.json({ message: "Login successful" });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

export default router;
