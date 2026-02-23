import { readJson, writeJson } from "../storage/jsonStore.js";
import { getSettings } from "./settingsService.js";
import { LOCATIONS } from "../constants/locations.js";

const WORK_LOCATIONS_FILE = "workLocations.json";

function getAllRecords() {
    return readJson(WORK_LOCATIONS_FILE, []);
}

function findRecord(userId, date) {
    const all = getAllRecords();
    return all.find((r) => r.userId === userId && r.date === date) || null;
}

function isInCompanyWfhPeriod(date) {
    const settings = getSettings();
    return settings.companyWfhPeriods.some(
        (p) => date >= p.startDate && date <= p.endDate
    );
}

/**
 * Resolution order:
 * 1. Individual record exists → use it
 * 2. Company WFH period active → WFH
 * 3. No data → OFFICE (default)
 */
export function getEffectiveLocation(userId, date) {
    const record = findRecord(userId, date);
    if (record) return record.location;

    if (isInCompanyWfhPeriod(date)) return LOCATIONS.WFH;

    return LOCATIONS.OFFICE;
}

export function setLocation(userId, date, location, updatedBy) {
    const all = getAllRecords();
    const existing = all.find(
        (r) => r.userId === userId && r.date === date
    );

    if (existing) {
        existing.location = location;
        existing.updatedBy = updatedBy;
        existing.updatedAt = new Date().toISOString();
    } else {
        all.push({
            userId,
            date,
            location,
            updatedBy,
            updatedAt: new Date().toISOString(),
        });
    }

    writeJson(WORK_LOCATIONS_FILE, all);
}

export function getLocationRecord(userId, date) {
    return findRecord(userId, date);
}

/**
 * Count WFH days per user for a calendar month.
 *
 * @param {Array} userList  - array of user objects { id, name, teamId }
 * @param {string} month    - "YYYY-MM"
 * @param {number} allowance - monthlyWfhAllowance from settings
 * @returns {Array} [{ userId, name, teamId, wfhDays, overLimit, extraDays? }]
 */
export function getMonthlyWfhUsage(userList, month, allowance) {
    const all = getAllRecords();

    return userList.map((user) => {
        const wfhDays = all.filter(
            (r) => r.userId === user.id && r.location === LOCATIONS.WFH && r.date.startsWith(month)
        ).length;

        const overLimit = wfhDays > allowance;
        const entry = { userId: user.id, name: user.name, teamId: user.teamId, wfhDays, overLimit };
        if (overLimit) entry.extraDays = wfhDays - allowance;
        return entry;
    });
}
