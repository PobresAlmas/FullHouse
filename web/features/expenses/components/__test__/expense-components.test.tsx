import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CreateExpenseInput, Expense } from "../../api/expenses.api";
import CalendarWidget from "../CalendarWidget";
import DeleteExpenseDialog from "../DeleteExpenseDialog";
import ExpenseModal from "../ExpenseModal";
import ExpenseRow from "../ExpenseRow";
import SummaryCard from "../SummaryCard";
import { selectSystemOption } from "@/test/utils/render";

const expense: Expense = {
    id: "expense-1",
    description: "Conta de luz",
    amount: "84.50",
    date: "2020-04-15",
    subgroup: { id: "group-1", nome: "Contas" },
    paymentStatus: "PENDING",
    paidBy: null,
    paidAt: null,
};

const form: CreateExpenseInput = {
    description: "Conta de luz",
    amount: "84,50",
    date: "2020-04-15",
    homeId: "home-1",
    subgroupId: null,
    paymentStatus: "PENDING",
};

describe("expense components", () => {
    it("moves the expense calendar between months and marks payment dates", async () => {
        const user = userEvent.setup();
        render(<CalendarWidget expenses={[expense]} />);
        const calendar = screen.getByRole("region", { name: "Calendário de despesas" });
        const month = within(calendar).getByRole("heading").textContent;

        await user.click(within(calendar).getByRole("button", { name: "Próximo mês" }));

        expect(within(calendar).getByRole("heading")).not.toHaveTextContent(month ?? "");
        expect(within(calendar).getByText("Contas pagas")).toBeInTheDocument();
        expect(within(calendar).getByText("Contas a pagar")).toBeInTheDocument();
        expect(within(calendar).getByText("Atrasadas")).toBeInTheDocument();
    });

    it("renders pending and paid expense rows and calls their actions", async () => {
        const user = userEvent.setup();
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        const { rerender } = render(
            <table>
                <tbody>
                    <ExpenseRow expense={expense} onEdit={onEdit} onDelete={onDelete} />
                </tbody>
            </table>
        );

        const pendingRow = screen.getByRole("row");
        expect(within(pendingRow).getByText("Atrasada")).toBeInTheDocument();
        expect(within(pendingRow).getByText("Contas")).toBeInTheDocument();
        await user.click(within(pendingRow).getByRole("button", { name: "Editar Conta de luz" }));
        await user.click(within(pendingRow).getByRole("button", { name: "Excluir Conta de luz" }));
        expect(onEdit).toHaveBeenCalledWith(expense);
        expect(onDelete).toHaveBeenCalledWith(expense);

        const paidExpense = { ...expense, paymentStatus: "PAID" as const, paidBy: "Ana" };
        rerender(
            <table>
                <tbody>
                    <ExpenseRow expense={paidExpense} onEdit={onEdit} onDelete={onDelete} />
                </tbody>
            </table>
        );
        expect(screen.getByText("Ana")).toBeInTheDocument();
        expect(screen.getByText("Pago")).toBeInTheDocument();
        expect(screen.queryByText("Atrasada")).not.toBeInTheDocument();
    });

    it("edits expense fields, selects its home and subgroup, and submits", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
        const { rerender } = render(
            <ExpenseModal
                mode="edit"
                expense={{ ...expense, paidAt: "2020-04-14T12:00:00.000Z" }}
                form={form}
                homes={[
                    { id: "home-1", name: "Grifinória" },
                    { id: "home-2", name: "Corvinal" },
                ]}
                subgroups={[
                    {
                        id: "group-1",
                        name: "Contas",
                        homeId: "home-1",
                        homeName: "Grifinória",
                        members: ["Ana", "Bia"],
                    },
                ]}
                saving={false}
                error=""
                onChange={onChange}
                onClose={vi.fn()}
                onDelete={vi.fn()}
                onSubmit={onSubmit}
            />
        );

        expect(screen.getByText(/Pago em/)).toBeInTheDocument();
        await selectSystemOption(user, screen.getByRole("combobox", { name: "Casa" }), "Corvinal");
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ homeId: "home-2", subgroupId: "" })
        );
        await selectSystemOption(
            user,
            screen.getByRole("combobox", { name: "Subgrupo / Categoria (opcional)" }),
            "Contas · Grifinória"
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ homeId: "home-1", subgroupId: "group-1" })
        );
        rerender(
            <ExpenseModal
                mode="edit"
                expense={{ ...expense, paidAt: "2020-04-14T12:00:00.000Z" }}
                form={{ ...form, subgroupId: "group-1" }}
                homes={[
                    { id: "home-1", name: "Grifinória" },
                    { id: "home-2", name: "Corvinal" },
                ]}
                subgroups={[
                    {
                        id: "group-1",
                        name: "Contas",
                        homeId: "home-1",
                        homeName: "Grifinória",
                        members: ["Ana", "Bia"],
                    },
                ]}
                saving={false}
                error=""
                onChange={onChange}
                onClose={vi.fn()}
                onDelete={vi.fn()}
                onSubmit={onSubmit}
            />
        );
        expect(screen.getByText("Participantes: Ana, Bia")).toBeInTheDocument();
        await selectSystemOption(
            user,
            screen.getByRole("combobox", { name: "Status do pagamento" }),
            "Pago"
        );
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus: "PAID" }));
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
        expect(onSubmit).toHaveBeenCalledOnce();
        expect(screen.getByRole("button", { name: "Excluir despesa" })).toBeInTheDocument();
    });

    it("shows form errors and disables the submit action while saving", () => {
        render(
            <ExpenseModal
                mode="create"
                expense={null}
                form={form}
                homes={[{ id: "home-1", name: "Grifinória" }]}
                subgroups={[]}
                saving
                error="Falha ao salvar despesa."
                onChange={vi.fn()}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Falha ao salvar despesa.");
        expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
        expect(screen.queryByLabelText("Casa")).not.toBeInTheDocument();
    });

    it("confirms or cancels deletion and disables both choices while deleting", async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();
        const onConfirm = vi.fn();
        const { rerender } = render(
            <DeleteExpenseDialog
                expense={expense}
                deleting={false}
                onCancel={onCancel}
                onConfirm={onConfirm}
            />
        );

        const dialog = screen.getByRole("alertdialog", { name: "Excluir despesa?" });
        expect(within(dialog).getByText(/Conta de luz/)).toBeInTheDocument();
        await user.click(within(dialog).getByRole("button", { name: "Excluir despesa" }));
        await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onCancel).toHaveBeenCalledOnce();

        rerender(
            <DeleteExpenseDialog
                expense={expense}
                deleting
                onCancel={onCancel}
                onConfirm={onConfirm}
            />
        );
        expect(screen.getByRole("button", { name: "Excluindo…" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

        const overlay = screen.getByRole("alertdialog").parentElement!;
        overlay.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        expect(onCancel).toHaveBeenCalledTimes(2);
    });

    it("renders a summary card with its details and optional detail icon", () => {
        render(
            <SummaryCard
                icon={<span>💡</span>}
                iconClass="bg-yellow-100"
                label="Total mensal"
                value="R$ 84,50"
                valueClass="text-green-700"
                detail="1 despesa pendente"
                detailIcon={<span aria-label="Informação">i</span>}
            />
        );

        expect(screen.getByText("Total mensal")).toBeInTheDocument();
        expect(screen.getByText("R$ 84,50")).toHaveClass("text-green-700");
        expect(screen.getByText("1 despesa pendente")).toBeInTheDocument();
        expect(screen.getByLabelText("Informação")).toBeInTheDocument();
    });
});
