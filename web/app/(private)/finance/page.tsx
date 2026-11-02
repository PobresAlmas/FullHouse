"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
    ArrowLeft,
    ArrowRight,
    Bell,
    CalendarDays,
    Check,
    ChevronRight,
    House,
    Paperclip,
    Pencil,
    Plus,
    Trash2,
    Wallet,
    X,
} from "lucide-react";
import {
    createExpenseSubgroup,
    createExpense,
    deleteExpense,
    deleteExpenseReminder,
    getAllExpenseSubgroups,
    getExpenseSubgroups,
    getExpenseHomes,
    getExpenseHomeMembers,
    getExpenses,
    setExpensePaymentStatus,
    saveExpenseReminder,
    updateExpenseSubgroup,
    uploadExpenseProof,
    updateExpense,
} from "@/features/expenses/api/expenses.api";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import type {
    CreateExpenseInput,
    Expense,
    ExpenseSubgroup,
    ExpenseHome,
    ExpenseHomeMember,
    ExpenseScope,
    ExpenseReminder,
} from "@/features/expenses/api/expenses.api";
import { AuthContext } from "@/providers/AuthProvider";

type FormState = CreateExpenseInput;
type SubgroupExpenseDraft = Pick<
    CreateExpenseInput,
    "description" | "amount" | "date" | "paymentDate" | "paymentStatus" | "allocations"
>;
type ModalState = { mode: "create" } | { mode: "edit"; expense: Expense } | null;
type ReminderDialogState = { expenseId: string | null; mode: "create" | "view" | "edit" } | null;

const initialForm: FormState = {
    description: "",
    amount: "",
    date: "",
    paymentDate: "",
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

function centsToAmount(cents: number) {
    return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function equalAllocations(amount: string, members: { id: string; name: string }[]) {
    if (members.length === 0) return [];
    const total = amountToCents(amount);
    const base = Math.floor(total / members.length);
    const remainder = total % members.length;
    return members.map((member, index) => ({
        participationId: member.id,
        amount: centsToAmount(base + (index < remainder ? 1 : 0)),
    }));
}

function isValidDate(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return (
        date.getFullYear() === Number(year) &&
        date.getMonth() === Number(month) - 1 &&
        date.getDate() === Number(day)
    );
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
    const auth = useContext(AuthContext);
    const greetingName = auth?.user?.name?.trim() || auth?.user?.email || "Morador";
    const [homes, setHomes] = useState<ExpenseHome[]>([]);
    const [subgroups, setSubgroups] = useState<ExpenseSubgroup[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [scope, setScope] = useState<ExpenseScope>("HOME");
    const [paymentUpdatingIds, setPaymentUpdatingIds] = useState<string[]>([]);
    const [proofUploadingIds, setProofUploadingIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<ModalState>(null);
    const [subgroupModalOpen, setSubgroupModalOpen] = useState(false);
    const [subgroupName, setSubgroupName] = useState("");
    const [subgroupExpenseDrafts, setSubgroupExpenseDrafts] = useState<SubgroupExpenseDraft[]>([]);
    const [editingSubgroup, setEditingSubgroup] = useState<ExpenseSubgroup | null>(null);
    const [subgroupHomeId, setSubgroupHomeId] = useState("");
    const [homeMembers, setHomeMembers] = useState<ExpenseHomeMember[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [subgroupSaving, setSubgroupSaving] = useState(false);
    const [subgroupError, setSubgroupError] = useState("");
    const [subgroupViewerOpen, setSubgroupViewerOpen] = useState(false);
    const [allSubgroups, setAllSubgroups] = useState<ExpenseSubgroup[]>([]);
    const [allSubgroupsLoading, setAllSubgroupsLoading] = useState(false);
    const [reminderDialog, setReminderDialog] = useState<ReminderDialogState>(null);
    const memberRequest = useRef(0);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [form, setForm] = useState<FormState>(initialForm);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formError, setFormError] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        let active = true;
        Promise.all([getExpenseHomes(), getExpenseSubgroups(), getExpenses(scope)])
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
    }, [scope]);

    async function loadHomeMembers(homeId: string) {
        const requestId = ++memberRequest.current;
        setMembersLoading(true);
        setHomeMembers([]);
        try {
            const members = await getExpenseHomeMembers(homeId);
            if (memberRequest.current === requestId) setHomeMembers(members);
        } catch (loadError: unknown) {
            if (memberRequest.current === requestId) setSubgroupError(getErrorMessage(loadError));
        } finally {
            if (memberRequest.current === requestId) setMembersLoading(false);
        }
    }

    useEffect(() => {
        if (
            !modal &&
            !expenseToDelete &&
            !subgroupModalOpen &&
            !subgroupViewerOpen &&
            !reminderDialog
        )
            return;
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setModal(null);
                setExpenseToDelete(null);
                setSubgroupModalOpen(false);
                setSubgroupViewerOpen(false);
                setReminderDialog(null);
            }
        }
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [modal, expenseToDelete, subgroupModalOpen, subgroupViewerOpen, reminderDialog]);

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

    function switchScope(nextScope: ExpenseScope) {
        if (nextScope === scope) return;
        setLoading(true);
        setScope(nextScope);
        setError("");
        setNotice("");
    }

    function openCreateModal() {
        if (scope === "HOME" && homes.length === 0) return;
        setForm({
            ...initialForm,
            homeId: scope === "HOME" ? homes[0]?.id : undefined,
            scope,
        });
        setFormError("");
        setNotice("");
        setModal({ mode: "create" });
    }

    function openSubgroupModal() {
        if (homes.length === 0) return;
        setEditingSubgroup(null);
        setSubgroupExpenseDrafts([]);
        setSubgroupName("");
        setSubgroupHomeId(homes[0].id);
        setHomeMembers([]);
        setSelectedMemberIds([]);
        setSubgroupError("");
        setSubgroupModalOpen(true);
        void loadHomeMembers(homes[0].id);
    }

    function openEditSubgroup(group: ExpenseSubgroup) {
        setSubgroupViewerOpen(false);
        setEditingSubgroup(group);
        setSubgroupExpenseDrafts([]);
        setSubgroupName(group.name);
        setSubgroupHomeId(group.homeId);
        setHomeMembers([]);
        setSelectedMemberIds(
            group.memberIds ?? group.memberDetails?.map((member) => member.id) ?? []
        );
        setSubgroupError("");
        setSubgroupModalOpen(true);
        void loadHomeMembers(group.homeId);
    }

    async function openAllSubgroups() {
        setSubgroupViewerOpen(true);
        setAllSubgroupsLoading(true);
        try {
            setAllSubgroups(await getAllExpenseSubgroups());
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError));
        } finally {
            setAllSubgroupsLoading(false);
        }
    }

    function openReminder(expense?: Expense) {
        setReminderDialog({
            expenseId: expense?.id ?? null,
            mode: expense?.reminder ? "view" : "create",
        });
    }

    function saveReminderToList(expenseId: string, reminder: ExpenseReminder | null) {
        setExpenses((items) =>
            items.map((item) =>
                item.id === expenseId
                    ? {
                          ...item,
                          reminder: reminder
                              ? {
                                    id: reminder.id,
                                    message: reminder.message,
                                    remindAt: reminder.remindAt,
                                }
                              : null,
                      }
                    : item
            )
        );
    }

    async function handleProofUpload(expense: Expense, file: File) {
        if (file.size > 10 * 1024 * 1024) {
            setError("O comprovante deve ter no máximo 10 MB.");
            return;
        }
        if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.type)) {
            setError("Envie um arquivo PDF, JPG, PNG ou WEBP.");
            return;
        }
        setProofUploadingIds((ids) => [...ids, expense.id]);
        setError("");
        try {
            const proof = await uploadExpenseProof(expense.id, file);
            setExpenses((items) =>
                items.map((item) =>
                    item.id === expense.id
                        ? { ...item, proofs: [...(item.proofs ?? []), proof] }
                        : item
                )
            );
            setModal((current) =>
                current?.mode === "edit" && current.expense.id === expense.id
                    ? {
                          ...current,
                          expense: {
                              ...current.expense,
                              proofs: [...(current.expense.proofs ?? []), proof],
                          },
                      }
                    : current
            );
            setNotice("Comprovante anexado à despesa.");
        } catch (uploadError: unknown) {
            setError(getErrorMessage(uploadError));
        } finally {
            setProofUploadingIds((ids) => ids.filter((id) => id !== expense.id));
        }
    }

    async function handleCreateSubgroup(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubgroupError("");
        if (!subgroupName.trim()) {
            setSubgroupError("Informe o nome do subgrupo.");
            return;
        }
        if (selectedMemberIds.length === 0) {
            setSubgroupError("Selecione pelo menos um morador.");
            return;
        }
        setSubgroupSaving(true);
        try {
            const input = {
                homeId: subgroupHomeId,
                name: subgroupName.trim(),
                memberIds: selectedMemberIds,
            };
            const saved = editingSubgroup
                ? await updateExpenseSubgroup(editingSubgroup.id, input)
                : await createExpenseSubgroup(input);
            setSubgroups((items) => {
                const next = editingSubgroup
                    ? items.map((item) => (item.id === saved.id ? saved : item))
                    : [...items, saved];
                return next.sort((a, b) => a.name.localeCompare(b.name));
            });
            setAllSubgroups((items) => {
                const next = editingSubgroup
                    ? items.map((item) => (item.id === saved.id ? saved : item))
                    : [...items, saved];
                return next.sort((a, b) => a.name.localeCompare(b.name));
            });
            const createdExpenses: Expense[] = [];
            const failedDrafts: SubgroupExpenseDraft[] = [];
            for (const draft of subgroupExpenseDrafts) {
                try {
                    const created = await createExpense({
                        ...draft,
                        homeId: saved.homeId,
                        subgroupId: saved.id,
                        scope: "HOME",
                    });
                    createdExpenses.push(created);
                } catch {
                    failedDrafts.push(draft);
                }
            }
            if (createdExpenses.length) {
                setExpenses((items) => sortExpenses([...items, ...createdExpenses]));
            }
            setSubgroupExpenseDrafts(failedDrafts);
            if (failedDrafts.length) {
                setEditingSubgroup(saved);
                setSubgroupError(
                    `O subgrupo foi salvo, mas ${failedDrafts.length} ${failedDrafts.length === 1 ? "despesa não foi salva" : "despesas não foram salvas"}. Revise os dados e tente novamente.`
                );
                return;
            }
            setSubgroupModalOpen(false);
            setNotice(
                editingSubgroup
                    ? `Subgrupo “${saved.name}” atualizado com sucesso.`
                    : `Subgrupo “${saved.name}” criado com sucesso.`
            );
            setEditingSubgroup(null);
        } catch (createError: unknown) {
            setSubgroupError(getErrorMessage(createError));
        } finally {
            setSubgroupSaving(false);
        }
    }

    function openEditModal(expense: Expense) {
        setForm({
            description: expense.description,
            amount: expense.amount,
            date: expense.date?.slice(0, 10) ?? "",
            paymentDate: expense.paidAt?.slice(0, 10) ?? "",
            homeId: expense.homeId ?? homes[0]?.id,
            subgroupId: expense.subgroup?.id ?? "",
            paymentStatus: expense.paymentStatus === "PAID" ? "PAID" : "PENDING",
            scope,
            allocations:
                expense.allocationStrategy === "PERSONALIZADO"
                    ? expense.allocations?.map(({ participationId, amount }) => ({
                          participationId,
                          amount,
                      }))
                    : undefined,
        });
        setFormError("");
        setNotice("");
        setModal({ mode: "edit", expense });
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError("");

        if (scope === "HOME" && homes.length === 0) {
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
                homeId:
                    scope === "HOME"
                        ? (selectedSubgroup?.homeId ?? form.homeId ?? homes[0]?.id)
                        : undefined,
                subgroupId: form.subgroupId || null,
                paymentDate: form.paymentStatus === "PAID" ? form.paymentDate || null : null,
                scope,
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

    async function togglePersonalPayment(expense: Expense) {
        if (paymentUpdatingIds.includes(expense.id)) return;
        setPaymentUpdatingIds((ids) => [...ids, expense.id]);
        try {
            const result = await setExpensePaymentStatus(
                expense.id,
                expense.paymentStatus !== "PAID"
            );
            setExpenses((items) =>
                items.map((item) =>
                    item.id === expense.id
                        ? { ...item, paymentStatus: result.paymentStatus, paidAt: result.paidAt }
                        : item
                )
            );
        } catch (paymentError: unknown) {
            setError(getErrorMessage(paymentError));
        } finally {
            setPaymentUpdatingIds((ids) => ids.filter((id) => id !== expense.id));
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
                <AppPageHeader
                    greetingName={greetingName}
                    residenceName={houseName ?? "Nenhuma casa ativa"}
                    settingsHref="/settings"
                    residenceControl={
                        <div
                            role="group"
                            aria-label="Contexto financeiro"
                            className="flex rounded-xl bg-[#e8e5e9] p-1 text-xs"
                        >
                            <button
                                type="button"
                                aria-pressed={scope === "PERSONAL"}
                                onClick={() => switchScope("PERSONAL")}
                                className={`min-w-[82px] rounded-lg px-4 py-2 ${scope === "PERSONAL" ? "bg-[#4e812f] text-white" : "text-[#514c56]"}`}
                            >
                                Pessoal
                            </button>
                            <button
                                type="button"
                                aria-pressed={scope === "HOME"}
                                disabled={homes.length === 0}
                                onClick={() => switchScope("HOME")}
                                className={`min-w-[82px] rounded-lg px-4 py-2 disabled:opacity-40 ${scope === "HOME" ? "bg-[#4e812f] text-white" : "text-[#514c56]"}`}
                            >
                                {houseName ?? "Casa"}
                            </button>
                        </div>
                    }
                />

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
                    {!loading && scope === "HOME" && homes.length === 0 && (
                        <section className="rounded-xl border border-[#d6cdd9] bg-[#fffaff] p-10 text-center">
                            <House className="mx-auto mb-3 text-[#4f7f63]" size={30} />
                            <h2 className="font-semibold">Nenhuma residência associada</h2>
                            <p className="mt-1 text-sm text-[#77717c]">
                                Associe-se a uma residência para consultar e cadastrar despesas da
                                casa.
                            </p>
                        </section>
                    )}
                    <div
                        style={{
                            display:
                                loading || (scope === "HOME" && homes.length === 0)
                                    ? "none"
                                    : undefined,
                        }}
                        className="mb-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(250px,286px)]"
                    >
                        <section className="rounded-xl border border-[#d6cdd9] bg-[#fffaff] px-5 pb-5 pt-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <h2 className="mb-3 border-b border-[#817b84] pb-1 text-[22px] font-bold">
                                {scope === "PERSONAL" ? "Dashboard Individual" : "Dashboard Casa"}
                            </h2>
                            <div className="grid gap-3 md:grid-cols-3">
                                <SummaryCard
                                    icon={<Wallet size={21} />}
                                    iconClass="bg-red-100 text-red-600"
                                    label={
                                        scope === "PERSONAL"
                                            ? "Total a pagar (Individual)"
                                            : "Total a pagar (Casa)"
                                    }
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
                                    detail="Últimos 3 meses"
                                />
                            </div>
                        </section>

                        <CalendarWidget expenses={expenses} />
                    </div>

                    {scope === "PERSONAL" && (
                        <section className="mb-5 rounded-xl border border-[#d6cdd9] bg-[#fffaff] p-4">
                            <h2 className="font-semibold">Modo pessoal</h2>
                            <p className="mt-1 text-sm text-[#716b74]">
                                Aqui aparecem suas despesas pessoais e a sua parte nas despesas
                                compartilhadas. Essas informações são privadas.
                            </p>
                        </section>
                    )}

                    <section
                        style={{
                            display:
                                loading || (scope === "HOME" && homes.length === 0)
                                    ? "none"
                                    : undefined,
                        }}
                        className="overflow-hidden rounded-lg border border-[#e9e2eb] bg-[#fffaff]"
                    >
                        {loading ? (
                            <p className="p-8 text-sm text-[#77717c]">Carregando despesas…</p>
                        ) : expenses.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <Wallet className="mx-auto mb-3 text-[#8b858e]" size={32} />
                                <h2 className="font-semibold">Nenhuma despesa cadastrada</h2>
                                <p className="mt-1 text-sm text-[#77717c]">
                                    {scope === "PERSONAL"
                                        ? "Adicione uma despesa para acompanhar seus gastos pessoais."
                                        : "Adicione uma despesa para acompanhar os gastos da casa."}
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
                                                personalMode={scope === "PERSONAL"}
                                                paymentUpdating={paymentUpdatingIds.includes(
                                                    expense.id
                                                )}
                                                onTogglePaid={() =>
                                                    void togglePersonalPayment(expense)
                                                }
                                                onReminder={() => openReminder(expense)}
                                                proofUploading={proofUploadingIds.includes(
                                                    expense.id
                                                )}
                                                onProofUpload={(file) =>
                                                    void handleProofUpload(expense, file)
                                                }
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
                                    disabled={loading || expenses.length === 0}
                                    onClick={() => openReminder()}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4e812f] px-3 py-2 text-[11px] font-medium text-white hover:bg-[#3e6b25] disabled:opacity-50"
                                >
                                    <Plus size={14} /> Adicionar lembrete
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void openAllSubgroups()}
                                    disabled={loading || homes.length === 0}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#4e812f] px-3 py-2 text-[11px] font-medium text-[#3e6b25] hover:bg-[#f0f7ec] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <House size={14} /> Visualizar todos os subgrupos
                                </button>
                                <button
                                    type="button"
                                    onClick={openSubgroupModal}
                                    disabled={loading || homes.length === 0}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4e812f] px-3 py-2 text-[11px] font-medium text-white hover:bg-[#3e6b25] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Plus size={14} /> Criar subgrupo
                                </button>
                                <button
                                    type="button"
                                    onClick={openCreateModal}
                                    disabled={loading || (scope === "HOME" && homes.length === 0)}
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
                    scope={scope}
                    homes={homes}
                    subgroups={subgroups}
                    saving={saving}
                    error={formError}
                    proofUploading={
                        modal.mode === "edit" && proofUploadingIds.includes(modal.expense.id)
                    }
                    onProofUpload={(file) => {
                        if (modal.mode === "edit") void handleProofUpload(modal.expense, file);
                    }}
                    onChange={setForm}
                    onClose={() => setModal(null)}
                    onDelete={
                        modal.mode === "edit" ? () => setExpenseToDelete(modal.expense) : undefined
                    }
                    onSubmit={handleSubmit}
                />
            )}

            {subgroupModalOpen && (
                <SubgroupModal
                    editing={!!editingSubgroup}
                    expenses={expenses.filter(
                        (expense) => expense.subgroup?.id === editingSubgroup?.id
                    )}
                    draftExpenses={subgroupExpenseDrafts}
                    proofUploadingIds={proofUploadingIds}
                    homes={homes}
                    homeId={subgroupHomeId}
                    name={subgroupName}
                    members={homeMembers}
                    selectedMemberIds={selectedMemberIds}
                    loadingMembers={membersLoading}
                    saving={subgroupSaving}
                    error={subgroupError}
                    onHomeChange={(homeId) => {
                        setSubgroupHomeId(homeId);
                        setSelectedMemberIds([]);
                        setSubgroupError("");
                        void loadHomeMembers(homeId);
                    }}
                    onNameChange={setSubgroupName}
                    onDraftExpensesChange={setSubgroupExpenseDrafts}
                    onEditExpense={(expense) => {
                        setSubgroupModalOpen(false);
                        setEditingSubgroup(null);
                        openEditModal(expense);
                    }}
                    onProofUpload={(expense, file) => void handleProofUpload(expense, file)}
                    onToggleMember={(memberId) =>
                        setSelectedMemberIds((ids) =>
                            ids.includes(memberId)
                                ? ids.filter((id) => id !== memberId)
                                : [...ids, memberId]
                        )
                    }
                    onClose={() => {
                        setSubgroupModalOpen(false);
                        setEditingSubgroup(null);
                    }}
                    onSubmit={handleCreateSubgroup}
                />
            )}

            {subgroupViewerOpen && (
                <SubgroupListModal
                    groups={allSubgroups}
                    expenses={expenses}
                    loading={allSubgroupsLoading}
                    canManageExpenses={scope === "HOME"}
                    onEdit={openEditSubgroup}
                    onEditExpense={(expense) => {
                        setSubgroupViewerOpen(false);
                        openEditModal(expense);
                    }}
                    onProofUpload={(expense, file) => void handleProofUpload(expense, file)}
                    proofUploadingIds={proofUploadingIds}
                    onClose={() => setSubgroupViewerOpen(false)}
                />
            )}

            {reminderDialog && (
                <ExpenseReminderModal
                    key={`${reminderDialog.mode}-${reminderDialog.expenseId ?? "new"}`}
                    mode={reminderDialog.mode}
                    expenseId={reminderDialog.expenseId}
                    expenses={expenses}
                    onModeChange={(mode, expenseId) => setReminderDialog({ mode, expenseId })}
                    onClose={() => setReminderDialog(null)}
                    onSaved={(expenseId, reminder) => {
                        saveReminderToList(expenseId, reminder);
                        setReminderDialog(null);
                    }}
                    onDeleted={(expenseId) => {
                        saveReminderToList(expenseId, null);
                        setReminderDialog(null);
                    }}
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

function SubgroupListModal({
    groups,
    expenses,
    loading,
    canManageExpenses,
    onEdit,
    onEditExpense,
    onProofUpload,
    proofUploadingIds,
    onClose,
}: {
    groups: ExpenseSubgroup[];
    expenses: Expense[];
    loading: boolean;
    canManageExpenses: boolean;
    onEdit: (group: ExpenseSubgroup) => void;
    onEditExpense: (expense: Expense) => void;
    onProofUpload: (expense: Expense, file: File) => void;
    proofUploadingIds: string[];
    onClose: () => void;
}) {
    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#17131a]/55 p-4"
            onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="subgroup-list-title"
                className="my-auto w-full max-w-[620px] rounded-2xl bg-[#fffaff] px-6 py-5 shadow-2xl sm:px-8"
            >
                <header className="mb-4 flex items-center justify-between border-b border-[#958e98] pb-2">
                    <div>
                        <h2 id="subgroup-list-title" className="text-xl font-semibold">
                            Todos os subgrupos
                        </h2>
                        <p className="mt-1 text-xs text-[#817b84]">
                            Subgrupos das suas residências
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Fechar"
                        onClick={onClose}
                        className="grid size-8 place-items-center rounded hover:bg-[#f1edf3]"
                    >
                        <X size={20} />
                    </button>
                </header>
                {loading ? (
                    <p role="status" className="py-8 text-center text-sm text-[#716b74]">
                        Carregando subgrupos…
                    </p>
                ) : groups.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#716b74]">
                        Nenhum subgrupo cadastrado nas suas residências.
                    </p>
                ) : (
                    <ul className="max-h-[55vh] space-y-3 overflow-y-auto">
                        {groups.map((group) => {
                            const groupExpenses = expenses.filter(
                                (expense) => expense.subgroup?.id === group.id
                            );
                            const memberDetails = group.memberDetails ?? [];
                            const totalCents = groupExpenses.reduce(
                                (sum, expense) =>
                                    sum + amountToCents(expense.totalAmount ?? expense.amount),
                                0
                            );
                            const memberTotals = memberDetails.map((member) => {
                                const cents = groupExpenses.reduce((sum, expense) => {
                                    const allocation = expense.allocations?.find(
                                        (item) => item.participationId === member.id
                                    );
                                    if (allocation) return sum + amountToCents(allocation.amount);
                                    if (expense.allocationStrategy === "PERSONALIZADO") return sum;
                                    const equalShare = equalAllocations(
                                        expense.totalAmount ?? expense.amount,
                                        memberDetails
                                    ).find((item) => item.participationId === member.id);
                                    return sum + amountToCents(equalShare?.amount ?? "0");
                                }, 0);
                                return { ...member, cents };
                            });
                            const hasCustomDivision = groupExpenses.some(
                                (expense) => expense.allocationStrategy === "PERSONALIZADO"
                            );
                            return (
                                <li
                                    key={group.id}
                                    className="rounded-xl border border-[#ded7e1] bg-white p-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-semibold">{group.name}</h3>
                                            <p className="mt-0.5 text-xs text-[#77717c]">
                                                {group.homeName}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div
                                                aria-label={`${group.members.length} participantes`}
                                                className="flex -space-x-1.5"
                                                title={group.members.join(", ")}
                                            >
                                                {group.members.slice(0, 4).map((member, index) => (
                                                    <span
                                                        key={`${group.id}-${member}`}
                                                        className={`grid size-7 place-items-center rounded-full border-2 border-white text-[10px] font-semibold text-white ${["bg-[#4e9b31]", "bg-[#7041a1]", "bg-[#536273]", "bg-[#437eab]"][index % 4]}`}
                                                    >
                                                        {member.slice(0, 1).toUpperCase()}
                                                    </span>
                                                ))}
                                                <span className="sr-only">
                                                    {group.members.join(", ")}
                                                </span>
                                            </div>
                                            {group.canEdit && (
                                                <button
                                                    type="button"
                                                    aria-label={`Editar subgrupo ${group.name}`}
                                                    onClick={() => onEdit(group)}
                                                    className="grid size-8 place-items-center rounded-md text-[#5c5660] hover:bg-[#f1edf3]"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="mt-3 text-xs font-semibold">
                                        Despesas compartilhadas
                                    </p>
                                    <div className="mt-1 overflow-hidden rounded-lg border border-[#eee9f0] text-xs">
                                        <div className="grid grid-cols-[1fr_auto] bg-[#faf8fb] px-3 py-2 font-medium text-[#77717c]">
                                            <span>Conta, vencimento e pagamento</span>
                                            <span>Valor</span>
                                        </div>
                                        {groupExpenses.length ? (
                                            groupExpenses.map((expense) => (
                                                <SharedExpenseRow
                                                    key={expense.id}
                                                    expense={expense}
                                                    canEdit={canManageExpenses && !!expense.canEdit}
                                                    proofUploading={proofUploadingIds.includes(
                                                        expense.id
                                                    )}
                                                    onEdit={() => onEditExpense(expense)}
                                                    onProofUpload={(file) =>
                                                        onProofUpload(expense, file)
                                                    }
                                                />
                                            ))
                                        ) : (
                                            <p className="px-3 py-2 text-[#817b84]">
                                                Nenhuma despesa compartilhada.
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-3 rounded-lg border border-[#ded7e1] p-3 text-xs">
                                        <p className="mb-2 font-semibold">
                                            Resumo e divisão financeira
                                        </p>
                                        <p>
                                            Total de despesas:{" "}
                                            <strong>{formatCurrency(totalCents / 100)}</strong>
                                        </p>
                                        <p className="mt-1">
                                            Divisão:{" "}
                                            {hasCustomDivision
                                                ? "Personalizada por conta"
                                                : `Igual (${group.members.length} ${group.members.length === 1 ? "pessoa" : "pessoas"})`}
                                        </p>
                                        <div className="mt-2 grid gap-1 border-t border-[#eee9f0] pt-2 sm:grid-cols-2">
                                            {memberTotals.map((member) => (
                                                <p
                                                    key={member.id}
                                                    className="flex justify-between gap-2"
                                                >
                                                    <span>{member.name}</span>
                                                    <strong>
                                                        {formatCurrency(member.cents / 100)}
                                                    </strong>
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-[#625c66]">
                                        Integrantes:{" "}
                                        {group.members.length
                                            ? group.members.join(", ")
                                            : "Sem participantes ativos"}
                                    </p>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <footer className="mt-5 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-[#e9e6eb] px-5 py-2 text-sm"
                    >
                        Fechar
                    </button>
                </footer>
            </section>
        </div>
    );
}

function SharedExpenseRow({
    expense,
    canEdit,
    proofUploading,
    onEdit,
    onProofUpload,
}: {
    expense: Expense;
    canEdit: boolean;
    proofUploading: boolean;
    onEdit: () => void;
    onProofUpload: (file: File) => void;
}) {
    const proofInput = useRef<HTMLInputElement>(null);
    return (
        <div className="grid gap-2 border-t border-[#eee9f0] px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
                <p className="truncate font-medium text-[#333039]">{expense.description}</p>
                <p className="mt-0.5 text-[10px] text-[#817b84]">
                    Vence: {formatDate(expense.date)} · Pago:{" "}
                    {expense.paidAt ? formatDate(expense.paidAt) : "Pendente"}
                </p>
                {!!expense.proofs?.length && (
                    <div className="mt-1 flex flex-wrap gap-1">
                        {expense.proofs.map((proof, index) => (
                            <a
                                key={proof.id}
                                href={proof.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded bg-[#edf6e8] px-1.5 py-0.5 text-[9px] font-medium text-[#43752d]"
                            >
                                Comprovante {index + 1} · {proof.type}
                            </a>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
                <strong className="whitespace-nowrap">
                    {formatCurrency(expense.totalAmount ?? expense.amount)}
                </strong>
                <input
                    ref={proofInput}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    className="sr-only"
                    aria-label={`Selecionar comprovante para ${expense.description}`}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) onProofUpload(file);
                        event.target.value = "";
                    }}
                />
                <button
                    type="button"
                    aria-label={`Anexar comprovante a ${expense.description}`}
                    title="Anexar comprovante"
                    disabled={proofUploading}
                    onClick={() => proofInput.current?.click()}
                    className="grid size-7 place-items-center rounded text-[#817b84] hover:bg-[#f1edf3] disabled:opacity-50"
                >
                    <Paperclip size={14} />
                </button>
                {canEdit && (
                    <button
                        type="button"
                        onClick={onEdit}
                        className="inline-flex h-7 items-center gap-1 rounded border border-[#ded7e1] px-2 text-[10px] font-medium text-[#625c66] hover:bg-[#f8f6f9]"
                    >
                        <Pencil size={12} /> Editar
                    </button>
                )}
            </div>
        </div>
    );
}

function ExpenseReminderModal({
    mode,
    expenseId,
    expenses,
    onModeChange,
    onClose,
    onSaved,
    onDeleted,
}: {
    mode: "create" | "view" | "edit";
    expenseId: string | null;
    expenses: Expense[];
    onModeChange: (mode: "view" | "edit", expenseId: string) => void;
    onClose: () => void;
    onSaved: (expenseId: string, reminder: ExpenseReminder | null) => void;
    onDeleted: (expenseId: string) => void;
}) {
    const [selectedId, setSelectedId] = useState(
        expenseId ?? expenses.find((expense) => !expense.reminder)?.id ?? ""
    );
    const selectedExpense = expenses.find((expense) => expense.id === selectedId) ?? null;
    const selectedReminder = selectedExpense?.reminder ?? null;
    const [remindAt, setRemindAt] = useState(() => {
        const current = mode !== "create" ? selectedReminder?.remindAt : undefined;
        if (!current) return "";
        const date = new Date(current);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
    });
    const [message, setMessage] = useState(
        mode === "edit" ? (selectedReminder?.message ?? "") : ""
    );
    const [enabled, setEnabled] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState("");

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedExpense) {
            setError("Selecione uma despesa para vincular o lembrete.");
            return;
        }
        if (enabled && !remindAt) {
            setError("Informe a data e o horário do lembrete.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const reminder = await saveExpenseReminder(selectedExpense.id, {
                remindAt: new Date(remindAt).toISOString(),
                message: message.trim() || undefined,
                enabled,
            });
            onSaved(selectedExpense.id, reminder);
        } catch (saveError: unknown) {
            setError(getErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    }

    async function confirmRemoveReminder() {
        if (!selectedExpense) return;
        setDeleting(true);
        setError("");
        try {
            await deleteExpenseReminder(selectedExpense.id);
            onDeleted(selectedExpense.id);
        } catch (deleteError: unknown) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeleting(false);
        }
    }

    const viewOnly = mode === "view" && !!selectedReminder && !confirmDelete;
    return (
        <div
            className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#17131a]/55 p-4"
            onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="reminder-modal-title"
                className="my-auto w-full max-w-[540px] rounded-2xl bg-[#fffaff] px-6 py-5 shadow-2xl sm:px-8"
            >
                <header className="mb-5 flex items-center justify-between border-b border-[#958e98] pb-2">
                    <h2 id="reminder-modal-title" className="text-lg font-semibold">
                        {confirmDelete
                            ? "Excluir lembrete?"
                            : viewOnly
                              ? "Visualizar lembrete"
                              : mode === "edit"
                                ? "Editar lembrete"
                                : "Adicionar lembrete"}
                    </h2>
                    <button
                        type="button"
                        aria-label="Fechar"
                        onClick={onClose}
                        className="grid size-8 place-items-center rounded hover:bg-[#f1edf3]"
                    >
                        <X size={19} />
                    </button>
                </header>
                {error && (
                    <p
                        role="alert"
                        className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800"
                    >
                        {error}
                    </p>
                )}
                {confirmDelete ? (
                    <div>
                        <div className="mb-4 flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-full bg-[#ffe0df] text-red-700">
                                <Trash2 size={17} />
                            </span>
                            <div>
                                <p className="font-semibold">Excluir lembrete?</p>
                                <p className="text-xs text-[#716b74]">
                                    Esta ação não pode ser desfeita.
                                </p>
                            </div>
                        </div>
                        <div className="rounded-lg bg-[#ffe2df] p-3 text-xs text-red-800">
                            Este lembrete será removido e você não receberá mais avisos para esta
                            conta.
                        </div>
                        <footer className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(false)}
                                className="rounded-lg border border-[#4e812f] px-4 py-2 text-sm text-[#3e6b25]"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => void confirmRemoveReminder()}
                                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                                {deleting ? "Excluindo…" : "Excluir"}
                            </button>
                        </footer>
                    </div>
                ) : viewOnly ? (
                    <div>
                        <div className="mb-5 flex items-center gap-3 rounded-lg bg-[#edf6e8] p-3 text-[#43752d]">
                            <Bell size={20} />
                            <div>
                                <strong className="block text-sm">Detalhes do lembrete</strong>
                                <span className="text-xs">
                                    Informações do lembrete desta despesa.
                                </span>
                            </div>
                        </div>
                        <dl className="grid gap-4 text-sm">
                            <div>
                                <dt className="text-xs font-semibold">Despesa</dt>
                                <dd className="mt-1 font-medium">{selectedExpense?.description}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold">Quando</dt>
                                <dd className="mt-1">
                                    {new Intl.DateTimeFormat("pt-BR", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                    }).format(new Date(selectedReminder.remindAt))}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold">Mensagem</dt>
                                <dd className="mt-1 rounded-lg border border-[#ddd6df] p-3">
                                    {selectedReminder.message || "Sem mensagem adicional."}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold">Status</dt>
                                <dd className="mt-1 inline-flex rounded-full bg-[#e2f2dc] px-2.5 py-1 text-xs text-[#43752d]">
                                    Ativo
                                </dd>
                            </div>
                        </dl>
                        <footer className="mt-6 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => onModeChange("edit", selectedExpense!.id)}
                                className="rounded-lg border border-[#cfc6d1] px-4 py-2 text-sm"
                            >
                                Editar
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700"
                            >
                                Excluir
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg bg-[#e9e6eb] px-4 py-2 text-sm"
                            >
                                Fechar
                            </button>
                        </footer>
                    </div>
                ) : (
                    <form onSubmit={submit} className="grid gap-4">
                        <div className="flex items-center gap-3 rounded-lg bg-[#edf6e8] p-3 text-[#43752d]">
                            <Bell size={20} />
                            <div>
                                <strong className="block text-sm">
                                    {mode === "edit" ? "Editar lembrete" : "Adicionar lembrete"}
                                </strong>
                                <span className="text-xs">
                                    Configure um lembrete para esta despesa.
                                </span>
                            </div>
                        </div>
                        <label className="grid gap-1.5 text-xs font-semibold">
                            Despesa
                            <select
                                required
                                value={selectedId}
                                disabled={!!expenseId || mode === "edit"}
                                onChange={(event) => setSelectedId(event.target.value)}
                                className="h-10 rounded-md border border-[#cfc6d1] bg-white px-3 text-sm font-normal"
                            >
                                <option value="">Selecione uma despesa</option>
                                {expenses
                                    .filter((expense) => mode !== "create" || !expense.reminder)
                                    .map((expense) => (
                                        <option key={expense.id} value={expense.id}>
                                            {expense.description}
                                        </option>
                                    ))}
                            </select>
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1.5 text-xs font-semibold">
                                Data do lembrete
                                <input
                                    required={enabled}
                                    type="date"
                                    value={remindAt.slice(0, 10)}
                                    onChange={(event) =>
                                        setRemindAt(
                                            `${event.target.value}T${remindAt.slice(11, 16) || "09:00"}`
                                        )
                                    }
                                    className="h-10 rounded-md border border-[#cfc6d1] bg-white px-3 text-sm font-normal"
                                />
                            </label>
                            <label className="grid gap-1.5 text-xs font-semibold">
                                Horário
                                <input
                                    required={enabled}
                                    type="time"
                                    value={remindAt.slice(11, 16)}
                                    onChange={(event) =>
                                        setRemindAt(
                                            `${remindAt.slice(0, 10)}T${event.target.value}`
                                        )
                                    }
                                    className="h-10 rounded-md border border-[#cfc6d1] bg-white px-3 text-sm font-normal"
                                />
                            </label>
                        </div>
                        <label className="grid gap-1.5 text-xs font-semibold">
                            Mensagem (opcional)
                            <textarea
                                maxLength={200}
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder="Escreva uma mensagem para lembrar do pagamento"
                                className="min-h-20 resize-y rounded-md border border-[#cfc6d1] bg-white px-3 py-2 text-sm font-normal"
                            />
                            <span className="text-right text-[10px] font-normal text-[#817b84]">
                                {message.length}/200
                            </span>
                        </label>
                        <label className="flex items-center justify-between rounded-lg border border-[#e3dce6] p-3 text-sm">
                            <span>
                                <strong className="block">Receber notificação</strong>
                                <small className="text-xs text-[#817b84]">
                                    Você será notificado na data e horário escolhidos.
                                </small>
                            </span>
                            <input
                                aria-label="Receber notificação"
                                type="checkbox"
                                checked={enabled}
                                onChange={(event) => setEnabled(event.target.checked)}
                                className="size-5 accent-[#4e812f]"
                            />
                        </label>
                        <footer className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg bg-[#e9e6eb] px-4 py-2 text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !selectedId}
                                className="rounded-lg bg-[#25811c] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                                {saving
                                    ? "Salvando…"
                                    : mode === "edit"
                                      ? "Salvar lembrete"
                                      : "Salvar lembrete"}
                            </button>
                        </footer>
                    </form>
                )}
            </section>
        </div>
    );
}

function SubgroupModal({
    editing,
    expenses,
    draftExpenses,
    proofUploadingIds,
    homes,
    homeId,
    name,
    members,
    selectedMemberIds,
    loadingMembers,
    saving,
    error,
    onHomeChange,
    onNameChange,
    onDraftExpensesChange,
    onEditExpense,
    onProofUpload,
    onToggleMember,
    onClose,
    onSubmit,
}: {
    editing: boolean;
    expenses: Expense[];
    draftExpenses: SubgroupExpenseDraft[];
    proofUploadingIds: string[];
    homes: ExpenseHome[];
    homeId: string;
    name: string;
    members: ExpenseHomeMember[];
    selectedMemberIds: string[];
    loadingMembers: boolean;
    saving: boolean;
    error: string;
    onHomeChange: (homeId: string) => void;
    onNameChange: (name: string) => void;
    onDraftExpensesChange: (drafts: SubgroupExpenseDraft[]) => void;
    onEditExpense: (expense: Expense) => void;
    onProofUpload: (expense: Expense, file: File) => void;
    onToggleMember: (memberId: string) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const selectedMembers = members.filter((member) => selectedMemberIds.includes(member.id));
    const [newExpense, setNewExpense] = useState<SubgroupExpenseDraft>({
        description: "",
        amount: "",
        date: "",
        paymentDate: "",
        paymentStatus: "PENDING",
    });
    const [newExpenseError, setNewExpenseError] = useState("");
    const totalCents =
        expenses.reduce(
            (sum, expense) => sum + amountToCents(expense.totalAmount ?? expense.amount),
            0
        ) + draftExpenses.reduce((sum, expense) => sum + amountToCents(expense.amount), 0);
    const memberTotals = selectedMembers.map((member) => {
        const expenseCents = expenses.reduce((sum, expense) => {
            const allocation = expense.allocations?.find(
                (item) => item.participationId === member.id
            );
            if (allocation) return sum + amountToCents(allocation.amount);
            if (expense.allocationStrategy === "PERSONALIZADO") return sum;
            const equalShare = equalAllocations(
                expense.totalAmount ?? expense.amount,
                selectedMembers
            ).find((item) => item.participationId === member.id);
            return sum + amountToCents(equalShare?.amount ?? "0");
        }, 0);
        const draftCents = draftExpenses.reduce((sum, expense) => {
            const allocation = expense.allocations?.find(
                (item) => item.participationId === member.id
            );
            if (allocation) return sum + amountToCents(allocation.amount);
            const equalShare = equalAllocations(expense.amount, selectedMembers).find(
                (item) => item.participationId === member.id
            );
            return sum + amountToCents(equalShare?.amount ?? "0");
        }, 0);
        return { ...member, cents: expenseCents + draftCents };
    });
    const draftAllocationTotal = (newExpense.allocations ?? []).reduce(
        (sum, allocation) => sum + amountToCents(allocation.amount),
        0
    );

    function addDraftExpense() {
        setNewExpenseError("");
        if (selectedMembers.length === 0) {
            setNewExpenseError(
                "Selecione os participantes do subgrupo antes de adicionar despesas."
            );
            return;
        }
        if (!newExpense.description.trim() || !newExpense.amount || !newExpense.date) {
            setNewExpenseError("Preencha descrição, valor e vencimento da despesa.");
            return;
        }
        if (amountToCents(newExpense.amount) <= 0 || !isValidDate(newExpense.date)) {
            setNewExpenseError("Informe um valor maior que zero e uma data de vencimento válida.");
            return;
        }
        if (newExpense.paymentStatus === "PAID" && !newExpense.paymentDate) {
            setNewExpenseError("Informe a data em que esta despesa foi paga.");
            return;
        }
        if (newExpense.allocations && draftAllocationTotal !== amountToCents(newExpense.amount)) {
            setNewExpenseError("A divisão precisa somar exatamente o valor da despesa.");
            return;
        }
        onDraftExpensesChange([
            ...draftExpenses,
            {
                ...newExpense,
                description: newExpense.description.trim(),
                amount: newExpense.amount.replace(",", "."),
                paymentDate: newExpense.paymentStatus === "PAID" ? newExpense.paymentDate : null,
            },
        ]);
        setNewExpense({
            description: "",
            amount: "",
            date: "",
            paymentDate: "",
            paymentStatus: "PENDING",
        });
    }
    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#17131a]/55 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="subgroup-modal-title"
                className="my-auto w-full max-w-[560px] rounded-2xl bg-[#fffaff] px-6 py-5 shadow-2xl sm:px-8"
            >
                <header className="mb-5 flex items-center justify-between border-b border-[#958e98] pb-2">
                    <h2 id="subgroup-modal-title" className="text-xl font-semibold">
                        {editing ? "Editar subgrupo" : "Criar subgrupo"}
                    </h2>
                    <button
                        type="button"
                        aria-label="Fechar"
                        onClick={onClose}
                        className="grid size-8 place-items-center rounded text-[#514c56] hover:bg-[#f1edf3]"
                    >
                        <X size={20} />
                    </button>
                </header>
                <form onSubmit={onSubmit} noValidate className="grid gap-4">
                    {error && (
                        <div
                            role="alert"
                            className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800"
                        >
                            {error}
                        </div>
                    )}
                    {homes.length > 1 ? (
                        <label className="grid gap-1.5 text-xs font-medium">
                            Residência
                            <select
                                aria-label="Residência"
                                value={homeId}
                                onChange={(event) => onHomeChange(event.target.value)}
                                className="h-10 rounded-md border border-[#cfc6d1] bg-white px-3 text-sm font-normal"
                            >
                                {homes.map((home) => (
                                    <option key={home.id} value={home.id}>
                                        {home.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : (
                        <p className="text-sm text-[#625c66]">Residência: {homes[0]?.name}</p>
                    )}
                    <label className="grid gap-1.5 text-xs font-medium">
                        Nome do subgrupo
                        <input
                            autoFocus
                            required
                            maxLength={150}
                            value={name}
                            onChange={(event) => onNameChange(event.target.value)}
                            placeholder="Ex.: Grupo do café"
                            className="h-10 rounded-md border border-[#cfc6d1] bg-white px-3 text-sm font-normal"
                        />
                    </label>
                    <fieldset className="grid gap-2">
                        <legend className="text-xs font-medium">Integrantes do grupo</legend>
                        {loadingMembers ? (
                            <p role="status" className="text-sm text-[#716b74]">
                                Carregando moradores…
                            </p>
                        ) : members.length === 0 ? (
                            <p className="text-sm text-[#716b74]">
                                Nenhum morador ativo disponível.
                            </p>
                        ) : (
                            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[#ddd6df] p-2">
                                {members.map((member) => (
                                    <label
                                        key={member.id}
                                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-[#f5f2f6]"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedMemberIds.includes(member.id)}
                                            onChange={() => onToggleMember(member.id)}
                                        />
                                        {member.name}
                                    </label>
                                ))}
                            </div>
                        )}
                        {selectedMemberIds.length > 0 && (
                            <div
                                className="flex flex-wrap gap-1.5"
                                aria-label="Integrantes selecionados"
                            >
                                {selectedMemberIds.map((memberId) => {
                                    const member = members.find((item) => item.id === memberId);
                                    return member ? (
                                        <span
                                            key={memberId}
                                            className="rounded-full bg-[#edf6e8] px-2.5 py-1 text-[11px] font-medium text-[#43752d]"
                                        >
                                            {member.name}
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </fieldset>
                    <section className="grid gap-3 border-t border-[#e6e0e8] pt-3">
                        <div>
                            <h3 className="text-xs font-semibold">Despesas compartilhadas</h3>
                            <div className="mt-1 overflow-hidden rounded-lg border border-[#ded7e1] text-xs">
                                <div className="grid grid-cols-[1fr_auto] bg-[#faf8fb] px-3 py-2 font-medium text-[#77717c]">
                                    <span>Conta, vencimento e pagamento</span>
                                    <span>Valor</span>
                                </div>
                                {expenses.length ? (
                                    expenses.map((expense) => (
                                        <SharedExpenseRow
                                            key={expense.id}
                                            expense={expense}
                                            canEdit={!!expense.canEdit}
                                            proofUploading={proofUploadingIds.includes(expense.id)}
                                            onEdit={() => onEditExpense(expense)}
                                            onProofUpload={(file) => onProofUpload(expense, file)}
                                        />
                                    ))
                                ) : (
                                    <p className="px-3 py-2 text-[#817b84]">
                                        Nenhuma despesa compartilhada.
                                    </p>
                                )}
                            </div>
                        </div>
                        <section className="grid gap-3 rounded-lg border border-[#ded7e1] bg-white p-3">
                            <div>
                                <h3 className="text-xs font-semibold">
                                    Adicionar despesa ao subgrupo
                                </h3>
                                <p className="mt-1 text-[10px] text-[#817b84]">
                                    Cada conta fica vinculada individualmente ao subgrupo.
                                </p>
                            </div>
                            {newExpenseError && (
                                <p
                                    role="alert"
                                    className="rounded border border-red-200 bg-red-50 p-2 text-[11px] text-red-800"
                                >
                                    {newExpenseError}
                                </p>
                            )}
                            <label className="grid gap-1 text-[11px] font-medium">
                                Descrição da conta
                                <input
                                    value={newExpense.description}
                                    onChange={(event) =>
                                        setNewExpense({
                                            ...newExpense,
                                            description: event.target.value,
                                        })
                                    }
                                    maxLength={255}
                                    placeholder="Ex.: Energia, internet"
                                    className="h-9 rounded-md border border-[#cfc6d1] px-2 text-xs font-normal"
                                />
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <label className="grid gap-1 text-[11px] font-medium">
                                    Valor total
                                    <input
                                        inputMode="decimal"
                                        value={newExpense.amount}
                                        onChange={(event) =>
                                            setNewExpense({
                                                ...newExpense,
                                                amount: event.target.value,
                                            })
                                        }
                                        placeholder="0,00"
                                        className="h-9 rounded-md border border-[#cfc6d1] px-2 text-xs font-normal"
                                    />
                                </label>
                                <label className="grid gap-1 text-[11px] font-medium">
                                    Data de vencimento
                                    <input
                                        type="date"
                                        value={newExpense.date}
                                        onChange={(event) =>
                                            setNewExpense({
                                                ...newExpense,
                                                date: event.target.value,
                                            })
                                        }
                                        className="h-9 rounded-md border border-[#cfc6d1] px-2 text-xs font-normal"
                                    />
                                </label>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <label className="grid gap-1 text-[11px] font-medium">
                                    Status
                                    <select
                                        value={newExpense.paymentStatus}
                                        onChange={(event) =>
                                            setNewExpense({
                                                ...newExpense,
                                                paymentStatus: event.target
                                                    .value as SubgroupExpenseDraft["paymentStatus"],
                                            })
                                        }
                                        className="h-9 rounded-md border border-[#cfc6d1] bg-white px-2 text-xs font-normal"
                                    >
                                        <option value="PENDING">Pendente</option>
                                        <option value="PAID">Pago</option>
                                    </select>
                                </label>
                                {newExpense.paymentStatus === "PAID" && (
                                    <label className="grid gap-1 text-[11px] font-medium">
                                        Data do pagamento
                                        <input
                                            type="date"
                                            value={newExpense.paymentDate ?? ""}
                                            onChange={(event) =>
                                                setNewExpense({
                                                    ...newExpense,
                                                    paymentDate: event.target.value,
                                                })
                                            }
                                            className="h-9 rounded-md border border-[#cfc6d1] px-2 text-xs font-normal"
                                        />
                                    </label>
                                )}
                            </div>
                            <div className="grid gap-2 rounded border border-[#eee9f0] p-2">
                                <label className="flex items-center justify-between gap-2 text-[11px] font-medium">
                                    Rateio desta despesa
                                    <select
                                        aria-label="Tipo de divisão da despesa"
                                        value={newExpense.allocations ? "CUSTOM" : "EQUAL"}
                                        onChange={(event) =>
                                            setNewExpense({
                                                ...newExpense,
                                                allocations:
                                                    event.target.value === "CUSTOM"
                                                        ? equalAllocations(
                                                              newExpense.amount,
                                                              selectedMembers
                                                          )
                                                        : undefined,
                                            })
                                        }
                                        className="h-8 rounded border border-[#cfc6d1] bg-white px-2 text-[10px]"
                                    >
                                        <option value="EQUAL">Igualitário</option>
                                        <option value="CUSTOM">Personalizado</option>
                                    </select>
                                </label>
                                {newExpense.allocations &&
                                    selectedMembers.map((member) => {
                                        const allocation = newExpense.allocations?.find(
                                            (item) => item.participationId === member.id
                                        );
                                        return (
                                            <label
                                                key={member.id}
                                                className="flex items-center justify-between gap-2 text-[10px]"
                                            >
                                                {member.name}
                                                <span className="flex h-7 w-28 items-center rounded border border-[#cfc6d1] px-2">
                                                    R$
                                                    <input
                                                        aria-label={`Valor de ${member.name} nesta despesa`}
                                                        inputMode="decimal"
                                                        value={allocation?.amount ?? "0.00"}
                                                        onChange={(event) =>
                                                            setNewExpense({
                                                                ...newExpense,
                                                                allocations: selectedMembers.map(
                                                                    (item) => ({
                                                                        participationId: item.id,
                                                                        amount:
                                                                            item.id === member.id
                                                                                ? event.target.value
                                                                                : (newExpense.allocations?.find(
                                                                                      (part) =>
                                                                                          part.participationId ===
                                                                                          item.id
                                                                                  )?.amount ??
                                                                                  "0.00"),
                                                                    })
                                                                ),
                                                            })
                                                        }
                                                        className="ml-1 min-w-0 flex-1 border-0 bg-transparent text-right outline-none"
                                                    />
                                                </span>
                                            </label>
                                        );
                                    })}
                                {newExpense.allocations && (
                                    <p
                                        className={`text-right text-[10px] ${draftAllocationTotal === amountToCents(newExpense.amount) ? "text-[#43752d]" : "text-red-700"}`}
                                    >
                                        Divisão: {formatCurrency(draftAllocationTotal / 100)} de{" "}
                                        {formatCurrency(amountToCents(newExpense.amount) / 100)}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={addDraftExpense}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[#4e812f] px-3 text-xs font-medium text-[#3e6b25] hover:bg-[#f0f7ec] disabled:opacity-50"
                            >
                                <Plus size={14} /> Adicionar esta despesa
                            </button>
                            {!!draftExpenses.length && (
                                <div
                                    className="grid gap-1"
                                    aria-label="Despesas aguardando salvamento"
                                >
                                    {draftExpenses.map((expense, index) => (
                                        <div
                                            key={`${expense.description}-${index}`}
                                            className="flex items-center justify-between gap-2 rounded bg-[#f7faf4] px-2 py-1.5 text-[10px]"
                                        >
                                            <span className="min-w-0 truncate">
                                                {expense.description} ·{" "}
                                                {formatCurrency(expense.amount)} ·{" "}
                                                {expense.allocations
                                                    ? "rateio personalizado"
                                                    : "rateio igualitário"}
                                            </span>
                                            <button
                                                type="button"
                                                aria-label={`Remover ${expense.description}`}
                                                onClick={() =>
                                                    onDraftExpensesChange(
                                                        draftExpenses.filter(
                                                            (_, itemIndex) => itemIndex !== index
                                                        )
                                                    )
                                                }
                                                className="rounded p-1 text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                        <div className="grid gap-3 rounded-lg border border-[#ded7e1] p-3 sm:grid-cols-2">
                            <div>
                                <h3 className="mb-2 text-xs font-semibold">
                                    Resumo e divisão financeira
                                </h3>
                                <p className="text-[11px]">
                                    Total de despesas:{" "}
                                    <strong>{formatCurrency(totalCents / 100)}</strong>
                                </p>
                                <p className="mt-1 text-[11px]">
                                    Divisão:{" "}
                                    {expenses.some(
                                        (expense) => expense.allocationStrategy === "PERSONALIZADO"
                                    ) || draftExpenses.some((expense) => expense.allocations)
                                        ? "Personalizada por conta"
                                        : `Igual (${selectedMemberIds.length} ${selectedMemberIds.length === 1 ? "pessoa" : "pessoas"})`}
                                </p>
                                <div className="mt-2 grid gap-1 border-t border-[#eee9f0] pt-2">
                                    {memberTotals.map((member) => (
                                        <p
                                            key={member.id}
                                            className="flex justify-between gap-2 text-[11px]"
                                        >
                                            <span>{member.name}</span>
                                            <strong>{formatCurrency(member.cents / 100)}</strong>
                                        </p>
                                    ))}
                                    {!memberTotals.length && (
                                        <p className="text-[10px] text-[#817b84]">
                                            Selecione participantes para visualizar a divisão.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <fieldset className="min-w-0">
                                <legend className="mb-2 text-xs font-semibold">
                                    Participantes
                                </legend>
                                <div className="max-h-24 space-y-1 overflow-y-auto">
                                    {selectedMemberIds.map((memberId) => {
                                        const member = members.find((item) => item.id === memberId);
                                        return member ? (
                                            <div
                                                key={memberId}
                                                className="flex items-center justify-between rounded border border-[#e6e0e8] px-2 py-1 text-[10px]"
                                            >
                                                <span>{member.name}</span>
                                                <span className="rounded bg-[#fff1c2] px-1.5 py-0.5">
                                                    Pendente
                                                </span>
                                            </div>
                                        ) : null;
                                    })}
                                    {selectedMemberIds.length === 0 && (
                                        <p className="text-[10px] text-[#817b84]">
                                            Selecione participantes para visualizar a divisão.
                                        </p>
                                    )}
                                </div>
                            </fieldset>
                        </div>
                    </section>
                    <footer className="mt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-[#cfc6d1] px-4 py-2 text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || loadingMembers || members.length === 0}
                            className="rounded-lg bg-[#4e812f] px-4 py-2 text-sm font-medium text-white hover:bg-[#3e6b25] disabled:opacity-50"
                        >
                            {saving
                                ? "Salvando…"
                                : editing
                                  ? "Salvar alterações"
                                  : "Criar subgrupo"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
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
                <span className={`grid size-7 place-items-center rounded-lg ${iconClass}`}>
                    {icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                <ChevronRight size={17} className="shrink-0 text-[#55505a]" />
            </div>
            <p className={`text-[21px] font-bold ${valueClass}`}>{value}</p>
            <p className="mt-1 flex items-center gap-2 text-[11px] leading-tight text-[#4a454e]">
                {detailIcon}
                {detail}
            </p>
        </div>
    );
}

function CalendarWidget({ expenses }: { expenses: Expense[] }) {
    const [month, setMonth] = useState(() => new Date());
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const leadingDays = first.getDay();
    const cells = Array.from(
        { length: Math.ceil((leadingDays + daysInMonth) / 7) * 7 },
        (_, index) => {
            const day = index - leadingDays + 1;
            return day > 0 && day <= daysInMonth ? day : null;
        }
    );
    const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
        month
    );

    function changeMonth(offset: number) {
        setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    }

    return (
        <section
            className="min-w-0 overflow-hidden rounded-lg border border-[#d9d0dc] bg-[#fffaff] p-3 sm:p-4"
            aria-label="Calendário de despesas"
        >
            <div className="mb-3 flex items-center justify-between">
                <button
                    type="button"
                    aria-label="Mês anterior"
                    onClick={() => changeMonth(-1)}
                    className="grid size-6 place-items-center rounded-md border border-[#e6e0e8] text-[#52843b]"
                >
                    <ArrowLeft size={13} />
                </button>
                <h2 className="text-xs font-semibold capitalize">{monthName}</h2>
                <button
                    type="button"
                    aria-label="Próximo mês"
                    onClick={() => changeMonth(1)}
                    className="grid size-6 place-items-center rounded-md border border-[#e6e0e8] text-[#52843b]"
                >
                    <ArrowRight size={13} />
                </button>
            </div>
            <div className="grid min-w-0 grid-cols-7 justify-items-center gap-x-0.5 gap-y-1 text-center">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                    <span
                        key={day}
                        className="min-w-0 py-1 text-[8px] text-[#77717c] sm:text-[9px]"
                    >
                        {day}
                    </span>
                ))}
                {cells.map((day, index) => {
                    const dateKey = day
                        ? localIsoDate(new Date(month.getFullYear(), month.getMonth(), day))
                        : "";
                    const dayExpenses = expenses.filter(
                        (expense) => expense.date?.slice(0, 10) === dateKey
                    );
                    const hasPaid = dayExpenses.some((expense) => expense.paymentStatus === "PAID");
                    const hasPending = dayExpenses.some(
                        (expense) => expense.paymentStatus === "PENDING"
                    );
                    const isOverdue = hasPending && dateKey < localIsoDate(new Date());
                    const isToday =
                        day === new Date().getDate() &&
                        month.getMonth() === new Date().getMonth() &&
                        month.getFullYear() === new Date().getFullYear();
                    return (
                        <span
                            key={`${day ?? "empty"}-${index}`}
                            className={`relative grid aspect-square w-full max-w-7 place-items-center rounded-lg text-[9px] ${day ? "text-[#36313a]" : "text-transparent"} ${isToday ? "bg-[#578841] font-semibold text-white" : ""}`}
                        >
                            {day ?? "·"}
                            {!isToday && (hasPaid || hasPending) && (
                                <i
                                    className={`absolute bottom-0.5 size-1 rounded-full ${isOverdue ? "bg-red-500" : hasPending ? "bg-blue-500" : "bg-green-600"}`}
                                />
                            )}
                        </span>
                    );
                })}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[8px] text-[#5e5962]">
                <span className="inline-flex items-center gap-1">
                    <i className="size-1 rounded-full bg-green-600" />
                    Contas pagas
                </span>
                <span className="inline-flex items-center gap-1">
                    <i className="size-1 rounded-full bg-blue-500" />
                    Contas a pagar
                </span>
                <span className="inline-flex items-center gap-1">
                    <i className="size-1 rounded-full bg-red-500" />
                    Atrasadas
                </span>
            </div>
        </section>
    );
}

function ExpenseRow({
    expense,
    onEdit,
    onDelete,
    personalMode,
    paymentUpdating,
    onTogglePaid,
    onReminder,
    proofUploading,
    onProofUpload,
}: {
    expense: Expense;
    onEdit: (expense: Expense) => void;
    onDelete: (expense: Expense) => void;
    personalMode: boolean;
    paymentUpdating: boolean;
    onTogglePaid: () => void;
    onReminder: () => void;
    proofUploading: boolean;
    onProofUpload: (file: File) => void;
}) {
    const proofInput = useRef<HTMLInputElement>(null);
    const paid = expense.paymentStatus === "PAID";
    const overdue =
        expense.paymentStatus === "PENDING" &&
        !!expense.date &&
        expense.date < localIsoDate(new Date());
    const group = expense.sourceLabel ?? expense.subgroup?.nome ?? expense.homeName ?? "Casa";
    return (
        <tr className="text-[#333039] hover:bg-[#fcf9fd]">
            <td className="px-3 py-3">
                {personalMode ? (
                    <input
                        type="checkbox"
                        aria-label={`Marcar ${expense.description} como paga`}
                        checked={paid}
                        disabled={paymentUpdating}
                        onChange={onTogglePaid}
                    />
                ) : (
                    <span
                        className="block size-3 rounded-sm border border-[#cfc8d1]"
                        aria-hidden="true"
                    />
                )}
            </td>
            <th scope="row" className="max-w-[180px] px-3 py-3 text-xs font-semibold">
                <span className="block truncate">{expense.description}</span>
                <span className="mt-0.5 block text-[10px] font-normal text-[#8b8490]">
                    {expense.scope === "PERSONAL"
                        ? "Despesa pessoal"
                        : personalMode
                          ? "Sua parte da despesa"
                          : paid
                            ? "Despesa paga"
                            : "Despesa da casa"}
                </span>
            </th>
            <td className="px-3 py-3">
                <span className="inline-flex items-center gap-1.5 text-[#4f7ba2]">
                    <span className="grid size-6 place-items-center rounded-full bg-[#e9f1fb]">
                        <House size={13} />
                    </span>
                    {group}
                </span>
            </td>
            <td className="px-3 py-3">
                {paid && expense.paidBy ? (
                    <span className="inline-flex items-center gap-1.5 text-[#79737c]">
                        <span className="grid size-6 place-items-center rounded-full bg-[#4f90cb] text-[10px] text-white">
                            {expense.paidBy.slice(0, 1).toUpperCase()}
                        </span>
                        {expense.paidBy}
                    </span>
                ) : (
                    <span className="text-[#aaa4ad]">—</span>
                )}
            </td>
            <td className="whitespace-nowrap px-3 py-3">{formatDate(expense.date)}</td>
            <td className="whitespace-nowrap px-3 py-3 font-medium">
                {formatCurrency(expense.amount)}
            </td>
            <td className="whitespace-nowrap px-3 py-3">
                <span className={overdue ? "font-semibold text-red-600" : "font-medium"}>
                    {formatDate(expense.date)}
                </span>
                {overdue && <span className="mt-0.5 block text-[10px] text-red-600">Atrasada</span>}
            </td>
            <td className="px-3 py-3">
                <span
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-medium ${paid ? "bg-[#e8f3e8] text-[#4a8b45]" : "bg-[#fff2cb] text-[#bd7a00]"}`}
                >
                    {paid ? "Pago" : "Pendente"}
                </span>
            </td>
            <td className="px-3 py-3 text-center text-[#a19aa5]">
                <div className="flex items-center justify-center gap-1">
                    <input
                        ref={proofInput}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                        className="sr-only"
                        aria-label={`Selecionar comprovante para ${expense.description}`}
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) onProofUpload(file);
                            event.target.value = "";
                        }}
                    />
                    <button
                        type="button"
                        aria-label={`Anexar comprovante para ${expense.description}`}
                        disabled={proofUploading}
                        onClick={() => proofInput.current?.click()}
                        className="grid size-7 place-items-center rounded text-[#817b84] hover:bg-[#f1edf3] disabled:opacity-50"
                    >
                        <Paperclip size={15} />
                    </button>
                    {!!expense.proofs?.length && (
                        <div className="flex items-center gap-1">
                            {expense.proofs.map((proof, index) => (
                                <a
                                    key={proof.id}
                                    href={proof.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Visualizar comprovante ${index + 1} de ${expense.description}`}
                                    className="rounded bg-[#edf6e8] px-1.5 py-1 text-[9px] font-medium text-[#43752d]"
                                >
                                    {proof.type}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-3 py-3 text-center text-[#a19aa5]">
                <button
                    type="button"
                    aria-label={
                        expense.reminder
                            ? `Visualizar lembrete de ${expense.description}`
                            : `Adicionar lembrete para ${expense.description}`
                    }
                    onClick={onReminder}
                    className={`mx-auto grid size-7 place-items-center rounded-full ${expense.reminder ? "text-[#4e812f] hover:bg-[#edf6e8]" : "text-[#a19aa5] hover:bg-[#f1edf3]"}`}
                >
                    <Bell size={15} />
                </button>
            </td>
            <td className="px-3 py-3">
                {(!personalMode || expense.canEdit) && (
                    <div className="flex justify-center gap-1.5">
                        <button
                            type="button"
                            aria-label={`Editar ${expense.description}`}
                            onClick={() => onEdit(expense)}
                            className="grid size-7 place-items-center rounded border border-[#bdb6c1] text-[#615b65] hover:bg-[#f0edf2]"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            type="button"
                            aria-label={`Excluir ${expense.description}`}
                            onClick={() => onDelete(expense)}
                            className="grid size-7 place-items-center rounded border border-red-300 text-red-600 hover:bg-red-50"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}

function ExpenseModal({
    mode,
    expense,
    form,
    scope,
    homes,
    subgroups,
    saving,
    error,
    proofUploading,
    onProofUpload,
    onChange,
    onClose,
    onDelete,
    onSubmit,
}: {
    mode: "create" | "edit";
    expense: Expense | null;
    form: FormState;
    scope: ExpenseScope;
    homes: ExpenseHome[];
    subgroups: ExpenseSubgroup[];
    saving: boolean;
    error: string;
    proofUploading: boolean;
    onProofUpload: (file: File) => void;
    onChange: (form: FormState) => void;
    onClose: () => void;
    onDelete?: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const proofInput = useRef<HTMLInputElement>(null);
    const subgroup = subgroups.find((item) => item.id === form.subgroupId);
    const subgroupMembers = subgroup?.memberDetails ?? [];
    const allocationTotal = (form.allocations ?? []).reduce(
        (sum, allocation) => sum + amountToCents(allocation.amount),
        0
    );
    const allocationDifference = amountToCents(form.amount) - allocationTotal;
    const editing = mode === "edit";
    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#17131a]/55 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="expense-modal-title"
                className="my-auto w-full max-w-[590px] rounded-2xl bg-[#fffaff] px-6 py-5 shadow-2xl sm:px-8"
            >
                <header className="mb-5 flex items-center justify-between border-b border-[#958e98] pb-2">
                    <h2 id="expense-modal-title" className="text-xl font-semibold">
                        {editing ? expense?.description : "Nova despesa"}
                    </h2>
                    <div className="flex items-center gap-2">
                        {editing && (
                            <button
                                type="button"
                                aria-label="Excluir despesa"
                                onClick={onDelete}
                                className="grid size-8 place-items-center rounded text-red-600 hover:bg-red-50"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                        <button
                            type="button"
                            aria-label="Fechar"
                            onClick={onClose}
                            className="grid size-8 place-items-center rounded text-[#514c56] hover:bg-[#f1edf3]"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <form onSubmit={onSubmit} noValidate className="grid gap-4">
                    {error && (
                        <div
                            role="alert"
                            className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800"
                        >
                            {error}
                        </div>
                    )}
                    {scope === "HOME" && homes.length > 1 && (
                        <label className="grid max-w-[360px] gap-1.5 text-xs font-medium">
                            Casa
                            <select
                                required
                                value={form.homeId ?? ""}
                                onChange={(event) => {
                                    const homeId = event.target.value;
                                    const selectedSubgroup = subgroups.find(
                                        (item) => item.id === form.subgroupId
                                    );
                                    onChange({
                                        ...form,
                                        homeId,
                                        ...(selectedSubgroup?.homeId !== homeId
                                            ? { subgroupId: "" }
                                            : {}),
                                    });
                                }}
                                className="h-10 rounded-md border border-[#cfc6d1] bg-white px-3 text-sm font-normal outline-none focus:border-[#65a34b] focus:ring-2 focus:ring-[#65a34b]/20"
                            >
                                {homes.map((home) => (
                                    <option key={home.id} value={home.id}>
                                        {home.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <label className="grid gap-1.5 text-xs font-medium">
                        Descrição
                        <input
                            autoFocus
                            required
                            maxLength={255}
                            value={form.description}
                            onChange={(event) =>
                                onChange({ ...form, description: event.target.value })
                            }
                            placeholder="Digite o nome da despesa"
                            className="h-10 rounded-md border border-[#cfc6d1] bg-white px-3 text-sm font-normal outline-none focus:border-[#65a34b] focus:ring-2 focus:ring-[#65a34b]/20"
                        />
                    </label>

                    <label className="grid max-w-[250px] gap-1.5 text-xs font-medium">
                        Valor total da despesa
                        <span className="flex h-10 items-center rounded-md border border-[#cfc6d1] bg-white px-3 text-sm font-normal text-[#605a64]">
                            R$
                            <input
                                required
                                inputMode="decimal"
                                value={form.amount}
                                onChange={(event) =>
                                    onChange({ ...form, amount: event.target.value })
                                }
                                placeholder="0,00"
                                className="ml-2 min-w-0 flex-1 border-0 bg-transparent outline-none"
                            />
                        </span>
                    </label>

                    {scope === "HOME" && (
                        <label className="grid max-w-[360px] gap-1.5 text-xs font-medium">
                            Subgrupo / Categoria (opcional)
                            <select
                                value={form.subgroupId ?? ""}
                                onChange={(event) => {
                                    const subgroupId = event.target.value;
                                    const selectedSubgroup = subgroups.find(
                                        (item) => item.id === subgroupId
                                    );
                                    onChange({
                                        ...form,
                                        subgroupId: subgroupId || null,
                                        allocations: undefined,
                                        ...(selectedSubgroup
                                            ? { homeId: selectedSubgroup.homeId }
                                            : {}),
                                    });
                                }}
                                className="h-9 rounded-full border border-[#cfc6d1] bg-white px-3 text-xs font-normal outline-none focus:border-[#65a34b]"
                            >
                                <option value="">Sem subgrupo</option>
                                {subgroups.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} · {item.homeName}
                                    </option>
                                ))}
                            </select>
                            {subgroup && (
                                <span className="font-normal text-[#716b74]">
                                    Participantes: {subgroup.members.join(", ")}
                                </span>
                            )}
                        </label>
                    )}

                    {scope === "HOME" && subgroup && subgroupMembers.length > 0 && (
                        <section className="grid gap-3 rounded-xl border border-[#ded7e1] bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-xs font-semibold">Divisão da despesa</h3>
                                    <p className="mt-0.5 text-[10px] text-[#817b84]">
                                        Ajuste quanto cada integrante deve pagar.
                                    </p>
                                </div>
                                <select
                                    aria-label="Tipo de divisão"
                                    value={form.allocations ? "CUSTOM" : "EQUAL"}
                                    onChange={(event) =>
                                        onChange({
                                            ...form,
                                            allocations:
                                                event.target.value === "CUSTOM"
                                                    ? equalAllocations(form.amount, subgroupMembers)
                                                    : undefined,
                                        })
                                    }
                                    className="h-9 rounded-md border border-[#cfc6d1] bg-white px-2 text-xs"
                                >
                                    <option value="EQUAL">Divisão igualitária</option>
                                    <option value="CUSTOM">Personalizar valores</option>
                                </select>
                            </div>
                            {form.allocations && (
                                <div className="grid gap-2">
                                    {subgroupMembers.map((member) => {
                                        const allocation = form.allocations?.find(
                                            (item) => item.participationId === member.id
                                        );
                                        return (
                                            <label
                                                key={member.id}
                                                className="flex items-center justify-between gap-3 rounded-lg border border-[#eee9f0] px-3 py-2 text-xs"
                                            >
                                                <span>{member.name}</span>
                                                <span className="flex h-8 w-32 items-center rounded border border-[#cfc6d1] px-2 text-[#716b74]">
                                                    R$
                                                    <input
                                                        aria-label={`Valor de ${member.name}`}
                                                        inputMode="decimal"
                                                        value={allocation?.amount ?? "0.00"}
                                                        onChange={(event) =>
                                                            onChange({
                                                                ...form,
                                                                allocations: subgroupMembers.map(
                                                                    (item) => {
                                                                        const current =
                                                                            form.allocations?.find(
                                                                                (value) =>
                                                                                    value.participationId ===
                                                                                    item.id
                                                                            );
                                                                        return {
                                                                            participationId:
                                                                                item.id,
                                                                            amount:
                                                                                item.id ===
                                                                                member.id
                                                                                    ? event.target
                                                                                          .value
                                                                                    : (current?.amount ??
                                                                                      "0.00"),
                                                                        };
                                                                    }
                                                                ),
                                                            })
                                                        }
                                                        className="ml-1 min-w-0 flex-1 border-0 bg-transparent text-right outline-none"
                                                    />
                                                </span>
                                            </label>
                                        );
                                    })}
                                    <p
                                        className={`text-right text-[11px] ${allocationDifference === 0 ? "text-[#43752d]" : "text-red-700"}`}
                                    >
                                        {allocationDifference === 0
                                            ? "Divisão totalizada"
                                            : `${allocationDifference > 0 ? "Falta dividir " : "Valor excedente "}${formatCurrency(Math.abs(allocationDifference) / 100)}`}
                                    </p>
                                </div>
                            )}
                        </section>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-xs font-medium">
                            Data de vencimento
                            <span className="flex h-10 items-center gap-2 rounded-md border border-[#cfc6d1] bg-white px-2.5">
                                <CalendarDays size={15} className="text-[#8d8690]" />
                                <input
                                    required
                                    type="date"
                                    value={form.date}
                                    onChange={(event) =>
                                        onChange({ ...form, date: event.target.value })
                                    }
                                    className="min-w-0 flex-1 bg-transparent text-xs font-normal outline-none"
                                />
                            </span>
                        </label>
                        <label className="grid gap-1.5 text-xs font-medium">
                            Status do pagamento
                            <select
                                required
                                value={form.paymentStatus}
                                onChange={(event) =>
                                    onChange({
                                        ...form,
                                        paymentStatus: event.target
                                            .value as FormState["paymentStatus"],
                                    })
                                }
                                className="h-10 rounded-md border border-[#cfc6d1] bg-white px-3 text-xs font-normal outline-none focus:border-[#65a34b]"
                            >
                                <option value="PENDING">Pendente</option>
                                <option value="PAID">Pago</option>
                            </select>
                        </label>
                    </div>
                    {form.paymentStatus === "PAID" && (
                        <label className="grid max-w-[260px] gap-1.5 text-xs font-medium">
                            Data do pagamento
                            <span className="flex h-10 items-center gap-2 rounded-md border border-[#cfc6d1] bg-white px-2.5">
                                <CalendarDays size={15} className="text-[#8d8690]" />
                                <input
                                    required
                                    type="date"
                                    value={form.paymentDate ?? ""}
                                    onChange={(event) =>
                                        onChange({ ...form, paymentDate: event.target.value })
                                    }
                                    className="min-w-0 flex-1 bg-transparent text-xs font-normal outline-none"
                                />
                            </span>
                        </label>
                    )}
                    <section className="grid gap-1.5 text-xs font-medium">
                        <span>Comprovante</span>
                        <input
                            ref={proofInput}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                            className="sr-only"
                            aria-label={`Selecionar comprovante para ${expense?.description ?? form.description}`}
                            disabled={!editing || proofUploading}
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) onProofUpload(file);
                                event.target.value = "";
                            }}
                        />
                        <div className="flex min-h-[58px] items-center gap-3 rounded-md border border-[#cfc6d1] bg-white px-3 py-2">
                            <button
                                type="button"
                                aria-label="Anexar comprovante à despesa"
                                disabled={!editing || proofUploading}
                                onClick={() => proofInput.current?.click()}
                                className="grid size-8 shrink-0 place-items-center rounded text-[#aaa4ad] hover:bg-[#f3eff5] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Paperclip size={22} />
                            </button>
                            <div className="min-w-0 flex-1">
                                {!expense?.proofs?.length ? (
                                    <p className="text-center text-[11px] text-[#625c66]">
                                        {proofUploading
                                            ? "Enviando comprovante…"
                                            : editing
                                              ? "Sem documento anexado · clique no clipe para anexar"
                                              : "Salve a despesa para anexar um comprovante"}
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {expense.proofs.map((proof, index) => (
                                            <a
                                                key={proof.id}
                                                href={proof.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="max-w-full truncate rounded bg-[#edf6e8] px-2 py-1 text-[10px] font-medium text-[#43752d]"
                                            >
                                                Comprovante {index + 1} · {proof.type}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] font-normal text-[#817b84]">
                            PDF, JPG, PNG ou WEBP · máximo 10 MB
                        </p>
                    </section>
                    <footer className="mt-1 flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-9 rounded-md border border-[#cfc6d1] px-4 text-xs font-medium hover:bg-[#f3eff5]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#70c34c] px-5 text-xs font-semibold text-white hover:bg-[#5eac3c] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Check size={14} />{" "}
                            {saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar despesa"}
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
        <div
            className="fixed inset-0 z-[60] grid place-items-center bg-[#17131a]/55 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-expense-title"
                className="w-full max-w-[410px] rounded-2xl bg-[#fffaff] p-6 shadow-2xl"
            >
                <div className="mb-4 flex items-start justify-between">
                    <div className="grid size-10 place-items-center rounded-full bg-red-100 text-red-700">
                        <Trash2 size={19} />
                    </div>
                    <button
                        type="button"
                        aria-label="Fechar"
                        onClick={onCancel}
                        className="grid size-8 place-items-center rounded text-[#514c56] hover:bg-[#f1edf3]"
                    >
                        <X size={18} />
                    </button>
                </div>
                <h2 id="delete-expense-title" className="text-lg font-semibold">
                    Excluir despesa?
                </h2>
                <p className="mt-2 text-sm text-[#716b74]">
                    “{expense.description}” deixará de aparecer na lista financeira. O registro será
                    mantido como cancelado para preservar o histórico.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={deleting}
                        className="h-9 rounded-md border border-[#cfc6d1] px-4 text-xs font-medium hover:bg-[#f3eff5]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={deleting}
                        className="h-9 rounded-md bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                        {deleting ? "Excluindo…" : "Excluir despesa"}
                    </button>
                </div>
            </section>
        </div>
    );
}
