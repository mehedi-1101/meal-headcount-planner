import { readJson, writeJson } from "../storage/jsonStore.js";

const SPECIAL_DAYS_FILE = "specialDays.json";

export function getAllSpecialDays() {
    return readJson(SPECIAL_DAYS_FILE, []);
}

export function getSpecialDay(date) {
    const all = getAllSpecialDays();
    return all.find((d) => d.date === date) || null;
}

export function createSpecialDay({ date, type, note, meals, createdBy }) {
    const all = getAllSpecialDays();

    if (all.find((d) => d.date === date)) {
        throw new Error(`Special day already exists for ${date}`);
    }

    const entry = {
        date,
        type,
        note: note || "",
        meals: meals || [],
        createdBy,
        createdAt: new Date().toISOString(),
    };

    all.push(entry);
    writeJson(SPECIAL_DAYS_FILE, all);
    return entry;
}

export function updateSpecialDay(date, updates) {
    const all = getAllSpecialDays();
    const index = all.findIndex((d) => d.date === date);

    if (index === -1) {
        throw new Error(`No special day found for ${date}`);
    }

    all[index] = { ...all[index], ...updates, updatedAt: new Date().toISOString() };
    writeJson(SPECIAL_DAYS_FILE, all);
    return all[index];
}

export function deleteSpecialDay(date) {
    const all = getAllSpecialDays();
    const filtered = all.filter((d) => d.date !== date);

    if (filtered.length === all.length) {
        throw new Error(`No special day found for ${date}`);
    }

    writeJson(SPECIAL_DAYS_FILE, filtered);
}
