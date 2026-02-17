import { getHeadcountReport } from "../../src/services/headcountService.js";
import { writeJson } from "../../src/storage/jsonStore.js";
import { optOut, optIn } from "../../src/services/mealService.js";

describe("headcountService", () => {
    beforeEach(() => {
        writeJson("meals.json", []);
        writeJson("workLocations.json", []);
        writeJson("specialDays.json", []);
        writeJson("teams.json", [
            { id: "team-a", name: "Engineering Alpha" },
            { id: "team-b", name: "Engineering Beta" },
        ]);
        writeJson("users.json", [
            { id: "u1", name: "Alice", role: "EMPLOYEE", teamId: "team-a" },
            { id: "u2", name: "Bob", role: "EMPLOYEE", teamId: "team-a" },
            { id: "u3", name: "Carol", role: "EMPLOYEE", teamId: "team-b" },
        ]);
        writeJson("settings.json", {
            cutoffTime: "22:00",
            offDays: [6, 0],
            iftarPeriods: [],
            companyWfhPeriods: [],
        });
    });

    test("returns correct structure for a regular weekday", () => {
        // 2026-02-16 is Monday
        const report = getHeadcountReport("2026-02-16");
        expect(report.date).toBe("2026-02-16");
        expect(report.specialDay).toBeNull();
        expect(report.totalUsers).toBe(3);
        expect(report.officeCount).toBe(3);
        expect(report.wfhCount).toBe(0);
        expect(report.meals).toHaveLength(3); // LUNCH, SNACKS, IFTAR
        expect(report.byTeam).toHaveLength(2);
    });

    test("default-IN meals count all office users minus opted out", () => {
        optOut("u1", "LUNCH", "u1", "2026-02-16");
        const report = getHeadcountReport("2026-02-16");
        const lunch = report.meals.find((m) => m.type === "LUNCH");
        expect(lunch.headcount).toBe(2); // 3 office - 1 opted out
    });

    test("default-OUT meals count only opted-in office users", () => {
        // Iftar outside Ramadan defaults to OUT
        optIn("u1", "IFTAR", "u1", "2026-02-16");
        const report = getHeadcountReport("2026-02-16");
        const iftar = report.meals.find((m) => m.type === "IFTAR");
        expect(iftar.default).toBe("OUT");
        expect(iftar.headcount).toBe(1); // only u1 opted in
    });

    test("WFH users excluded from headcount", () => {
        writeJson("workLocations.json", [
            { userId: "u1", date: "2026-02-16", location: "WFH", updatedBy: "u1" },
        ]);
        const report = getHeadcountReport("2026-02-16");
        expect(report.officeCount).toBe(2);
        expect(report.wfhCount).toBe(1);
        const lunch = report.meals.find((m) => m.type === "LUNCH");
        expect(lunch.headcount).toBe(2); // only 2 office users
    });

    test("WFH user opt-out does not affect headcount", () => {
        writeJson("workLocations.json", [
            { userId: "u1", date: "2026-02-16", location: "WFH", updatedBy: "u1" },
        ]);
        optOut("u1", "LUNCH", "u1", "2026-02-16");
        const report = getHeadcountReport("2026-02-16");
        const lunch = report.meals.find((m) => m.type === "LUNCH");
        // u1 is WFH so their opt-out shouldn't matter: 2 office users, none opted out
        expect(lunch.headcount).toBe(2);
    });

    test("byTeam breakdown shows office/WFH per team", () => {
        writeJson("workLocations.json", [
            { userId: "u2", date: "2026-02-16", location: "WFH", updatedBy: "u2" },
        ]);
        const report = getHeadcountReport("2026-02-16");
        const teamA = report.byTeam.find((t) => t.teamId === "team-a");
        const teamB = report.byTeam.find((t) => t.teamId === "team-b");
        expect(teamA.officeCount).toBe(1); // u1 office, u2 WFH
        expect(teamA.wfhCount).toBe(1);
        expect(teamB.officeCount).toBe(1); // u3 office
        expect(teamB.wfhCount).toBe(0);
    });

    test("returns empty meals on weekend", () => {
        // 2026-02-21 is Saturday
        const report = getHeadcountReport("2026-02-21");
        expect(report.meals).toEqual([]);
        expect(report.totalUsers).toBe(0);
    });

    test("returns empty meals on government holiday", () => {
        writeJson("specialDays.json", [
            { date: "2026-02-16", type: "GOVT_HOLIDAY", note: "Holiday" },
        ]);
        const report = getHeadcountReport("2026-02-16");
        expect(report.meals).toEqual([]);
        expect(report.specialDay).toBeDefined();
        expect(report.specialDay.type).toBe("GOVT_HOLIDAY");
    });

    test("Iftar defaults IN during Ramadan", () => {
        writeJson("settings.json", {
            cutoffTime: "22:00",
            offDays: [6, 0],
            iftarPeriods: [
                { startDate: "2026-03-01", endDate: "2026-03-30", label: "Ramadan" },
            ],
            companyWfhPeriods: [],
        });
        // 2026-03-16 is Monday
        const report = getHeadcountReport("2026-03-16");
        const iftar = report.meals.find((m) => m.type === "IFTAR");
        expect(iftar.default).toBe("IN");
        expect(iftar.headcount).toBe(3); // all office users
    });

    test("byTeam includes team name from teams.json", () => {
        const report = getHeadcountReport("2026-02-16");
        const teamA = report.byTeam.find((t) => t.teamId === "team-a");
        expect(teamA.name).toBe("Engineering Alpha");
    });
});
