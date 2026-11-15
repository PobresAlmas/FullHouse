import { Bell, House, Paperclip, Pencil, Trash2 } from "lucide-react";
import type { Expense } from "../api/expenses.api";
import { formatCurrency, formatDate, localIsoDate } from "../lib/finance-format";

export default function ExpenseRow({
    expense,
    onEdit,
    onDelete,
}: {
    expense: Expense;
    onEdit: (expense: Expense) => void;
    onDelete: (expense: Expense) => void;
}) {
    const paid = expense.paymentStatus === "PAID";
    const overdue =
        expense.paymentStatus === "PENDING" &&
        !!expense.date &&
        expense.date < localIsoDate(new Date());
    const group = expense.subgroup?.nome ?? expense.homeName ?? "Casa";
    return (
        <tr className="text-[#333039] hover:bg-[#fcf9fd]">
            <td className="px-3 py-3">
                <span
                    className="block size-3 rounded-sm border border-[#cfc8d1]"
                    aria-hidden="true"
                />
            </td>
            <th scope="row" className="max-w-[180px] px-3 py-3 text-xs font-semibold">
                <span className="block truncate">{expense.description}</span>
                <span className="mt-0.5 block text-[10px] font-normal text-[#8b8490]">
                    {paid ? "Despesa paga" : "Despesa da casa"}
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
                <Paperclip size={15} className="mx-auto" aria-label="Sem comprovante" />
            </td>
            <td className="px-3 py-3 text-center text-[#a19aa5]">
                <Bell size={15} className="mx-auto" aria-label="Sem lembrete" />
            </td>
            <td className="px-3 py-3">
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
            </td>
        </tr>
    );
}
