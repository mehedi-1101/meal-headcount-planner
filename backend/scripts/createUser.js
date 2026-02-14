/**
 * CLI script to create a user with a hashed password.
 * Usage: node scripts/createUser.js <name> <username> <password> <role> [teamId]
 * Example: node scripts/createUser.js "Mehedi Hasan" mehedi pass123 ADMIN team-a
 */

import { readJson, writeJson } from "../src/storage/jsonStore.js";
import { hashPassword } from "../src/services/passwordService.js";

const VALID_ROLES = ["EMPLOYEE", "TEAM_LEAD", "ADMIN", "LOGISTICS"];

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 4) {
        console.log(
            'Usage: node scripts/createUser.js <name> <username> <password> <role> [teamId]'
        );
        console.log(
            'Example: node scripts/createUser.js "Alice" alice pass123 EMPLOYEE team-a'
        );
        process.exit(1);
    }

    const [name, username, password, role, teamId] = args;

    // Validate role
    if (!VALID_ROLES.includes(role)) {
        console.error(`Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(", ")}`);
        process.exit(1);
    }

    // Load existing users
    const users = readJson("users.json", []);

    // Check for duplicate username
    if (users.find((u) => u.username === username)) {
        console.error(`Username "${username}" already exists.`);
        process.exit(1);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate ID
    const id = `u${Date.now()}`;

    // Create user object
    const newUser = {
        id,
        name,
        username,
        passwordHash,
        role,
        teamId: teamId || null,
    };

    users.push(newUser);
    writeJson("users.json", users);

    console.log(`User created successfully:`);
    console.log(`  ID: ${id}`);
    console.log(`  Name: ${name}`);
    console.log(`  Username: ${username}`);
    console.log(`  Role: ${role}`);
    console.log(`  Team: ${teamId || "(none)"}`);
}

main().catch((err) => {
    console.error("Error creating user:", err.message);
    process.exit(1);
});
