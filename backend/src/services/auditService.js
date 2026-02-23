import { readJson, writeJson } from "../storage/jsonStore.js";
import { getTeamMembers } from "./userService.js";
import { ROLES } from "../constants/roles.js";

function auditFileName(month) {
    return `auditLogs-${month}.json`;
}

function currentMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

/**
 * Append an audit log entry after a successful mutation.
 * Non-blocking by design — callers must catch errors themselves.
 *
 * @param {object} entry
 * @param {string} entry.actorId
 * @param {string} entry.actorName
 * @param {string|null} entry.targetUserId  - null for bulk overrides
 * @param {string} entry.actionType         - MEAL_OPT_OUT | MEAL_OPT_IN | MEAL_OVERRIDE | BULK_OVERRIDE | LOCATION_CHANGE | LOCATION_OVERRIDE
 * @param {object} entry.details            - { date, mealType?, status?, location?, startDate?, endDate?, mealTypes?, userIds? }
 */
export function logAction({ actorId, actorName, targetUserId, actionType, details }) {
    const timestamp = new Date().toISOString();
    // Derive file month from the event's date (local YYYY-MM-DD), not UTC timestamp,
    // so getAuditEntries always reads from the same file it was written to.
    const eventDate = details?.date || details?.startDate;
    const month = eventDate ? eventDate.slice(0, 7) : currentMonth();
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

    const fileName = auditFileName(month);
    const existing = readJson(fileName, []);

    existing.push({ id, timestamp, actorId, actorName, targetUserId: targetUserId ?? null, actionType, details });
    writeJson(fileName, existing);
}

/**
 * Read audit entries scoped by role.
 *
 * @param {object} params
 * @param {string} params.userId       - whose records to fetch
 * @param {string} [params.date]       - YYYY-MM-DD; if omitted, returns whole month
 * @param {string} params.actorRole    - role of the requesting user
 * @param {string} params.actorTeamId  - teamId of the requesting user (for TL scoping)
 * @returns {Array} filtered + sorted entries
 */
export function getAuditEntries({ userId, date, actorRole, actorTeamId }) {
    const month = date ? date.slice(0, 7) : currentMonth();
    const entries = readJson(auditFileName(month), []);

    let filtered = entries;

    // Filter to the requested user
    if (userId) {
        filtered = filtered.filter((e) => e.targetUserId === userId);
    }

    // Filter to the requested date
    if (date) {
        filtered = filtered.filter((e) => e.details?.date === date);
    }

    // Team Lead: only entries for their own team members
    if (actorRole === ROLES.TEAM_LEAD) {
        const teamMemberIds = getTeamMembers(actorTeamId).map((u) => u.id);
        filtered = filtered.filter((e) => teamMemberIds.includes(e.targetUserId));
    }

    return filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
