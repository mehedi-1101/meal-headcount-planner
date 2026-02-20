import { readJson, writeJson } from "../storage/jsonStore.js";

const MEALS_FILE = "meals.json";

/**
 * Get today's date as YYYY-MM-DD string (local time).
 */
function getTodayDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * Get all meal participation records for a given date.
 */
export function getRecordsForDate(date) {
    const all = readJson(MEALS_FILE, []);
    return all.filter((r) => r.date === date);
}

/**
 * Opt a user OUT of a specific meal for a date.
 * If a record already exists, update it. Otherwise, create a new one.
 */
export function optOut(userId, mealType, updatedBy, date) {
    if (!date) date = getTodayDate();

    const all = readJson(MEALS_FILE, []);

    const existing = all.find(
        (r) => r.userId === userId && r.date === date && r.mealType === mealType
    );

    if (existing) {
        existing.status = "OUT";
        existing.updatedBy = updatedBy;
        existing.updatedAt = new Date().toISOString();
    } else {
        all.push({
            userId,
            date,
            mealType,
            status: "OUT",
            updatedBy,
            updatedAt: new Date().toISOString(),
        });
    }

    writeJson(MEALS_FILE, all);
}

/**
 * Opt a user back IN to a specific meal for a date.
 * Retains the record with status "IN" for audit trail
 * (who changed it and when), instead of deleting.
 */
export function optIn(userId, mealType, updatedBy, date) {
    if (!date) date = getTodayDate();

    const all = readJson(MEALS_FILE, []);

    const existing = all.find(
        (r) => r.userId === userId && r.date === date && r.mealType === mealType
    );

    if (existing) {
        existing.status = "IN";
        existing.updatedBy = updatedBy;
        existing.updatedAt = new Date().toISOString();
    } else {
        all.push({
            userId,
            date,
            mealType,
            status: "IN",
            updatedBy,
            updatedAt: new Date().toISOString(),
        });
    }

    writeJson(MEALS_FILE, all);
}

/**
 * Get a single user's participation status for all meals on a date.
 * Returns an object: { LUNCH: "IN", SNACKS: "OUT", ... }
 *
 * @param {string} userId
 * @param {Array<{type: string, default: string}>} availableMeals - meals with their defaults
 * @param {string} date
 */
export function getUserMealStatus(userId, availableMeals, date) {
    if (!date) date = getTodayDate();

    const records = getRecordsForDate(date);
    const status = {};

    for (const meal of availableMeals) {
        const record = records.find(
            (r) => r.userId === userId && r.mealType === meal.type
        );
        // Explicit record wins; otherwise fall back to the meal's default
        status[meal.type] = record ? record.status : meal.default;
    }

    return status;
}

/**
 * Get all participation records for a specific user on a date.
 */
export function getUserRecords(userId, date) {
    if (!date) date = getTodayDate();

    const records = getRecordsForDate(date);
    return records.filter((r) => r.userId === userId);
}
