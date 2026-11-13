import { Trash2, X } from "lucide-react";
import type { Expense } from "../api/expenses.api";

export default function DeleteExpenseDialog({
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
