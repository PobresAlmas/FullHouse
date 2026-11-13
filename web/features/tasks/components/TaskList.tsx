import { useMemo } from "react";
import { Bell, CalendarDays, Clock3, Repeat2, Trash2 } from "lucide-react";
import type { Task } from "../api/tasks.api";
import {
    formatDate,
    localDateKey,
    periodicityLabels,
    tagColors,
    taskDateKey,
} from "../lib/tasks.utils";
export function TaskList({
    tasks,
    loading,
    hasResidence,
    selectedDate,
    onSelectDate,
    onComplete,
    onEdit,
    canEdit,
    canDelete,
    confirmDeleteId,
    onConfirmDelete,
    onAskDelete,
}: {
    tasks: Task[];
    loading: boolean;
    hasResidence: boolean;
    selectedDate: string;
    onSelectDate: (date: string) => void;
    onComplete: (task: Task) => void;
    onEdit: (task: Task) => void;
    canEdit: boolean;
    canDelete: boolean;
    confirmDeleteId: string;
    onConfirmDelete: (id: string) => void;
    onAskDelete: (id: string) => void;
}) {
    const groups = useMemo(() => {
        const today = localDateKey(new Date());
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = localDateKey(tomorrowDate);
        const result: { label: string; tasks: Task[]; overdue?: boolean }[] = [];
        const map = new Map<string, Task[]>();
        for (const task of tasks) {
            const key = taskDateKey(task);
            const list = map.get(key) ?? [];
            list.push(task);
            map.set(key, list);
        }
        for (const [key, entries] of map) {
            const isOverdue = key < today || entries.some((task) => task.status === "ATRASADA");
            const label = isOverdue
                ? "Atrasadas"
                : key === today
                  ? "Hoje"
                  : key === tomorrow
                    ? "Amanhã"
                    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(
                          new Date(`${key}T12:00:00`)
                      );
            result.push({ label, tasks: entries, overdue: isOverdue });
        }
        return result.sort((a, b) =>
            (a.tasks[0]?.dueAt ?? "").localeCompare(b.tasks[0]?.dueAt ?? "")
        );
    }, [tasks]);
    if (loading)
        return <p className="py-10 text-center text-sm text-[#77717c]">Carregando tarefas…</p>;
    if (tasks.length === 0)
        return (
            <EmptyTasks
                title={
                    selectedDate
                        ? "Nenhuma tarefa para esta data."
                        : hasResidence
                          ? "Nenhuma tarefa encontrada."
                          : "Nenhuma tarefa pessoal ainda."
                }
                onClear={selectedDate ? () => onSelectDate("") : undefined}
            />
        );
    return (
        <div className="grid gap-3" aria-label="Lista de tarefas">
            {groups.map((group) => (
                <section key={group.label}>
                    <h3
                        className={`mb-2 flex items-center gap-2 text-[11px] font-semibold ${group.overdue ? "text-red-600" : "text-[#49434d]"}`}
                    >
                        {group.label}
                        <span className="rounded-full bg-[#eeebef] px-1.5 text-[10px] text-[#514c56]">
                            {group.tasks.length}
                        </span>
                    </h3>
                    <div className="grid gap-2">
                        {group.tasks.map((task) => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                onComplete={() => onComplete(task)}
                                onEdit={() => onEdit(task)}
                                canEdit={canEdit}
                                canDelete={canDelete}
                                confirming={confirmDeleteId === task.id}
                                onConfirmDelete={() => onConfirmDelete(task.id)}
                                onAskDelete={() => onAskDelete(task.id)}
                                onCancelDelete={() => onAskDelete("")}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
export function EmptyTasks({ title, onClear }: { title: string; onClear?: () => void }) {
    return (
        <div className="rounded-xl border border-dashed border-[#d9d1dc] px-5 py-10 text-center">
            <CalendarDays className="mx-auto mb-2 text-[#8c8490]" size={26} />
            <p className="text-sm text-[#625c66]">{title}</p>
            {onClear && (
                <button
                    type="button"
                    onClick={onClear}
                    className="mt-2 text-xs font-semibold text-[#4e812f] underline"
                >
                    Ver todas as datas
                </button>
            )}
        </div>
    );
}
export function TaskRow({
    task,
    onComplete,
    onEdit,
    canEdit,
    canDelete,
    confirming,
    onConfirmDelete,
    onAskDelete,
    onCancelDelete,
}: {
    task: Task;
    onComplete: () => void;
    onEdit: () => void;
    canEdit: boolean;
    canDelete: boolean;
    confirming: boolean;
    onConfirmDelete: () => void;
    onAskDelete: () => void;
    onCancelDelete: () => void;
}) {
    const completed = task.status === "CONCLUIDA";
    return (
        <article
            style={{ borderLeftColor: task.color ?? undefined }}
            className={`flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-l-4 border-[#d7ceda] px-3 py-2.5 ${completed ? "bg-[#eeebef]" : "bg-white"}`}
        >
            <input
                aria-label={`Concluir ${task.title}`}
                type="checkbox"
                checked={completed}
                disabled={completed || task.status === "CANCELADA"}
                onChange={onComplete}
                className="size-[18px] shrink-0 accent-[#4e812f]"
            />
            <div className="min-w-[140px] flex-1">
                <h4
                    className={`text-xs font-medium ${completed ? "text-[#8a858d] line-through" : task.status === "ATRASADA" ? "text-red-600" : "text-[#302a32]"}`}
                >
                    {task.title}
                </h4>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#77717c]">
                    <span className="inline-flex items-center gap-1">
                        <Clock3 size={11} />
                        {formatDate(task.dueAt, { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    {task.repeats && (
                        <span className="inline-flex items-center gap-1">
                            <Repeat2 size={11} />
                            {periodicityLabels[task.periodicity]}
                        </span>
                    )}
                    {task.reminderAt && (
                        <span className="inline-flex items-center gap-1">
                            <Bell size={10} />
                            Lembrete
                        </span>
                    )}
                </p>
                {task.description && (
                    <p className="mt-1 line-clamp-1 text-[10px] text-[#77717c]">
                        {task.description}
                    </p>
                )}
            </div>
            {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag, index) => (
                        <span
                            key={tag}
                            className={`rounded-full px-2 py-1 text-[9px] ${tagColors[index % tagColors.length]}`}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
            <span
                className="grid size-7 shrink-0 place-items-center rounded-full bg-[#4f7f63] text-[10px] font-semibold text-white"
                title={task.assignee?.name ?? "Sem responsável"}
            >
                {task.assignee?.name?.slice(0, 1).toUpperCase() ?? "–"}
            </span>
            {confirming && canDelete ? (
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onConfirmDelete}
                        className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-semibold text-white"
                    >
                        Excluir
                    </button>
                    <button
                        type="button"
                        onClick={onCancelDelete}
                        className="rounded-md border px-2 py-1 text-[10px]"
                    >
                        Cancelar
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-1">
                    {canEdit && (
                        <button
                            type="button"
                            onClick={onEdit}
                            disabled={completed || task.status === "CANCELADA"}
                            className="rounded-md px-2 py-1 text-[10px] text-[#514c56] hover:bg-[#f3eff4] disabled:opacity-40"
                        >
                            Editar
                        </button>
                    )}
                    {canDelete && (
                        <button
                            type="button"
                            aria-label={`Excluir ${task.title}`}
                            onClick={onAskDelete}
                            className="rounded-md p-1 text-[#77717c] hover:bg-[#f3eff4]"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}
