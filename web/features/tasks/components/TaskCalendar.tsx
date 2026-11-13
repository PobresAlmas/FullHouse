import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "../api/tasks.api";
import { localDateKey, taskDateKey } from "../lib/tasks.utils";
export function CalendarWidget({
    month,
    tasks,
    selectedDate,
    onMonthChange,
    onDateChange,
    myMemberId,
}: {
    month: Date;
    tasks: Task[];
    selectedDate: string;
    onMonthChange: (month: Date) => void;
    onDateChange: (date: string) => void;
    myMemberId: string;
}) {
    const [view, setView] = useState<"day" | "week" | "month">("month");
    const anchor = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date(month);
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay.getDay());
    const monthDays = Array.from({ length: 42 }, (_, index) => {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + index);
        return day;
    });
    const weekStart = new Date(anchor);
    weekStart.setDate(anchor.getDate() - anchor.getDay());
    const weekDays = Array.from({ length: 7 }, (_, index) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + index);
        return day;
    });
    const days = view === "month" ? monthDays : view === "week" ? weekDays : [anchor];
    const taskMap = new Map<string, Task[]>();
    tasks.forEach((task) => {
        const key = taskDateKey(task);
        taskMap.set(key, [...(taskMap.get(key) ?? []), task]);
    });
    const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
        month
    );
    const detailKey = selectedDate || localDateKey(anchor);
    const dayTasks = taskMap.get(detailKey) ?? [];
    const move = (direction: number) => {
        if (view === "month") {
            onMonthChange(new Date(month.getFullYear(), month.getMonth() + direction, 1));
            return;
        }
        const date = new Date(anchor);
        date.setDate(date.getDate() + direction * (view === "week" ? 7 : 1));
        const key = localDateKey(date);
        onDateChange(key);
        onMonthChange(new Date(date.getFullYear(), date.getMonth(), 1));
    };
    return (
        <section className="rounded-xl border border-[#d6cdd9] bg-[#fffaff] p-4">
            <div className="mb-3 flex items-center justify-between">
                <button
                    type="button"
                    aria-label="Período anterior"
                    onClick={() => move(-1)}
                    className="grid size-7 place-items-center rounded-lg border border-[#e1dbe4] text-[#4e812f]"
                >
                    <ChevronLeft size={16} />
                </button>
                <h2 className="text-xs font-semibold capitalize">
                    {view === "month"
                        ? monthLabel
                        : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(anchor)}
                </h2>
                <button
                    type="button"
                    aria-label="Próximo período"
                    onClick={() => move(1)}
                    className="grid size-7 place-items-center rounded-lg border border-[#e1dbe4] text-[#4e812f]"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
            <div className="mb-3 flex justify-center gap-1" aria-label="Visualização do calendário">
                {(
                    [
                        ["day", "Dia"],
                        ["week", "Semana"],
                        ["month", "Mês"],
                    ] as const
                ).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setView(key)}
                        aria-pressed={view === key}
                        className={`rounded px-2.5 py-1 text-[10px] ${view === key ? "bg-[#4e812f] text-white" : "border border-[#e1dbe4]"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {view !== "day" && (
                <div className="grid grid-cols-7 text-center text-[9px] text-[#77717c]">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                        <span key={day} className="py-1">
                            {day}
                        </span>
                    ))}
                </div>
            )}
            <div className={`grid ${view === "day" ? "grid-cols-1" : "grid-cols-7"} gap-1`}>
                {days.map((day) => {
                    const key = localDateKey(day);
                    const dayTaskList = taskMap.get(key) ?? [];
                    const isCurrentMonth = day.getMonth() === month.getMonth();
                    const overdue = dayTaskList.some(
                        (task) =>
                            task.status === "ATRASADA" ||
                            (taskDateKey(task) < localDateKey(new Date()) &&
                                task.status !== "CONCLUIDA")
                    );
                    const mine = dayTaskList.some((task) => task.assignee?.id === myMemberId);
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onDateChange(key)}
                            aria-label={`${new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(day)}; ${dayTaskList.length} tarefas`}
                            className={`relative ${view === "month" ? "mx-auto grid size-8 place-items-center" : "min-h-12 p-1"} rounded-lg text-[10px] ${!isCurrentMonth && view === "month" ? "text-[#b8b2bc]" : "text-[#302a32]"} ${selectedDate === key ? "bg-[#4e812f] font-bold text-white" : key === localDateKey(new Date()) ? "border border-[#4e812f]" : "hover:bg-[#f0ebf2]"}`}
                        >
                            {view === "month" ? (
                                day.getDate()
                            ) : (
                                <span className="block">
                                    {new Intl.DateTimeFormat("pt-BR", {
                                        weekday: "short",
                                        day: "numeric",
                                    }).format(day)}
                                    <small className="block">{dayTaskList.length} tarefas</small>
                                </span>
                            )}
                            {view === "month" && dayTaskList.length > 0 && (
                                <span className="absolute bottom-1 flex gap-0.5">
                                    <i
                                        className={`size-1 rounded-full ${overdue ? "bg-red-500" : mine ? "bg-[#4e812f]" : "bg-blue-500"}`}
                                    />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            <div className="mt-3 border-t border-[#e9e2eb] pt-3">
                <h3 className="mb-2 text-[10px] font-semibold">
                    Tarefas ·{" "}
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
                        new Date(`${detailKey}T12:00:00`)
                    )}
                </h3>
                {dayTasks.length === 0 ? (
                    <p className="text-[10px] text-[#77717c]">Nenhuma tarefa para este dia.</p>
                ) : (
                    <ul className="grid gap-1.5 text-[10px]">
                        {dayTasks.map((task) => (
                            <li key={task.id} className="flex items-center gap-2">
                                <i
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: task.color ?? "#4e812f" }}
                                />
                                Tarefa: {task.title}
                                {task.assignee ? ` · ${task.assignee.name}` : ""}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-3 text-[9px] text-[#625c66]">
                <span className="inline-flex items-center gap-1">
                    <i className="size-1.5 rounded-full bg-[#4e812f]" />
                    Tarefas
                </span>
                <span className="inline-flex items-center gap-1">
                    <i className="size-1.5 rounded-full bg-red-500" />
                    Atrasadas
                </span>
            </div>
        </section>
    );
}
