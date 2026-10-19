import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { createExpense, deleteExpense, getExpenses, updateExpense } from "../expenses.api";

vi.mock("@/services/api", () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

const body = {
    description: "Internet",
    amount: "120.00",
    date: "2026-10-12",
    subgroupId: null,
    paymentStatus: "PENDING" as const,
};
const expense = { id: "expense-id", ...body, subgroup: null, paidBy: null, paidAt: null };

describe("expenses API client", () => {
    beforeEach(() => vi.clearAllMocks());

    it("loads the expense list", async () => {
        vi.mocked(api.get).mockResolvedValue({ data: [expense] });

        await expect(getExpenses()).resolves.toEqual([expense]);
        expect(api.get).toHaveBeenCalledWith("/expenses");
    });

    it("creates an expense without requiring a subgroup or a house field", async () => {
        vi.mocked(api.post).mockResolvedValue({ data: expense });

        await expect(createExpense(body)).resolves.toEqual(expense);
        expect(api.post).toHaveBeenCalledWith("/expenses", body);
    });

    it("updates an expense and its payment status", async () => {
        const paidExpense = { ...expense, paymentStatus: "PAID" };
        vi.mocked(api.put).mockResolvedValue({ data: paidExpense });

        await expect(
            updateExpense("expense-id", { ...body, paymentStatus: "PAID" })
        ).resolves.toEqual(paidExpense);
        expect(api.put).toHaveBeenCalledWith("/expenses/expense-id", {
            ...body,
            paymentStatus: "PAID",
        });
    });

    it("deletes an expense", async () => {
        vi.mocked(api.delete).mockResolvedValue({ data: undefined });

        await expect(deleteExpense("expense-id")).resolves.toBeUndefined();
        expect(api.delete).toHaveBeenCalledWith("/expenses/expense-id");
    });
});
