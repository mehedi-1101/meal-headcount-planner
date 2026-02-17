import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import mealRoutes from "./routes/meals.js";
import headcountRoutes from "./routes/headcount.js";
import specialDaysRoutes from "./routes/specialDays.js";
import settingsRoutes from "./routes/settings.js";
import teamRoutes from "./routes/team.js";
import workLocationRoutes from "./routes/workLocation.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

// __dirname is not available in ESM, so we derive it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET not set. Using default (not secure for production)');
}

// --- Middleware ---

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session config
app.use(
  session({
    name: "mhp-session",
    secret: process.env.SESSION_SECRET || "dev-secret-change-later",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
    },
  })
);

// --- API Routes ---

app.use("/api/auth", authRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/headcount", headcountRoutes);
app.use("/api/special-days", specialDaysRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/work-location", workLocationRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// --- Static files (React build output) ---

app.use(express.static(path.join(__dirname, "..", "public")));

// Catch-all: serve index.html for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// Error handler (must be last)
app.use(errorHandler);

// --- Start Server ---

const server = app.listen(PORT, () => {
  console.log(`MHP backend running on http://localhost:${PORT}`);
});

export default app;
