"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    ArrowRight,
    Bell,
    CalendarDays,
    Check,
    CheckSquare,
    ChevronRight,
    DollarSign,
    House,
    Paperclip,
    PawPrint,
    Pencil,
    Plus,
    Settings,
    Trash2,
    UserRound,
    Wallet,
    X,
} from "lucide-react";
import {
    createExpense,
    deleteExpense,
    getExpenseSubgroups,
    getExpenseHomes,
    getExpenses,
    updateExpense,
} from "@/features/expenses/api/expenses.api";
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

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
});

function amountToCents(amount: string) {
    const normalized = amount.replace(",", ".");
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) return 0;
    return Math.round(Number(normalized) * 100);
}

function isValidDate(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day);
}

function formatCurrency(amount: string | number) {
    return currency.format(Number(amount));
}

function formatDate(date: string | null) {
    if (!date) return "—";
    return shortDate.format(new Date(`${date.slice(0, 10)}T00:00:00.000Z`));
}

function getErrorMessage(error: unknown) {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { message?: unknown } } }).response;
        const message = response?.data?.message;
        if (typeof message === "string") return message;
        if (Array.isArray(message)) return message.join(" ");
    }
    if (typeof error === "object" && error !== null && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string") return message;
    }
    return "Não foi possível concluir a operação. Tente novamente.";
}

function localIsoDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function sortExpenses(items: Expense[]) {
    return [...items].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

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
                    expense.paymentStatus === "PAID" && expense.paidAt?.startsWith(monthPrefix),
            )
            .reduce((sum, expense) => sum + amountToCents(expense.amount), 0);
        const total = expenses.reduce((sum, expense) => sum + amountToCents(expense.amount), 0);

        return { outstanding, paidThisMonth, monthlyAverage: Math.round(total / 3) };
    }, [expenses]);

    const houseName = homes[0]?.name ?? "Minha casa";

    function openCreateModal() {
        setForm(initialForm);
        setFormError("");
        setNotice("");
        setModal({ mode: "create" });
    }

    function openEditModal(expense: Expense) {
        setForm({
            description: expense.description,
            amount: expense.amount,
            date: expense.date?.slice(0, 10) ?? "",
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
            const data = {
                ...form,
                description: form.description.trim(),
                amount: form.amount.replace(",", "."),
                subgroupId: form.subgroupId || null,
            };
            if (modal?.mode === "edit") {
                const updated = await updateExpense(modal.expense.id, data);
                setExpenses((items) => sortExpenses(items.map((item) => (item.id === updated.id ? updated : item))));
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
            <aside className="flex shrink-0 flex-col border-b border-[#d9d0dc] bg-[#f8f4fa] px-4 py-5 md:min-h-screen md:w-[220px] md:border-b-0 md:border-r">
                <Link href="/" className="mb-7 flex items-center gap-3 rounded-lg px-1" aria-label="FullHouse início">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#234a1b] text-white">
                        <House size={24} strokeWidth={2.4} />
                    </span>
                    <span>
                        <span className="block font-bold leading-tight">FullHouse</span>
                        <span className="block text-xs text-[#625c66]">Casa {houseName}</span>
                    </span>
                </Link>

                <nav aria-label="Navegação principal" className="grid gap-1">
                    <SidebarLink icon={<House size={17} />} label="Home" />
                    <SidebarLink icon={<CheckSquare size={17} />} label="Tarefas" />
                    <SidebarLink icon={<DollarSign size={17} />} label="Financeiro" href="/finance" active />
                    <SidebarLink icon={<Wallet size={17} />} label="Despesa" />
                    <SidebarLink icon={<UserRound size={17} />} label="Perfil" />
                    <SidebarLink icon={<PawPrint size={18} />} label="Pets" href="/pets" />
                </nav>
            </aside>

            <div className="min-w-0 flex-1">
                <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#d9d0dc] bg-[#fffaff] px-5 py-3 md:px-7">
                    <div>
                        <h1 className="text-xl font-bold">Bom dia</h1>
                        <p className="flex items-center gap-1 text-xs text-[#77717c]"><House size={12} /> {houseName}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-[#e8e5e9] p-0.5 text-xs" aria-label="Escopo da casa">
                        <span className="rounded-lg px-6 py-2 text-[#55505a]">Pessoal</span>
                        <span aria-current="true" className="rounded-lg bg-[#4e812f] px-6 py-2 font-medium text-white">{houseName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[#514c56]">
                        <button type="button" aria-label="Notificações" className="relative grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white">
                            <Bell size={19} />
                            <span className="absolute -right-0.5 -top-1 grid size-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">1</span>
                        </button>
                        <button type="button" aria-label="Configurações" className="grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"><Settings size={19} /></button>
                        <span className="grid size-10 place-items-center rounded-full bg-[#4f7f63] font-semibold text-white" aria-label="Perfil">{houseName.slice(0, 1).toUpperCase()}</span>
                    </div>
                </header>

                <main className="mx-auto max-w-[1500px] p-5 md:p-[30px]">
                    {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
                    {notice && <div role="status" className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}

                    <div className="mb-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(250px,286px)]">
                        <section className="rounded-xl border border-[#d6cdd9] bg-[#fffaff] px-5 pb-5 pt-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <h2 className="mb-3 border-b border-[#817b84] pb-1 text-[22px] font-bold">Dashboard Casa</h2>
                            <div className="grid gap-3 md:grid-cols-3">
                                <SummaryCard
                                    icon={<Wallet size={21} />}
                                    iconClass="bg-red-100 text-red-600"
                                    label="Total a pagar (Casa)"
                                    value={formatCurrency(totals.outstanding / 100)}
                                    valueClass="text-red-700"
                                    detail={expenses.find((expense) => expense.paymentStatus === "PENDING")?.description ?? "Nenhuma despesa pendente"}
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

                    <section className="overflow-hidden rounded-lg border border-[#e9e2eb] bg-[#fffaff]">
                        {loading ? (
                            <p className="p-8 text-sm text-[#77717c]">Carregando despesas…</p>
                        ) : expenses.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <Wallet className="mx-auto mb-3 text-[#8b858e]" size={32} />
                                <h2 className="font-semibold">Nenhuma despesa cadastrada</h2>
                                <p className="mt-1 text-sm text-[#77717c]">Adicione uma despesa para acompanhar os gastos da casa.</p>
                                <button onClick={openCreateModal} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#4e812f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3e6b25]">
                                    <Plus size={17} /> Adicionar despesa
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1120px] text-left text-xs">
                                    <thead className="border-b border-[#eae4ec] text-[11px] font-semibold text-[#88849a]">
                                        <tr>
                                            <th scope="col" className="w-10 px-3 py-3"><span className="sr-only">Ações</span></th>
                                            <th scope="col" className="px-3 py-3">Descrição</th>
                                            <th scope="col" className="px-3 py-3">Categoria</th>
                                            <th scope="col" className="px-3 py-3">Pago por</th>
                                            <th scope="col" className="px-3 py-3">Data</th>
                                            <th scope="col" className="px-3 py-3">Valor</th>
                                            <th scope="col" className="px-3 py-3">Vencimento</th>
                                            <th scope="col" className="px-3 py-3">Status</th>
                                            <th scope="col" className="px-3 py-3">Comprovante</th>
                                            <th scope="col" className="px-3 py-3">Lembrete</th>
                                            <th scope="col" className="px-3 py-3 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee9f0]">
                                        {expenses.map((expense) => (
                                            <ExpenseRow key={expense.id} expense={expense} onEdit={openEditModal} onDelete={setExpenseToDelete} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee9f0] px-4 py-3">
                            <p className="text-xs text-[#625c66]" aria-live="polite">
                                Total das despesas exibidas: <strong className="text-[#29252d]">{formatCurrency(expenses.reduce((sum, item) => sum + amountToCents(item.amount), 0) / 100)}</strong>
                            </p>
                            <div className="flex flex-wrap justify-end gap-2">
                            <button type="button" disabled className="inline-flex items-center gap-1.5 rounded-lg bg-[#4e812f] px-3 py-2 text-[11px] font-medium text-white opacity-90">
                                <Plus size={14} /> Adicionar lembrete
                            </button>
                            <button type="button" disabled className="inline-flex items-center gap-1.5 rounded-lg bg-[#4e812f] px-3 py-2 text-[11px] font-medium text-white opacity-90">
                                <Plus size={14} /> Criar subgrupo
                            </button>
                            <button type="button" onClick={openCreateModal} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg bg-[#4e812f] px-3 py-2 text-[11px] font-medium text-white hover:bg-[#3e6b25] disabled:cursor-not-allowed disabled:opacity-50">
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
                    subgroups={subgroups}
                    saving={saving}
                    error={formError}
                    onChange={setForm}
                    onClose={() => setModal(null)}
                    onDelete={modal.mode === "edit" ? () => setExpenseToDelete(modal.expense) : undefined}
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

function SidebarLink({ icon, label, href, active = false }: { icon: ReactNode; label: string; href?: string; active?: boolean }) {
    const className = `flex h-12 items-center gap-3 rounded-xl px-3 text-sm transition ${active ? "bg-white font-semibold text-[#4e812f]" : "text-[#514c56]"}`;
    const content = <>{icon}<span>{label}</span></>;
    return href ? (
        <Link href={href} aria-current={active ? "page" : undefined} className={className}>{content}</Link>
    ) : (
        <span aria-disabled="true" className={`${className} cursor-default`}>{content}</span>
    );
}

function SummaryCard({
    icon,
    iconClass,
    label,
    value,
    valueClass,
    detail,
    detailIcon,
}: {
    icon: ReactNode;
    iconClass: string;
    label: string;
    value: string;
    valueClass: string;
    detail: string;
    detailIcon?: ReactNode;
}) {
    return (
        <div className="min-h-[126px] rounded-xl border border-[#d7ceda] p-3">
            <div className="mb-2 flex items-center gap-2.5">
                <span className={`grid size-7 place-items-center rounded-lg ${iconClass}`}>{icon}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                <ChevronRight size={17} className="shrink-0 text-[#55505a]" />
            </div>
            <p className={`text-[21px] font-bold ${valueClass}`}>{value}</p>
            <p className="mt-1 flex items-center gap-2 text-[11px] leading-tight text-[#4a454e]">
                {detailIcon}{detail}
            </p>
        </div>
    );
}

function CalendarWidget({ expenses }: { expenses: Expense[] }) {
    const [month, setMonth] = useState(() => new Date());
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const leadingDays = first.getDay();
    const cells = Array.from({ length: Math.ceil((leadingDays + daysInMonth) / 7) * 7 }, (_, index) => {
        const day = index - leadingDays + 1;
        return day > 0 && day <= daysInMonth ? day : null;
    });
    const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month);

    function changeMonth(offset: number) {
        setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    }

    return (
        <section className="min-w-0 overflow-hidden rounded-lg border border-[#d9d0dc] bg-[#fffaff] p-3 sm:p-4" aria-label="Calendário de despesas">
            <div className="mb-3 flex items-center justify-between">
                <button type="button" aria-label="Mês anterior" onClick={() => changeMonth(-1)} className="grid size-6 place-items-center rounded-md border border-[#e6e0e8] text-[#52843b]"><ArrowLeft size={13} /></button>
                <h2 className="text-xs font-semibold capitalize">{monthName}</h2>
                <button type="button" aria-label="Próximo mês" onClick={() => changeMonth(1)} className="grid size-6 place-items-center rounded-md border border-[#e6e0e8] text-[#52843b]"><ArrowRight size={13} /></button>
            </div>
            <div className="grid min-w-0 grid-cols-7 justify-items-center gap-x-0.5 gap-y-1 text-center">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day} className="min-w-0 py-1 text-[8px] text-[#77717c] sm:text-[9px]">{day}</span>)}
                {cells.map((day, index) => {
                    const dateKey = day ? localIsoDate(new Date(month.getFullYear(), month.getMonth(), day)) : "";
                    const dayExpenses = expenses.filter((expense) => expense.date?.slice(0, 10) === dateKey);
                    const hasPaid = dayExpenses.some((expense) => expense.paymentStatus === "PAID");
                    const hasPending = dayExpenses.some((expense) => expense.paymentStatus === "PENDING");
                    const isOverdue = hasPending && dateKey < localIsoDate(new Date());
                    const isToday = day === new Date().getDate() && month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear();
                    return (
                        <span key={`${day ?? "empty"}-${index}`} className={`relative grid aspect-square w-full max-w-7 place-items-center rounded-lg text-[9px] ${day ? "text-[#36313a]" : "text-transparent"} ${isToday ? "bg-[#578841] font-semibold text-white" : ""}`}>
                            {day ?? "·"}
                            {!isToday && (hasPaid || hasPending) && <i className={`absolute bottom-0.5 size-1 rounded-full ${isOverdue ? "bg-red-500" : hasPending ? "bg-blue-500" : "bg-green-600"}`} />}
                        </span>
                    );
                })}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[8px] text-[#5e5962]">
                <span className="inline-flex items-center gap-1"><i className="size-1 rounded-full bg-green-600" />Contas pagas</span>
                <span className="inline-flex items-center gap-1"><i className="size-1 rounded-full bg-blue-500" />Contas a pagar</span>
                <span className="inline-flex items-center gap-1"><i className="size-1 rounded-full bg-red-500" />Atrasadas</span>
            </div>
        </section>
    );
}

function ExpenseRow({ expense, onEdit, onDelete }: { expense: Expense; onEdit: (expense: Expense) => void; onDelete: (expense: Expense) => void }) {
    const paid = expense.paymentStatus === "PAID";
    const overdue = expense.paymentStatus === "PENDING" && !!expense.date && expense.date < localIsoDate(new Date());
    const group = expense.subgroup?.nome ?? expense.homeName ?? "Casa";
    return (
        <tr className="text-[#333039] hover:bg-[#fcf9fd]">
            <td className="px-3 py-3"><span className="block size-3 rounded-sm border border-[#cfc8d1]" aria-hidden="true" /></td>
            <th scope="row" className="max-w-[180px] px-3 py-3 text-xs font-semibold">
                <span className="block truncate">{expense.description}</span>
                <span className="mt-0.5 block text-[10px] font-normal text-[#8b8490]">{paid ? "Despesa paga" : "Despesa da casa"}</span>
            </th>
            <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 text-[#4f7ba2]"><span className="grid size-6 place-items-center rounded-full bg-[#e9f1fb]"><House size={13} /></span>{group}</span></td>
            <td className="px-3 py-3">
                {paid && expense.paidBy ? <span className="inline-flex items-center gap-1.5 text-[#79737c]"><span className="grid size-6 place-items-center rounded-full bg-[#4f90cb] text-[10px] text-white">{expense.paidBy.slice(0, 1).toUpperCase()}</span>{expense.paidBy}</span> : <span className="text-[#aaa4ad]">—</span>}
            </td>
            <td className="whitespace-nowrap px-3 py-3">{formatDate(expense.date)}</td>
            <td className="whitespace-nowrap px-3 py-3 font-medium">{formatCurrency(expense.amount)}</td>
            <td className="whitespace-nowrap px-3 py-3"><span className={overdue ? "font-semibold text-red-600" : "font-medium"}>{formatDate(expense.date)}</span>{overdue && <span className="mt-0.5 block text-[10px] text-red-600">Atrasada</span>}</td>
            <td className="px-3 py-3"><span className={`rounded-lg px-2.5 py-1 text-[10px] font-medium ${paid ? "bg-[#e8f3e8] text-[#4a8b45]" : "bg-[#fff2cb] text-[#bd7a00]"}`}>{paid ? "Pago" : "Pendente"}</span></td>
            <td className="px-3 py-3 text-center text-[#a19aa5]"><Paperclip size={15} className="mx-auto" aria-label="Sem comprovante" /></td>
            <td className="px-3 py-3 text-center text-[#a19aa5]"><Bell size={15} className="mx-auto" aria-label="Sem lembrete" /></td>
            <td className="px-3 py-3">
                <div className="flex justify-center gap-1.5">
                    <button type="button" aria-label={`Editar ${expense.description}`} onClick={() => onEdit(expense)} className="grid size-7 place-items-center rounded border border-[#bdb6c1] text-[#615b65] hover:bg-[#f0edf2]"><Pencil size={14} /></button>
                    <button type="button" aria-label={`Excluir ${expense.description}`} onClick={() => onDelete(expense)} className="grid size-7 place-items-center rounded border border-red-300 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
            </td>
        </tr>
    );
}

function ExpenseModal({
    mode,
    expense,
    form,
    subgroups,
    saving,
    error,
    onChange,
    onClose,
    onDelete,
    onSubmit,
}: {
    mode: "create" | "edit";
    expense: Expense | null;
    form: FormState;
    subgroups: ExpenseSubgroup[];
    saving: boolean;
    error: string;
    onChange: (form: FormState) => void;
    onClose: () => void;
    onDelete?: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const subgroup = subgroups.find((item) => item.id === form.subgroupId);
    const editing = mode === "edit";
    return (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#17131a]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="expense-modal-title" className="my-auto w-full max-w-[590px] rounded-2xl bg-[#fffaff] px-6 py-5 shadow-2xl sm:px-8">
                <header className="mb-5 flex items-center justify-between border-b border-[#958e98] pb-2">
                    <h2 id="expense-modal-title" className="text-xl font-semibold">{editing ? expense?.description : "Nova despesa"}</h2>
                    <div className="flex items-center gap-2">
                        {editing && <button type="button" aria-label="Excluir despesa" onClick={onDelete} className="grid size-8 place-items-center rounded text-red-600 hover:bg-red-50"><Trash2 size={18} /></button>}
                        <button type="button" aria-label="Fechar" onClick={onClose} className="grid size-8 place-items-center rounded text-[#514c56] hover:bg-[#f1edf3]"><X size={20} /></button>
                    </div>
                </header>

                <form onSubmit={onSubmit} className="grid gap-4">
                    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{error}</div>}
                    <label className="grid gap-1.5 text-xs font-medium">
                        Descrição
                        <input autoFocus required maxLength={255} value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} placeholder="Digite o nome da despesa" className="h-10 rounded-md border border-[#cfc6d1] bg-white px-3 text-sm font-normal outline-none focus:border-[#65a34b] focus:ring-2 focus:ring-[#65a34b]/20" />
                    </label>

                    <label className="grid max-w-[250px] gap-1.5 text-xs font-medium">
                        Valor total da despesa
                        <span className="flex h-10 items-center rounded-md border border-[#cfc6d1] bg-white px-3 text-sm font-normal text-[#605a64]">
                            R$
                            <input required inputMode="decimal" value={form.amount} onChange={(event) => onChange({ ...form, amount: event.target.value })} placeholder="0,00" className="ml-2 min-w-0 flex-1 border-0 bg-transparent outline-none" />
                        </span>
                    </label>

                    <label className="grid max-w-[360px] gap-1.5 text-xs font-medium">
                            Subgrupo / Categoria (opcional)
                        <select value={form.subgroupId ?? ""} onChange={(event) => onChange({ ...form, subgroupId: event.target.value || null })} className="h-9 rounded-full border border-[#cfc6d1] bg-white px-3 text-xs font-normal outline-none focus:border-[#65a34b]">
                            <option value="">Sem subgrupo</option>
                            {subgroups.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.homeName}</option>)}
                        </select>
                        {subgroup && <span className="font-normal text-[#716b74]">Participantes: {subgroup.members.join(", ")}</span>}
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-xs font-medium">
                            Data de vencimento
                            <span className="flex h-10 items-center gap-2 rounded-md border border-[#cfc6d1] bg-white px-2.5">
                                <CalendarDays size={15} className="text-[#8d8690]" />
                                <input required type="date" value={form.date} onChange={(event) => onChange({ ...form, date: event.target.value })} className="min-w-0 flex-1 bg-transparent text-xs font-normal outline-none" />
                            </span>
                        </label>
                        <label className="grid gap-1.5 text-xs font-medium">
                            Status do pagamento
                            <select required value={form.paymentStatus} onChange={(event) => onChange({ ...form, paymentStatus: event.target.value as FormState["paymentStatus"] })} className="h-10 rounded-md border border-[#cfc6d1] bg-white px-3 text-xs font-normal outline-none focus:border-[#65a34b]">
                                <option value="PENDING">Pendente</option>
                                <option value="PAID">Pago</option>
                            </select>
                        </label>
                    </div>

                    {editing && expense?.paidAt && <p className="text-xs text-[#716b74]">Pago em {formatDate(expense.paidAt)}</p>}
                    <footer className="mt-1 flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={onClose} className="h-9 rounded-md border border-[#cfc6d1] px-4 text-xs font-medium hover:bg-[#f3eff5]">Cancelar</button>
                        <button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#70c34c] px-5 text-xs font-semibold text-white hover:bg-[#5eac3c] disabled:cursor-not-allowed disabled:opacity-60">
                            <Check size={14} /> {saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar despesa"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}

function DeleteExpenseDialog({
    expense,
    deleting,
    onCancel,
    onConfirm,
}: {
    expense: Expense;
    deleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#17131a]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
            <section role="alertdialog" aria-modal="true" aria-labelledby="delete-expense-title" className="w-full max-w-[410px] rounded-2xl bg-[#fffaff] p-6 shadow-2xl">
                <div className="mb-4 flex items-start justify-between">
                    <div className="grid size-10 place-items-center rounded-full bg-red-100 text-red-700"><Trash2 size={19} /></div>
                    <button type="button" aria-label="Fechar" onClick={onCancel} className="grid size-8 place-items-center rounded text-[#514c56] hover:bg-[#f1edf3]"><X size={18} /></button>
                </div>
                <h2 id="delete-expense-title" className="text-lg font-semibold">Excluir despesa?</h2>
                <p className="mt-2 text-sm text-[#716b74]">“{expense.description}” deixará de aparecer na lista financeira. O registro será mantido como cancelado para preservar o histórico.</p>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onCancel} disabled={deleting} className="h-9 rounded-md border border-[#cfc6d1] px-4 text-xs font-medium hover:bg-[#f3eff5]">Cancelar</button>
                    <button type="button" onClick={onConfirm} disabled={deleting} className="h-9 rounded-md bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleting ? "Excluindo…" : "Excluir despesa"}</button>
                </div>
            </section>
        </div>
    );
}
