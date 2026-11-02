import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createExpenseSubgroup,
    createExpense,
    deleteExpense,
    getExpenseSubgroups,
    getExpenseHomes,
    getExpenseHomeMembers,
    getExpenses,
    updateExpense,
} from "@/features/expenses/api/expenses.api";
import type { Expense } from "@/features/expenses/api/expenses.api";
import FinancePage from "../page";

vi.mock("@/features/expenses/api/expenses.api", () => ({
    createExpenseSubgroup: vi.fn(),
    createExpense: vi.fn(),
    deleteExpense: vi.fn(),
    getExpenseSubgroups: vi.fn(),
    getExpenseHomes: vi.fn(),
    getExpenseHomeMembers: vi.fn(),
    getExpenses: vi.fn(),
    updateExpense: vi.fn(),
}));

const subgroup = {
    id: "subgroup-id",
    name: "Casa",
    homeId: "home-id",
    homeName: "Grifinória",
    members: ["Emilson", "Ana"],
};

const expense: Expense = {
    id: "expense-id",
    description: "Internet",
    amount: "120.00",
    date: "2026-10-12",
    subgroup: { id: subgroup.id, nome: subgroup.name },
    paymentStatus: "PENDING",
    paidBy: null,
    paidAt: null,
};

describe("FinancePage expense CRUD", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getExpenseSubgroups).mockResolvedValue([subgroup]);
        vi.mocked(getExpenseHomes).mockResolvedValue([{ id: "home-id", name: "Grifinória" }]);
        vi.mocked(getExpenseHomeMembers).mockResolvedValue([
            { id: "member-1", name: "Ana" },
            { id: "member-2", name: "Bia" },
        ]);
        vi.mocked(getExpenses).mockResolvedValue([]);
        vi.mocked(deleteExpense).mockResolvedValue(undefined);
    });

    it("creates a subgroup from active residents and updates the expense options immediately", async () => {
        const user = userEvent.setup();
        vi.mocked(createExpenseSubgroup).mockResolvedValue({
            id: "coffee-group",
            name: "Café",
            homeId: "home-id",
            homeName: "Grifinória",
            members: ["Ana"],
        });
        render(<FinancePage />);

        await screen.findByText("Nenhuma despesa cadastrada");
        await user.click(screen.getByRole("button", { name: /criar subgrupo/i }));
        const dialog = screen.getByRole("dialog", { name: "Criar subgrupo" });
        expect(await screen.findByRole("group", { name: "Participantes" })).toBeInTheDocument();
        await user.type(screen.getByLabelText("Nome do subgrupo"), " Café ");
        await user.click(screen.getByRole("checkbox", { name: "Ana" }));
        await user.click(within(dialog).getByRole("button", { name: "Criar subgrupo" }));

        await waitFor(() =>
            expect(createExpenseSubgroup).toHaveBeenCalledWith({
                homeId: "home-id",
                name: "Café",
                memberIds: ["member-1"],
            })
        );
        expect(await screen.findByText("Subgrupo “Café” criado com sucesso.")).toBeInTheDocument();
        await user.click(screen.getAllByRole("button", { name: /adicionar despesa/i })[0]);
        expect(screen.getByRole("option", { name: "Café · Grifinória" })).toBeInTheDocument();
    }, 15000);

    it("shows subgroup validation errors and preserves the entered name after an API failure", async () => {
        const user = userEvent.setup();
        vi.mocked(createExpenseSubgroup).mockRejectedValueOnce({ message: "Falha ao salvar." });
        render(<FinancePage />);
        await screen.findByText("Nenhuma despesa cadastrada");
        await user.click(screen.getByRole("button", { name: /criar subgrupo/i }));
        await screen.findByRole("checkbox", { name: "Ana" });
        const dialog = screen.getByRole("dialog", { name: "Criar subgrupo" });
        await user.type(screen.getByLabelText("Nome do subgrupo"), "Café");
        await user.click(within(dialog).getByRole("button", { name: "Criar subgrupo" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Selecione pelo menos um morador."
        );
        await user.click(screen.getByRole("checkbox", { name: "Ana" }));
        await user.click(within(dialog).getByRole("button", { name: "Criar subgrupo" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao salvar.");
        expect(screen.getByLabelText("Nome do subgrupo")).toHaveValue("Café");
    }, 15000);

    it("creates an expense from the add modal and updates the list", async () => {
        const user = userEvent.setup();
        vi.mocked(createExpense).mockResolvedValue(expense);
        render(<FinancePage />);

        await screen.findByText("Nenhuma despesa cadastrada");
        await user.click(screen.getAllByRole("button", { name: /adicionar despesa/i })[0]);
        await user.type(screen.getByLabelText("Descrição"), "Internet");
        await user.type(screen.getByLabelText(/valor total da despesa/i), "120,00");
        fireEvent.change(screen.getByLabelText(/data de vencimento/i), {
            target: { value: "2026-10-12" },
        });
        await user.click(screen.getByRole("button", { name: "Criar despesa" }));

        await waitFor(() =>
            expect(createExpense).toHaveBeenCalledWith({
                description: "Internet",
                amount: "120.00",
                date: "2026-10-12",
                homeId: "home-id",
                subgroupId: null,
                scope: "HOME",
                paymentStatus: "PENDING",
                paymentDate: null,
            })
        );
        expect(await screen.findByRole("row", { name: /Internet/ })).toBeInTheDocument();
    }, 15000);

    it("uses the residence selected in the expense form when the user has more than one", async () => {
        const user = userEvent.setup();
        vi.mocked(getExpenseHomes).mockResolvedValue([
            { id: "home-id", name: "Grifinória" },
            { id: "other-home-id", name: "Corvinal" },
        ]);
        vi.mocked(createExpense).mockResolvedValue(expense);
        render(<FinancePage />);

        await screen.findByText("Nenhuma despesa cadastrada");
        await user.click(screen.getAllByRole("button", { name: /adicionar despesa/i })[0]);
        await user.selectOptions(screen.getByLabelText("Casa"), "other-home-id");
        await user.type(screen.getByLabelText("Descrição"), "Internet");
        await user.type(screen.getByLabelText(/valor total da despesa/i), "120,00");
        fireEvent.change(screen.getByLabelText(/data de vencimento/i), {
            target: { value: "2026-10-12" },
        });
        await user.click(screen.getByRole("button", { name: "Criar despesa" }));

        await waitFor(() =>
            expect(createExpense).toHaveBeenCalledWith(
                expect.objectContaining({ homeId: "other-home-id", subgroupId: null })
            )
        );
    }, 15000);

    it("lists the expenses and totals the values displayed", async () => {
        vi.mocked(getExpenses).mockResolvedValue([
            expense,
            {
                ...expense,
                id: "expense-2",
                description: "Água",
                amount: "80.00",
                paymentStatus: "PAID",
            },
        ]);
        render(<FinancePage />);

        expect(await screen.findByRole("row", { name: /Internet/ })).toBeInTheDocument();
        expect(screen.getByRole("row", { name: /Água/ })).toBeInTheDocument();
        expect(screen.getByText("Total das despesas exibidas:").parentElement).toHaveTextContent(
            /200,00/
        );
    }, 15000);

    it("does not present a fake home or offer expense creation without a residence", async () => {
        vi.mocked(getExpenseHomes).mockResolvedValue([]);
        vi.mocked(getExpenseSubgroups).mockResolvedValue([]);
        render(<FinancePage />);

        expect(
            await screen.findByRole("heading", { name: "Nenhuma residência associada" })
        ).toBeInTheDocument();
        expect(screen.queryByText("Minha casa")).not.toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Dashboard Casa" })).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /adicionar despesa/i })
        ).not.toBeInTheDocument();
        expect(createExpense).not.toHaveBeenCalled();
    }, 15000);

    it("edits an expense and shows the updated values", async () => {
        const user = userEvent.setup();
        vi.mocked(getExpenses).mockResolvedValue([expense]);
        vi.mocked(updateExpense).mockResolvedValue({ ...expense, description: "Internet fibra" });
        render(<FinancePage />);

        await user.click(await screen.findByRole("button", { name: "Editar Internet" }));
        const description = screen.getByLabelText("Descrição");
        await user.clear(description);
        await user.type(description, "Internet fibra");
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

        await waitFor(() =>
            expect(updateExpense).toHaveBeenCalledWith(
                "expense-id",
                expect.objectContaining({
                    description: "Internet fibra",
                    subgroupId: subgroup.id,
                })
            )
        );
        expect(await screen.findByRole("row", { name: /Internet fibra/ })).toBeInTheDocument();
    }, 15000);

    it("changes a pending expense to paid", async () => {
        const user = userEvent.setup();
        vi.mocked(getExpenses).mockResolvedValue([expense]);
        vi.mocked(updateExpense).mockResolvedValue({ ...expense, paymentStatus: "PAID" });
        render(<FinancePage />);

        await user.click(await screen.findByRole("button", { name: "Editar Internet" }));
        await user.selectOptions(screen.getByLabelText("Status do pagamento"), "PAID");
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

        await waitFor(() =>
            expect(updateExpense).toHaveBeenCalledWith(
                "expense-id",
                expect.objectContaining({ paymentStatus: "PAID" })
            )
        );
        expect(await screen.findByRole("row", { name: /Internet/ })).toHaveTextContent("Pago");
    }, 15000);

    it("shows a server validation error in the expense form", async () => {
        const user = userEvent.setup();
        vi.mocked(createExpense).mockRejectedValue({ message: "Informe um valor maior que zero." });
        render(<FinancePage />);

        await screen.findByText("Nenhuma despesa cadastrada");
        await user.click(screen.getAllByRole("button", { name: /adicionar despesa/i })[0]);
        await user.type(screen.getByLabelText("Descrição"), "Internet");
        await user.type(screen.getByLabelText(/valor total da despesa/i), "120,00");
        fireEvent.change(screen.getByLabelText(/data de vencimento/i), {
            target: { value: "2026-10-12" },
        });
        await user.click(screen.getByRole("button", { name: "Criar despesa" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Informe um valor maior que zero."
        );
    }, 15000);

    it("blocks an empty form and shows a friendly required-fields message", async () => {
        const user = userEvent.setup();
        render(<FinancePage />);

        await screen.findByText("Nenhuma despesa cadastrada");
        await user.click(screen.getAllByRole("button", { name: /adicionar despesa/i })[0]);
        await user.click(screen.getByRole("button", { name: "Criar despesa" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Preencha todos os campos obrigatórios."
        );
        expect(createExpense).not.toHaveBeenCalled();
    }, 15000);

    it("confirms deletion and removes the expense from the active list", async () => {
        const user = userEvent.setup();
        vi.mocked(getExpenses).mockResolvedValue([expense]);
        render(<FinancePage />);

        await user.click(await screen.findByRole("button", { name: "Excluir Internet" }));
        expect(screen.getByRole("alertdialog")).toHaveTextContent("Internet");
        await user.click(screen.getByRole("button", { name: "Excluir despesa" }));

        await waitFor(() => expect(deleteExpense).toHaveBeenCalledWith("expense-id"));
        expect(await screen.findByText("Nenhuma despesa cadastrada")).toBeInTheDocument();
    }, 15000);
});
