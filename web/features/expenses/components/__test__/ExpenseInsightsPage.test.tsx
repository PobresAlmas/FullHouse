import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    getExpenseHomeMembers,
    getExpenseHomes,
    getExpenseInsights,
    getExpenseSubgroups,
} from "../../api/expenses.api";
import type { ExpenseInsights } from "../../api/expenses.api";
import ExpenseInsightsPage from "../ExpenseInsightsPage";

vi.mock("../../api/expenses.api", () => ({
    getExpenseHomeMembers: vi.fn(),
    getExpenseHomes: vi.fn(),
    getExpenseInsights: vi.fn(),
    getExpenseSubgroups: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
    useAuth: () => ({ user: null, loading: false }),
}));

const december = { from: "2026-12-01", to: "2026-12-31" };

function insights(from: string, to: string, amount = "0.00"): ExpenseInsights {
    return {
        period: { from, to, timeZone: "America/Fortaleza", today: "2026-11-27" },
        summary: {
            dueAmount: amount,
            pendingAmount: amount,
            paidAmount: "0.00",
            overdueAmount: "0.00",
            paidPercentage: amount === "0.00" ? null : 0,
            unallocatedExpenseCount: 0,
            unallocatedExpenseAmount: "0.00",
        },
        members: [],
        monthly: [],
        wholeBillsPaidByMember: [],
        overdueAllocations: [],
    };
}

describe("ExpenseInsightsPage period and freshness", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-11-27T15:00:00.000Z"));
        window.history.replaceState(null, "", "/finance/insights");
        vi.mocked(getExpenseHomes).mockResolvedValue([
            { id: "home-1", name: "Casa principal" },
            { id: "home-2", name: "Casa da despesa" },
        ]);
        vi.mocked(getExpenseHomeMembers).mockResolvedValue([]);
        vi.mocked(getExpenseSubgroups).mockResolvedValue([]);
    });

    afterEach(() => {
        vi.useRealTimers();
        window.history.replaceState(null, "", "/");
    });

    it("offers the next due month when the current period is empty", async () => {
        const user = userEvent.setup();
        vi.mocked(getExpenseInsights).mockImplementation(async (_homeId, { from, to }) =>
            insights(from, to, from === december.from ? "200.00" : "0.00")
        );
        render(<ExpenseInsightsPage />);

        expect(
            await screen.findByText("Nenhuma cota encontrada neste período")
        ).toBeInTheDocument();
        expect(getExpenseInsights).toHaveBeenLastCalledWith("home-1", {
            from: "2026-11-01",
            to: "2026-11-30",
            status: "ALL",
        });
        expect(screen.getByText("Visão da casa").tagName).toBe("P");
        await user.click(screen.getByRole("button", { name: "Ver próximo mês" }));

        expect(await screen.findAllByText(/R\$\s*200,00/)).not.toHaveLength(0);
        expect(screen.getByRole("combobox", { name: "Período" })).toHaveValue("NEXT_MONTH");
        expect(getExpenseInsights).toHaveBeenLastCalledWith("home-1", {
            ...december,
            status: "ALL",
        });
    });

    it("opens a saved expense's house and due month and refreshes it on focus", async () => {
        window.history.replaceState(
            null,
            "",
            "/finance/insights?range=CUSTOM&from=2026-12-01&to=2026-12-31&homeId=home-2"
        );
        vi.mocked(getExpenseInsights)
            .mockResolvedValueOnce(insights(december.from, december.to, "50.00"))
            .mockResolvedValueOnce(insights(december.from, december.to, "200.00"));
        render(<ExpenseInsightsPage />);

        expect(await screen.findAllByText(/R\$\s*50,00/)).not.toHaveLength(0);
        expect(getExpenseInsights).toHaveBeenCalledWith("home-2", { ...december, status: "ALL" });
        expect(new URLSearchParams(window.location.search).get("homeId")).toBe("home-2");

        fireEvent.focus(window);
        expect(await screen.findAllByText(/R\$\s*200,00/)).not.toHaveLength(0);
        await waitFor(() => expect(getExpenseInsights).toHaveBeenCalledTimes(2));
    });
});
