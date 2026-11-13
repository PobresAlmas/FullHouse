"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Bell, Check, House, Plus, Settings, Wallet } from "lucide-react";
import {
    createExpense,
    deleteExpense,
    getExpenseSubgroups,
    getExpenseHomes,
    getExpenses,
    updateExpense,
} from "@/features/expenses/api/expenses.api";
import { AppSidebar } from "@/components/layout/AppSidebar";
import SummaryCard from "@/features/expenses/components/SummaryCard";
import CalendarWidget from "@/features/expenses/components/CalendarWidget";
import ExpenseRow from "@/features/expenses/components/ExpenseRow";
import ExpenseModal from "@/features/expenses/components/ExpenseModal";
import DeleteExpenseDialog from "@/features/expenses/components/DeleteExpenseDialog";
import {
    amountToCents,
    formatCurrency,
    getErrorMessage,
    isValidDate,
    sortExpenses,
} from "@/features/expenses/lib/finance-format";
import type {
    CreateExpenseInput,
    Expense,
    ExpenseSubgroup,
    ExpenseHome,
} from "@/features/expenses/api/expenses.api";

type FormState = CreateExpenseInput;
type ModalState = { mode: "create" } | { mode: "edit"; expense: Expense } | null;

const initialForm: FormState = {
    description: "",
    amount: "",
    date: "",
    subgroupId: "",
    paymentStatus: "PENDING",
};

export default function FinancePage() {
    const [homes, setHomes] = useState<ExpenseHome[]>([]);
    const [subgroups, setSubgroups] = useState<ExpenseSubgroup[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<ModalState>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [form, setForm] = useState<FormState>(initialForm);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formError, setFormError] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        let active = true;
        Promise.all([getExpenseHomes(), getExpenseSubgroups(), getExpenses()])
            .then(([availableHomes, availableSubgroups, registeredExpenses]) => {
                if (!active) return;
                setHomes(availableHomes);
                setSubgroups(availableSubgroups);
                setExpenses(sortExpenses(registeredExpenses));
            })
            .catch((loadError: unknown) => {
                if (active) setError(getErrorMessage(loadError));
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!modal && !expenseToDelete) return;
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setModal(null);
                setExpenseToDelete(null);
            }
        }
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [modal, expenseToDelete]);

    const totals = useMemo(() => {
        const now = new Date();
        const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const outstanding = expenses
            .filter((expense) => expense.paymentStatus === "PENDING")
            .reduce((sum, expense) => sum + amountToCents(expense.amount), 0);
        const paidThisMonth = expenses
            .filter(
                (expense) =>
                    expense.paymentStatus === "PAID" && expense.paidAt?.startsWith(monthPrefix)
            )
            .reduce((sum, expense) => sum + amountToCents(expense.amount), 0);
        const total = expenses.reduce((sum, expense) => sum + amountToCents(expense.amount), 0);

        return { outstanding, paidThisMonth, monthlyAverage: Math.round(total / 3) };
    }, [expenses]);

    const houseName = homes[0]?.name ?? null;

    function openCreateModal() {
        if (homes.length === 0) return;
        setForm({ ...initialForm, homeId: homes[0].id });
        setFormError("");
        setNotice("");
        setModal({ mode: "create" });
    }

    function openEditModal(expense: Expense) {
        setForm({
            description: expense.description,
            amount: expense.amount,
            date: expense.date?.slice(0, 10) ?? "",
            homeId: expense.homeId ?? homes[0]?.id,
            subgroupId: expense.subgroup?.id ?? "",
            paymentStatus: expense.paymentStatus === "PAID" ? "PAID" : "PENDING",
        });
        setFormError("");
        setNotice("");
        setModal({ mode: "edit", expense });
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError("");

        if (homes.length === 0) {
            setFormError("Associe-se a uma residência antes de cadastrar uma despesa.");
            return;
        }
        if (!form.description.trim() || !form.amount || !form.date) {
            setFormError("Preencha todos os campos obrigatórios.");
            return;
        }
        if (amountToCents(form.amount) <= 0) {
            setFormError("Informe um valor válido maior que zero, com até duas casas decimais.");
            return;
        }
        if (!isValidDate(form.date)) {
            setFormError("Informe uma data válida.");
            return;
        }

        setSaving(true);
        try {
            const selectedSubgroup = subgroups.find((item) => item.id === form.subgroupId);
            const data = {
                ...form,
                description: form.description.trim(),
                amount: form.amount.replace(",", "."),
                homeId: selectedSubgroup?.homeId ?? form.homeId ?? homes[0]?.id,
                subgroupId: form.subgroupId || null,
            };
            if (modal?.mode === "edit") {
                const updated = await updateExpense(modal.expense.id, data);
                setExpenses((items) =>
                    sortExpenses(items.map((item) => (item.id === updated.id ? updated : item)))
                );
                setNotice("Despesa atualizada com sucesso.");
            } else {
                const created = await createExpense(data);
                setExpenses((items) => sortExpenses([created, ...items]));
                setNotice("Despesa cadastrada com sucesso.");
            }
            setModal(null);
        } catch (saveError: unknown) {
            setFormError(getErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        if (!expenseToDelete) return;
        setDeleting(true);
        setError("");
        try {
            await deleteExpense(expenseToDelete.id);
            setExpenses((items) => items.filter((item) => item.id !== expenseToDelete.id));
            setNotice("Despesa excluída com sucesso.");
            setExpenseToDelete(null);
            setModal(null);
        } catch (deleteError: unknown) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#f8f4fa] text-[#29252d] md:flex">
            <AppSidebar activeSection="finance" residenceName={houseName} />

            <div className="min-w-0 flex-1">
                <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#d9d0dc] bg-[#fffaff] px-5 py-3 md:px-7">
                    <div>
                        <h1 className="text-xl font-bold">Bom dia</h1>
                        <p className="flex items-center gap-1 text-xs text-[#77717c]">
                            <House size={12} /> {houseName ?? "Nenhuma residência associada"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-[#514c56]">
                        <button
                            type="button"
                            aria-label="Notificações"
                            className="relative grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"
                        >
                            <Bell size={19} />
                            <span className="absolute -right-0.5 -top-1 grid size-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                                1
                            </span>
                        </button>
                        <Link
                            href="/settings"
                            aria-label="Configurações"
                            className="grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"
                        >
                            <Settings size={19} />
                        </Link>
                    </div>
                </header>

                <main className="mx-auto max-w-[1500px] p-5 md:p-[30px]">
                    {error && (
                        <div
                            role="alert"
                            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                        >
                            {error}
                        </div>
                    )}
                    {notice && (
                        <div
                            role="status"
                            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                        >
                            {notice}
                        </div>
                    )}

                    {loading && (
                        <p className="mb-4 text-sm text-[#77717c]">
                            Carregando residências e despesas…
                        </p>
                    )}
                    {!loading && homes.length === 0 && (
                        <section className="rounded-xl border border-[#d6cdd9] bg-[#fffaff] p-10 text-center">
                            <House className="mx-auto mb-3 text-[#4f7f63]" size={30} />
                            <h2 className="font-semibold">Nenhuma residência associada</h2>
                            <p className="mt-1 text-sm text-[#77717c]">
                                Associe-se a uma residência para consultar e cadastrar despesas.
                            </p>
                        </section>
                    )}
                    <div
                        style={{ display: loading || homes.length === 0 ? "none" : undefined }}
                        className="mb-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(250px,286px)]"
                    >
                        <section className="rounded-xl border border-[#d6cdd9] bg-[#fffaff] px-5 pb-5 pt-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <h2 className="mb-3 border-b border-[#817b84] pb-1 text-[22px] font-bold">
                                Dashboard Casa
                            </h2>
                            <div className="grid gap-3 md:grid-cols-3">
                                <SummaryCard
                                    icon={<Wallet size={21} />}
                                    iconClass="bg-red-100 text-red-600"
                                    label="Total a pagar (Casa)"
                                    value={formatCurrency(totals.outstanding / 100)}
                                    valueClass="text-red-700"
                                    detail={
                                        expenses.find(
                                            (expense) => expense.paymentStatus === "PENDING"
                                        )?.description ?? "Nenhuma despesa pendente"
                                    }
                                    detailIcon={<span className="text-red-600">▲</span>}
                                />
                                <SummaryCard
                                    icon={<Check size={22} />}
                                    iconClass="bg-green-200 text-green-700"
                                    label="Total pago este mês"
                                    value={formatCurrency(totals.paidThisMonth / 100)}
                                    valueClass="text-green-700"
                                    detail={`${expenses.filter((expense) => expense.paymentStatus === "PAID").length} despesas pagas`}
                                />
                                <SummaryCard
                                    icon={<span className="text-lg">↗</span>}
                                    iconClass="bg-[#eeeaf0] text-[#79737c]"
                                    label="Média mensal"
                                    value={formatCurrency(totals.monthlyAverage / 100)}
                                    valueClass="text-[#211e24]"
                                    detail="Referência dos últimos 3 meses"
                                />
                            </div>
                        </section>

                        <CalendarWidget expenses={expenses} />
                    </div>

                    <section
                        style={{ display: loading || homes.length === 0 ? "none" : undefined }}
                        className="overflow-hidden rounded-lg border border-[#e9e2eb] bg-[#fffaff]"
                    >
                        {loading ? (
                            <p className="p-8 text-sm text-[#77717c]">Carregando despesas…</p>
                        ) : expenses.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <Wallet className="mx-auto mb-3 text-[#8b858e]" size={32} />
                                <h2 className="font-semibold">Nenhuma despesa cadastrada</h2>
                                <p className="mt-1 text-sm text-[#77717c]">
                                    Adicione uma despesa para acompanhar os gastos da casa.
                                </p>
                                <button
                                    onClick={openCreateModal}
                                    disabled={loading}
                                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#4e812f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3e6b25]"
                                >
                                    <Plus size={17} /> Adicionar despesa
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1120px] text-left text-xs">
                                    <thead className="border-b border-[#eae4ec] text-[11px] font-semibold text-[#88849a]">
                                        <tr>
                                            <th scope="col" className="w-10 px-3 py-3">
                                                <span className="sr-only">Ações</span>
                                            </th>
                                            <th scope="col" className="px-3 py-3">
                                                Descrição
                                            </th>
                                            <th scope="col" className="px-3 py-3">
                                                Categoria
                                            </th>
                                            <th scope="col" className="px-3 py-3">
                                                Pago por
                                            </th>
                                            <th scope="col" className="px-3 py-3">
                                                Data
                                            </th>
                                            <th scope="col" className="px-3 py-3">
                                                Valor
                                            </th>
                                            <th scope="col" className="px-3 py-3">
                                                Vencimento
                                            </th>
                                            <th scope="col" className="px-3 py-3">
                                                Status
                                            </th>
                                            <th scope="col" className="px-3 py-3">
                                                Comprovante
                                            </th>
                                            <th scope="col" className="px-3 py-3">
                                                Lembrete
                                            </th>
                                            <th scope="col" className="px-3 py-3 text-center">
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee9f0]">
                                        {expenses.map((expense) => (
                                            <ExpenseRow
                                                key={expense.id}
                                                expense={expense}
                                                onEdit={openEditModal}
                                                onDelete={setExpenseToDelete}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee9f0] px-4 py-3">
                            <p className="text-xs text-[#625c66]" aria-live="polite">
                                Total das despesas exibidas:{" "}
                                <strong className="text-[#29252d]">
                                    {formatCurrency(
                                        expenses.reduce(
                                            (sum, item) => sum + amountToCents(item.amount),
                                            0
                                        ) / 100
                                    )}
                                </strong>
                            </p>
                            <div className="flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    disabled
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4e812f] px-3 py-2 text-[11px] font-medium text-white opacity-90"
                                >
                                    <Plus size={14} /> Adicionar lembrete
                                </button>
                                <button
                                    type="button"
                                    disabled
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4e812f] px-3 py-2 text-[11px] font-medium text-white opacity-90"
                                >
                                    <Plus size={14} /> Criar subgrupo
                                </button>
                                <button
                                    type="button"
                                    onClick={openCreateModal}
                                    disabled={loading || homes.length === 0}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4e812f] px-3 py-2 text-[11px] font-medium text-white hover:bg-[#3e6b25] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Plus size={14} /> Adicionar Despesa
                                </button>
                            </div>
                        </div>
                    </section>
                </main>
            </div>

            {modal && (
                <ExpenseModal
                    mode={modal.mode}
                    expense={modal.mode === "edit" ? modal.expense : null}
                    form={form}
                    homes={homes}
                    subgroups={subgroups}
                    saving={saving}
                    error={formError}
                    onChange={setForm}
                    onClose={() => setModal(null)}
                    onDelete={
                        modal.mode === "edit" ? () => setExpenseToDelete(modal.expense) : undefined
                    }
                    onSubmit={handleSubmit}
                />
            )}

            {expenseToDelete && (
                <DeleteExpenseDialog
                    expense={expenseToDelete}
                    deleting={deleting}
                    onCancel={() => setExpenseToDelete(null)}
                    onConfirm={confirmDelete}
                />
            )}
        </div>
    );
}
