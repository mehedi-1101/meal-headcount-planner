import { getAvailableMeals } from "../../src/services/availabilityService.js";
import { writeJson } from "../../src/storage/jsonStore.js";

describe("availabilityService", () => {
    beforeEach(() => {
        writeJson("specialDays.json", []);
        writeJson("settings.json", {
            cutoffTime: "22:00",
            offDays: [6, 0],
            iftarPeriods: [
                { startDate: "2026-03-01", endDate: "2026-03-30", label: "Ramadan" },
            ],
            companyWfhPeriods: [],
        });
    });

    test("returns Lunch + Snacks + Iftar(OUT) on a regular weekday", () => {
        // 2026-02-16 is Monday
        const meals = getAvailableMeals("2026-02-16");
        expect(meals).toHaveLength(3);
        expect(meals[0]).toEqual({ type: "LUNCH", default: "IN" });
        expect(meals[1]).toEqual({ type: "SNACKS", default: "IN" });
        expect(meals[2]).toEqual({ type: "IFTAR", default: "OUT" });
    });

    test("returns empty array on weekend (Saturday)", () => {
        // 2026-02-21 is Saturday
        const meals = getAvailableMeals("2026-02-21");
        expect(meals).toEqual([]);
    });

    test("returns empty array on weekend (Sunday)", () => {
        // 2026-02-22 is Sunday
        const meals = getAvailableMeals("2026-02-22");
        expect(meals).toEqual([]);
    });

    test("returns Iftar with default IN during Ramadan", () => {
        // 2026-03-16 is Monday, inside the Iftar period
        const meals = getAvailableMeals("2026-03-16");
        const iftar = meals.find((m) => m.type === "IFTAR");
        expect(iftar.default).toBe("IN");
    });

    test("returns empty array on govt holiday", () => {
        writeJson("specialDays.json", [
            { date: "2026-02-16", type: "GOVT_HOLIDAY", note: "Test", meals: [] },
        ]);
        const meals = getAvailableMeals("2026-02-16");
        expect(meals).toEqual([]);
    });

    test("returns empty array on office closed", () => {
        writeJson("specialDays.json", [
            { date: "2026-02-16", type: "OFFICE_CLOSED", note: "", meals: [] },
        ]);
        const meals = getAvailableMeals("2026-02-16");
        expect(meals).toEqual([]);
    });

    test("includes EVENT_DINNER on celebration day", () => {
        writeJson("specialDays.json", [
            { date: "2026-02-16", type: "CELEBRATION", note: "Party", meals: ["EVENT_DINNER"] },
        ]);
        const meals = getAvailableMeals("2026-02-16");
        expect(meals).toHaveLength(4);
        const dinner = meals.find((m) => m.type === "EVENT_DINNER");
        expect(dinner.default).toBe("IN");
    });

    test("includes OPTIONAL_DINNER with default OUT on celebration day", () => {
        writeJson("specialDays.json", [
            { date: "2026-02-16", type: "CELEBRATION", note: "Party", meals: ["OPTIONAL_DINNER"] },
        ]);
        const meals = getAvailableMeals("2026-02-16");
        const dinner = meals.find((m) => m.type === "OPTIONAL_DINNER");
        expect(dinner.default).toBe("OUT");
    });
});
