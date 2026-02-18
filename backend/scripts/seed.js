/**
 * Seed script — sets up initial data for a fresh environment.
 *
 * Use this when:
 *   - Starting on a fresh branch
 *   - data/ folder is empty or missing auth fields
 *   - You need a known working state for dev/testing
 *
 * Usage:
 *   node scripts/seed.js          — skips if users already exist
 *   node scripts/seed.js --force  — overwrites existing users and teams
 *
 * To add real users later, use:
 *   npm run create-user -- "Name" username password ROLE [teamId]
 */

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { writeJson, readJson } from "../src/storage/jsonStore.js";
import { hashPassword } from "../src/services/passwordService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

const force = process.argv.includes("--force");

// --- Seed data ---

const SEED_TEAMS = [
    { id: "team-a", name: "Engineering Alpha" },
    { id: "team-b", name: "Engineering Beta" },
];

// All seed users share the same default password.
// Change passwords in production using the create-user script.
const DEFAULT_PASSWORD = "pass123";

const SEED_USERS = [
    { id: "u1", name: "Alice",          username: "alice",     role: "EMPLOYEE",  teamId: "team-a" },
    { id: "u2", name: "Bob",            username: "bob",       role: "TEAM_LEAD", teamId: "team-a" },
    { id: "u3", name: "Carol",          username: "carol",     role: "EMPLOYEE",  teamId: "team-b" },
    { id: "u4", name: "Dave",           username: "dave",      role: "TEAM_LEAD", teamId: "team-b" },
    { id: "u-admin",     name: "Admin",     username: "admin",     role: "ADMIN",     teamId: null },
    { id: "u-logistics", name: "Logistics", username: "logistics", role: "LOGISTICS", teamId: null },
];

// --- Helpers ---

function dataFileExists(filename) {
    const fullPath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(fullPath)) return false;
    try {
        const data = readJson(filename, null);
        return Array.isArray(data) && data.length > 0;
    } catch {
        return false;
    }
}

// --- Main ---

async function main() {
    console.log("MHP Seed Script\n");

    // Ensure data dir exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Teams
    if (!force && dataFileExists("teams.json")) {
        console.log("teams.json already has data — skipping (use --force to overwrite)");
    } else {
        writeJson("teams.json", SEED_TEAMS);
        console.log(`teams.json — wrote ${SEED_TEAMS.length} teams`);
    }

    // Users
    if (!force && dataFileExists("users.json")) {
        const existing = readJson("users.json", []);
        const missingAuth = existing.filter((u) => !u.username || !u.passwordHash);
        if (missingAuth.length > 0) {
            console.log(`\nWARNING: users.json has ${missingAuth.length} user(s) without username/passwordHash.`);
            console.log("Run with --force to replace them with seed users, or use create-user script to add auth fields.");
        } else {
            console.log("users.json already has data — skipping (use --force to overwrite)");
        }
    } else {
        const passwordHash = await hashPassword(DEFAULT_PASSWORD);
        const users = SEED_USERS.map((u) => ({ ...u, passwordHash }));
        writeJson("users.json", users);
        console.log(`users.json — wrote ${users.length} users (password: "${DEFAULT_PASSWORD}")`);
        console.log("");
        console.log("  Username    Role        Team");
        console.log("  ----------  ----------  --------");
        for (const u of users) {
            console.log(`  ${u.username.padEnd(12)}${u.role.padEnd(12)}${u.teamId ?? "none"}`);
        }
    }

    console.log("\nDone.");
    console.log("To add more users: npm run create-user -- \"Full Name\" username password ROLE [teamId]");
}

main().catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
});
