import { describe, expect, it } from "vitest";
import { dayInBusinessTime, getHomeTaskMetrics, weekStart } from "../home-metrics";

describe("home metrics", () => {
    it("uses the configured Fortaleza timezone around the UTC day boundary", () => {
        expect(dayInBusinessTime(new Date("2026-01-05T02:59:59.999Z"))).toBe("2026-01-04");
        expect(dayInBusinessTime(new Date("2026-01-05T03:00:00.000Z"))).toBe("2026-01-05");
    });

    it("starts weeks on Monday, including dates near year boundaries", () => {
        expect(weekStart("2026-01-04")).toBe("2025-12-29");
        expect(weekStart("2026-01-05")).toBe("2026-01-05");
    });

    it("separates overdue and today's tasks and calculates weekly completion without double counting", () => {
        const metrics = getHomeTaskMetrics(
            [
                { dueAt: "2026-01-02T12:00:00Z", status: "PENDENTE", completedAt: null },
                { dueAt: "2026-01-06T12:00:00Z", status: "PENDENTE", completedAt: null },
                { dueAt: "2026-01-08T12:00:00Z", status: "EM_ANDAMENTO", completedAt: null },
                {
                    dueAt: "2026-01-05T12:00:00Z",
                    status: "CONCLUIDA",
                    completedAt: "2026-01-05T13:00:00Z",
                },
                { dueAt: "2026-01-05T12:00:00Z", status: "CANCELADA", completedAt: null },
            ],
            "2026-01-05"
        );

        expect(metrics.overdue).toHaveLength(1);
        expect(metrics.today).toHaveLength(0);
        expect(metrics.completedWeek).toBe(1);
        expect(metrics.scheduledWeek).toBe(3);
        expect(metrics.progress).toBe(25);
    });

    it("returns zero progress when the week has no counted tasks", () => {
        expect(getHomeTaskMetrics([], "2026-01-05").progress).toBe(0);
    });
});
