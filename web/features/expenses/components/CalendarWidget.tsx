import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Expense } from "../api/expenses.api";
import { localIsoDate } from "../lib/finance-format";

export default function CalendarWidget({ expenses }: { expenses: Expense[] }) {
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
