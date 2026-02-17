import { getEffectiveLocation, setLocation, getLocationRecord } from "../../src/services/workLocationService.js";
import { writeJson } from "../../src/storage/jsonStore.js";

describe("workLocationService", () => {
    beforeEach(() => {
        writeJson("workLocations.json", []);
        writeJson("settings.json", {
            cutoffTime: "22:00",
            offDays: [6, 0],
            iftarPeriods: [],
            companyWfhPeriods: [],
        });
    });

    test("defaults to OFFICE when no record and no WFH period", () => {
        const location = getEffectiveLocation("user1", "2026-02-16");
        expect(location).toBe("OFFICE");
    });

    test("returns WFH during company WFH period", () => {
        writeJson("settings.json", {
            cutoffTime: "22:00",
            offDays: [6, 0],
            iftarPeriods: [],
            companyWfhPeriods: [
                { startDate: "2026-02-15", endDate: "2026-02-20", label: "WFH Week" },
            ],
        });
        const location = getEffectiveLocation("user1", "2026-02-16");
        expect(location).toBe("WFH");
    });

    test("individual record overrides company WFH period", () => {
        writeJson("settings.json", {
            cutoffTime: "22:00",
            offDays: [6, 0],
            iftarPeriods: [],
            companyWfhPeriods: [
                { startDate: "2026-02-15", endDate: "2026-02-20", label: "WFH Week" },
            ],
        });
        setLocation("user1", "2026-02-16", "OFFICE", "user1");
        const location = getEffectiveLocation("user1", "2026-02-16");
        expect(location).toBe("OFFICE");
    });

    test("individual record overrides default OFFICE", () => {
        setLocation("user1", "2026-02-16", "WFH", "user1");
        const location = getEffectiveLocation("user1", "2026-02-16");
        expect(location).toBe("WFH");
    });

    test("setLocation upserts existing record", () => {
        setLocation("user1", "2026-02-16", "WFH", "user1");
        setLocation("user1", "2026-02-16", "OFFICE", "admin1");
        const record = getLocationRecord("user1", "2026-02-16");
        expect(record.location).toBe("OFFICE");
        expect(record.updatedBy).toBe("admin1");
    });

    test("getLocationRecord returns null when no record exists", () => {
        const record = getLocationRecord("user1", "2026-02-16");
        expect(record).toBeNull();
    });

    test("different users have independent records", () => {
        setLocation("user1", "2026-02-16", "WFH", "user1");
        const loc1 = getEffectiveLocation("user1", "2026-02-16");
        const loc2 = getEffectiveLocation("user2", "2026-02-16");
        expect(loc1).toBe("WFH");
        expect(loc2).toBe("OFFICE");
    });
});
