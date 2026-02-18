import { enforceCutoff } from "../../src/middleware/cutoff.js";
import { writeJson } from "../../src/storage/jsonStore.js";

describe("cutoff middleware", () => {
    beforeEach(() => {
        writeJson("settings.json", {
            cutoffTime: "22:00",
            offDays: [6, 0],
            iftarPeriods: [],
            companyWfhPeriods: [],
        });
    });

    function createMocks(role, targetDate) {
        const req = {
            session: { user: { id: "u1", role, teamId: "team-a" } },
            body: { date: targetDate },
        };
        const res = {
            statusCode: null,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.body = data; },
        };
        const next = () => { next.called = true; };
        next.called = false;
        return { req, res, next };
    }

    test("allows Admin regardless of cutoff", () => {
        // Use a date far in the past — should still pass for Admin
        const { req, res, next } = createMocks("ADMIN", "2020-01-01");
        const middleware = enforceCutoff((r) => r.body.date);
        middleware(req, res, next);
        expect(next.called).toBe(true);
    });

    test("allows Team Lead regardless of cutoff", () => {
        const { req, res, next } = createMocks("TEAM_LEAD", "2020-01-01");
        const middleware = enforceCutoff((r) => r.body.date);
        middleware(req, res, next);
        expect(next.called).toBe(true);
    });

    test("blocks Employee for past date", () => {
        const { req, res, next } = createMocks("EMPLOYEE", "2020-01-01");
        const middleware = enforceCutoff((r) => r.body.date);
        middleware(req, res, next);
        expect(next.called).toBe(false);
        expect(res.statusCode).toBe(403);
        expect(res.body.error).toContain("locked");
    });

    test("allows Employee for far future date", () => {
        const { req, res, next } = createMocks("EMPLOYEE", "2099-12-31");
        const middleware = enforceCutoff((r) => r.body.date);
        middleware(req, res, next);
        expect(next.called).toBe(true);
    });

    test("blocks Logistics for past date", () => {
        const { req, res, next } = createMocks("LOGISTICS", "2020-01-01");
        const middleware = enforceCutoff((r) => r.body.date);
        middleware(req, res, next);
        expect(next.called).toBe(false);
        expect(res.statusCode).toBe(403);
    });

    test("calls next when date extractor returns null", () => {
        const { req, res, next } = createMocks("EMPLOYEE", undefined);
        const middleware = enforceCutoff((r) => r.body.date);
        middleware(req, res, next);
        expect(next.called).toBe(true);
    });
});
