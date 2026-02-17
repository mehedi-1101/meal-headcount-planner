import { readJson, writeJson } from "../storage/jsonStore.js";

const SETTINGS_FILE = "settings.json";

const DEFAULTS = {
    cutoffTime: "22:00",
    offDays: [6, 0],
    iftarPeriods: [],
    companyWfhPeriods: [],
};

export function getSettings() {
    const stored = readJson(SETTINGS_FILE, null);
    if (!stored) return { ...DEFAULTS };
    return { ...DEFAULTS, ...stored };
}

export function updateSettings(data) {
    writeJson(SETTINGS_FILE, data);
    return data;
}
