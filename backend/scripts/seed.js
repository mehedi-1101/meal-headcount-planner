/**
 * Seed script — sets up initial data for a fresh environment.
 *
 * Use this when:
 *   - Cloning the repo for the first time
 *   - backend/data/ is empty (fresh branch, fresh clone)
 *   - You need a known working state for dev/testing
 *
 * Usage:
 *   node scripts/seed.js          — skips if users already exist
 *   node scripts/seed.js --force  — overwrites existing users and teams
 *
 * To add real users later, use:
 *   npm run create-user -- "Name" username password ROLE [teamId]
 *
 * Seed credentials: all users share password "pass123"
 * Change passwords before production use.
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
    { id: "mimir",         name: "Mimir" },
    { id: "saga",          name: "Saga" },
    { id: "vimond",        name: "Vimond" },
    { id: "admin-account", name: "Admin & Account" },
    { id: "marketing",     name: "Marketing" },
    { id: "logistics",     name: "Logistics" },
];

const DEFAULT_PASSWORD = "pass123";

// Users grouped by team for readability.
// Roles: EMPLOYEE | TEAM_LEAD | ADMIN | LOGISTICS
const SEED_USERS = [
    // Mimir
    { id: "u1000", name: "Sarah Johnson",    username: "sarah.j",    role: "TEAM_LEAD", teamId: "mimir" },
    { id: "u1001", name: "Michael Chen",     username: "michael.c",  role: "EMPLOYEE",  teamId: "mimir" },
    { id: "u1002", name: "Emily Rodriguez",  username: "emily.r",    role: "EMPLOYEE",  teamId: "mimir" },
    { id: "u1003", name: "David Kim",        username: "david.k",    role: "EMPLOYEE",  teamId: "mimir" },
    { id: "u1004", name: "Jessica Martinez", username: "jessica.m",  role: "EMPLOYEE",  teamId: "mimir" },
    { id: "u1005", name: "Ryan Thompson",    username: "ryan.t",     role: "EMPLOYEE",  teamId: "mimir" },
    // Saga
    { id: "u1006", name: "Amanda Foster",    username: "amanda.f",   role: "TEAM_LEAD", teamId: "saga" },
    { id: "u1007", name: "James Wilson",     username: "james.w",    role: "EMPLOYEE",  teamId: "saga" },
    { id: "u1008", name: "Sophia Patel",     username: "sophia.p",   role: "EMPLOYEE",  teamId: "saga" },
    { id: "u1009", name: "Daniel Brown",     username: "daniel.b",   role: "EMPLOYEE",  teamId: "saga" },
    { id: "u1010", name: "Olivia Davis",     username: "olivia.d",   role: "EMPLOYEE",  teamId: "saga" },
    { id: "u1011", name: "Ethan Miller",     username: "ethan.m",    role: "EMPLOYEE",  teamId: "saga" },
    { id: "u1012", name: "Isabella Garcia",  username: "isabella.g", role: "EMPLOYEE",  teamId: "saga" },
    // Vimond
    { id: "u1013", name: "Christopher Lee",  username: "chris.l",    role: "TEAM_LEAD", teamId: "vimond" },
    { id: "u1014", name: "Ava Anderson",     username: "ava.a",      role: "EMPLOYEE",  teamId: "vimond" },
    { id: "u1015", name: "Matthew Taylor",   username: "matthew.t",  role: "EMPLOYEE",  teamId: "vimond" },
    { id: "u1016", name: "Mia Thomas",       username: "mia.t",      role: "EMPLOYEE",  teamId: "vimond" },
    { id: "u1017", name: "Joshua Jackson",   username: "joshua.j",   role: "EMPLOYEE",  teamId: "vimond" },
    { id: "u1018", name: "Charlotte White",  username: "charlotte.w",role: "EMPLOYEE",  teamId: "vimond" },
    { id: "u1019", name: "Andrew Harris",    username: "andrew.h",   role: "EMPLOYEE",  teamId: "vimond" },
    { id: "u1020", name: "Amelia Martin",    username: "amelia.m",   role: "EMPLOYEE",  teamId: "vimond" },
    // Admin & Account
    { id: "u1021", name: "Robert Clark",     username: "robert.c",   role: "TEAM_LEAD", teamId: "admin-account" },
    { id: "u1022", name: "Emma Lewis",       username: "emma.l",     role: "EMPLOYEE",  teamId: "admin-account" },
    { id: "u1023", name: "William Walker",   username: "william.w",  role: "EMPLOYEE",  teamId: "admin-account" },
    { id: "u1024", name: "Grace Hall",       username: "grace.h",    role: "EMPLOYEE",  teamId: "admin-account" },
    { id: "u1025", name: "Benjamin Allen",   username: "benjamin.a", role: "EMPLOYEE",  teamId: "admin-account" },
    // Marketing
    { id: "u1026", name: "Victoria Young",   username: "victoria.y", role: "TEAM_LEAD", teamId: "marketing" },
    { id: "u1027", name: "Alexander King",   username: "alex.k",     role: "EMPLOYEE",  teamId: "marketing" },
    { id: "u1028", name: "Lily Wright",      username: "lily.w",     role: "EMPLOYEE",  teamId: "marketing" },
    { id: "u1029", name: "Nathan Scott",     username: "nathan.s",   role: "EMPLOYEE",  teamId: "marketing" },
    { id: "u1030", name: "Zoe Green",        username: "zoe.g",      role: "EMPLOYEE",  teamId: "marketing" },
    { id: "u1031", name: "Lucas Adams",      username: "lucas.a",    role: "EMPLOYEE",  teamId: "marketing" },
    // Logistics
    { id: "u1032", name: "Rachel Baker",     username: "rachel.b",   role: "LOGISTICS", teamId: "logistics" },
    // System roles (no team — app-level roles, not tied to a department)
    { id: "u1033", name: "System Admin",     username: "admin",      role: "ADMIN",     teamId: null },
];

// Default settings applied on a fresh seed
const DEFAULT_SETTINGS = {
    cutoffTime: "22:00",
    offDays: [6, 0], // Saturday, Sunday
    iftarPeriods: [],
    companyWfhPeriods: [],
};

// --- Helpers ---

function dataFileExists(filename) {
    const fullPath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(fullPath)) return false;
    try {
        const data = readJson(filename, null);
        return Array.isArray(data) ? data.length > 0 : data !== null;
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

    // Settings
    if (!force && dataFileExists("settings.json")) {
        console.log("settings.json already has data — skipping (use --force to overwrite)");
    } else {
        writeJson("settings.json", DEFAULT_SETTINGS);
        console.log("settings.json — wrote defaults (cutoff 22:00, off days Sat+Sun)");
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
        console.log("  Username       Role        Team");
        console.log("  -------------  ----------  ---------------");
        for (const u of users) {
            console.log(`  ${u.username.padEnd(15)}${u.role.padEnd(12)}${u.teamId ?? "none"}`);
        }
    }

    console.log("\nDone.");
    console.log("To add more users: npm run create-user -- \"Full Name\" username password ROLE [teamId]");
}

main().catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
});
