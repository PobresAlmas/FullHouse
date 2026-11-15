import type { FormEvent } from "react";
import { CalendarDays, Check, Trash2, X } from "lucide-react";
import type {
    CreateExpenseInput,
    Expense,
    ExpenseHome,
    ExpenseSubgroup,
} from "../api/expenses.api";
import { formatDate } from "../lib/finance-format";

export default function ExpenseModal({
    mode,
    expense,
    form,
    homes,
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
    form: CreateExpenseInput;
    homes: ExpenseHome[];
    subgroups: ExpenseSubgroup[];
    saving: boolean;
    error: string;
    onChange: (form: CreateExpenseInput) => void;
    onClose: () => void;
    onDelete?: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const subgroup = subgroups.find((item) => item.id === form.subgroupId);
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
                    {homes.length > 1 && (
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
                                            .value as CreateExpenseInput["paymentStatus"],
                                    })
                                }
                                className="h-10 rounded-md border border-[#cfc6d1] bg-white px-3 text-xs font-normal outline-none focus:border-[#65a34b]"
                            >
                                <option value="PENDING">Pendente</option>
                                <option value="PAID">Pago</option>
                            </select>
                        </label>
                    </div>

                    {editing && expense?.paidAt && (
                        <p className="text-xs text-[#716b74]">
                            Pago em {formatDate(expense.paidAt)}
                        </p>
                    )}
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
