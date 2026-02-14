import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import mealRoutes from "./routes/meals.js";
import headcountRoutes from "./routes/headcount.js";
import pageRoutes from "./routes/pages.js";
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

// Parse form data and JSON bodies
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

// View engine setup (EJS for server-rendered pages)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Routes ---

// API routes
app.use("/auth", authRoutes);
app.use("/meals", mealRoutes);
app.use("/headcount", headcountRoutes);

// Page routes (server-rendered views)
app.use("/", pageRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handler (must be last)
app.use(errorHandler);

// --- Start Server ---

const server = app.listen(PORT, () => {
  console.log(`MHP backend running on http://localhost:${PORT}`);
});
