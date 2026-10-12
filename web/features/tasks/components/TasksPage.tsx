"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
    completeTask,
    createTask,
    deleteTask,
    getTaskMembers,
    getTaskResidences,
    getTasks,
    updateTask,
} from "@/features/tasks/api/tasks.api";
import type {
    Task,
    TaskFilters,
    TaskInput,
    TaskMember,
    TaskPeriodicity,
    TaskResidence,
    TaskStatus,
} from "@/features/tasks/api/tasks.api";

type TaskFormState = {
    title: string;
    description: string;
    tags: string;
    assigneeId: string;
    dueAt: string;
    repeats: boolean;
    periodicity: TaskPeriodicity;
    hasReminder: boolean;
    reminderMinutesBefore: string;
};

const initialForm: TaskFormState = {
    title: "",
    description: "",
    tags: "",
    assigneeId: "",
    dueAt: "",
    repeats: false,
    periodicity: "SEMANAL",
    hasReminder: false,
    reminderMinutesBefore: "30",
};

const statusLabels: Record<TaskStatus, string> = {
    PENDENTE: "Pendente",
    EM_ANDAMENTO: "Em andamento",
    CONCLUIDA: "ConcluÃ­da",
    ATRASADA: "Atrasada",
    CANCELADA: "Cancelada",
};

const periodicityLabels: Record<TaskPeriodicity, string> = {
    DIARIA: "DiÃ¡ria",
    SEMANAL: "Semanal",
    QUINZENAL: "A cada duas semanas",
    MENSAL: "Mensal",
    PERSONALIZADA: "Personalizada",
};

function getErrorMessage(error: unknown) {
    if (typeof error === "object" && error !== null && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string") return message;
        if (Array.isArray(message)) return message.join(" ");
    }
    return "NÃ£o foi possÃ­vel concluir a operaÃ§Ã£o. Tente novamente.";
}

function toDateTimeLocal(value: string) {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function taskToForm(task: Task): TaskFormState {
    return {
        title: task.title,
        description: task.description ?? "",
        tags: task.tags.join(", "),
        assigneeId: task.assignee?.id ?? "",
        dueAt: toDateTimeLocal(task.dueAt),
        repeats: task.repeats,
        periodicity: task.periodicity,
        hasReminder: task.reminderAt !== null,
        reminderMinutesBefore: task.reminderAt
            ? Math.max(
                  0,
                  Math.round(
                      (new Date(task.dueAt).getTime() - new Date(task.reminderAt).getTime()) /
                          60_000
                  )
              ).toString()
            : "30",
    };
}

function toTaskInput(form: TaskFormState): TaskInput {
    return {
        title: form.title.trim(),
        description: form.description.trim() || null,
        tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        assigneeId: form.assigneeId || null,
        dueAt: new Date(form.dueAt).toISOString(),
        repeats: form.repeats,
        ...(form.repeats
            ? {
                  periodicity: form.periodicity,
              }
            : {}),
        reminderMinutesBefore: form.hasReminder ? Number(form.reminderMinutesBefore || 0) : null,
    };
}

export default function TasksPage() {
    const [residences, setResidences] = useState<TaskResidence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [members, setMembers] = useState<TaskMember[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [assigneeId, setAssigneeId] = useState("");
    const [form, setForm] = useState<TaskFormState>(initialForm);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadTasks = useCallback(async (id: string, filters: TaskFilters = {}) => {
        const result = await getTasks(id, filters);
        setTasks(result);
    }, []);

    useEffect(() => {
        let active = true;
        getTaskResidences()
            .then(async (available) => {
                if (!active) return;
                setResidences(available);
                const firstResidenceId = available[0]?.id ?? "";
                setResidenceId(firstResidenceId);
                if (firstResidenceId) {
                    const [nextMembers, nextTasks] = await Promise.all([
                        getTaskMembers(firstResidenceId),
                        getTasks(firstResidenceId),
                    ]);
                    if (!active) return;
                    setMembers(nextMembers);
                    setTasks(nextTasks);
                }
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
        if (!residenceId) return;
        const filters: TaskFilters = {
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(status ? { status: status as TaskStatus } : {}),
            ...(assigneeId ? { assigneeId } : {}),
        };
        loadTasks(residenceId, filters).catch((loadError: unknown) =>
            setError(getErrorMessage(loadError))
        );
    }, [assigneeId, loadTasks, residenceId, search, status]);

    async function selectResidence(nextResidenceId: string) {
        setResidenceId(nextResidenceId);
        setError("");
        setLoading(true);
        try {
            const [nextMembers, nextTasks] = await Promise.all([
                getTaskMembers(nextResidenceId),
                getTasks(nextResidenceId),
            ]);
            setMembers(nextMembers);
            setTasks(nextTasks);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    }

    function openCreateForm() {
        setEditingTask(null);
        setForm(initialForm);
        setError("");
        setShowForm(true);
    }

    function openEditForm(task: Task) {
        setEditingTask(task);
        setForm(taskToForm(task));
        setError("");
        setShowForm(true);
    }

    async function submitTask(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!residenceId) return;
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const data = toTaskInput(form);
            if (editingTask) {
                await updateTask(residenceId, editingTask.id, data);
                setNotice("Tarefa atualizada.");
            } else {
                await createTask(residenceId, data);
                setNotice("Tarefa criada.");
            }
            setShowForm(false);
            setEditingTask(null);
            setForm(initialForm);
            await loadTasks(residenceId, {
                ...(search.trim() ? { search: search.trim() } : {}),
                ...(status ? { status: status as TaskStatus } : {}),
                ...(assigneeId ? { assigneeId } : {}),
            });
        } catch (saveError) {
            setError(getErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    }

    async function markComplete(task: Task) {
        if (!residenceId) return;
        setError("");
        try {
            await completeTask(residenceId, task.id);
            await loadTasks(residenceId);
            setNotice("Tarefa concluÃ­da.");
        } catch (completeError) {
            setError(getErrorMessage(completeError));
        }
    }

    async function removeTask(taskId: string) {
        if (!residenceId) return;
        setError("");
        try {
            await deleteTask(residenceId, taskId);
            await loadTasks(residenceId);
            setConfirmDeleteId("");
            setNotice("Tarefa removida.");
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        }
    }

    function updateForm<K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    return (
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">Rotina da casa</p>
                    <h1 className="mt-1 text-3xl font-bold">Tarefas</h1>
                    <p className="mt-2 text-muted-foreground">Organize e acompanhe as tarefas da residÃªncia.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="sr-only" htmlFor="task-residence">ResidÃªncia</label>
                    <select
                        id="task-residence"
                        className="rounded-lg border bg-background px-3 py-2"
                        value={residenceId}
                        onChange={(event) => void selectResidence(event.target.value)}
                    >
                        {residences.map((residence) => (
                            <option key={residence.id} value={residence.id}>{residence.name}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
                        onClick={openCreateForm}
                        disabled={!residenceId}
                    >
                        Nova tarefa
                    </button>
                </div>
            </header>

            {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="rounded-lg bg-primary/10 p-3 text-sm">{notice}</p>}

            {showForm && (
                <form onSubmit={submitTask} className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">{editingTask ? "Editar tarefa" : "Nova tarefa"}</h2>
                        <button type="button" className="text-sm text-muted-foreground hover:underline" onClick={() => setShowForm(false)}>
                            Cancelar
                        </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                            TÃ­tulo
                            <input required maxLength={150} value={form.title} onChange={(event) => updateForm("title", event.target.value)} className="rounded-lg border bg-background px-3 py-2" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                            DescriÃ§Ã£o (opcional)
                            <textarea maxLength={2000} rows={2} value={form.description} onChange={(event) => updateForm("description", event.target.value)} className="rounded-lg border bg-background px-3 py-2" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                            Tags (separadas por vÃ­rgula)
                            <input value={form.tags} onChange={(event) => updateForm("tags", event.target.value)} className="rounded-lg border bg-background px-3 py-2" />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                            ResponsÃ¡vel
                            <select value={form.assigneeId} onChange={(event) => updateForm("assigneeId", event.target.value)} className="rounded-lg border bg-background px-3 py-2">
                                <option value="">Sem responsÃ¡vel</option>
                                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                            </select>
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                            Data e horÃ¡rio
                            <input required type="datetime-local" value={form.dueAt} onChange={(event) => updateForm("dueAt", event.target.value)} className="rounded-lg border bg-background px-3 py-2" />
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                            <input type="checkbox" checked={form.repeats} onChange={(event) => updateForm("repeats", event.target.checked)} />
                            Repetir tarefa
                        </label>
                        {form.repeats && (
                            <>
                                <label className="grid gap-1 text-sm font-medium">
                                    FrequÃªncia
                                    <select value={form.periodicity} onChange={(event) => updateForm("periodicity", event.target.value as TaskPeriodicity)} className="rounded-lg border bg-background px-3 py-2">
                                        {(["DIARIA", "SEMANAL", "QUINZENAL", "MENSAL"] as TaskPeriodicity[]).map((periodicity) => <option key={periodicity} value={periodicity}>{periodicityLabels[periodicity]}</option>)}
                                    </select>
                                </label>
                            </>
                        )}
                        <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                            <input type="checkbox" checked={form.hasReminder} onChange={(event) => updateForm("hasReminder", event.target.checked)} />
                            Ativar lembrete
                        </label>
                        {form.hasReminder && (
                            <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                                Avisar com antecedÃªncia (minutos)
                                <input required type="number" min={0} max={43200} value={form.reminderMinutesBefore} onChange={(event) => updateForm("reminderMinutesBefore", event.target.value)} className="rounded-lg border bg-background px-3 py-2" />
                            </label>
                        )}
                    </div>
                    <div>
                        <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">
                            {saving ? "Salvando..." : "Salvar tarefa"}
                        </button>
                    </div>
                </form>
            )}

            <section className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-3">
                <label className="grid gap-1 text-sm font-medium">
                    Buscar
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="TÃ­tulo, descriÃ§Ã£o ou tag" className="rounded-lg border bg-background px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                    Status
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border bg-background px-3 py-2">
                        <option value="">Todas as tarefas ativas</option>
                        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
                <label className="grid gap-1 text-sm font-medium">
                    ResponsÃ¡vel
                    <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="rounded-lg border bg-background px-3 py-2">
                        <option value="">Todos</option>
                        {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                </label>
            </section>

            <section className="grid gap-3" aria-label="Lista de tarefas">
                {loading ? (
                    <p className="py-8 text-center text-muted-foreground">Carregando tarefas...</p>
                ) : tasks.length === 0 ? (
                    <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                        {residences.length === 0 ? "VocÃª ainda nÃ£o participa de uma residÃªncia." : "Nenhuma tarefa encontrada."}
                    </p>
                ) : tasks.map((task) => (
                    <article key={task.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <input
                                aria-label={`Concluir ${task.title}`}
                                type="checkbox"
                                checked={task.status === "CONCLUIDA"}
                                disabled={task.status === "CONCLUIDA" || task.status === "CANCELADA"}
                                onChange={() => void markComplete(task)}
                                className="mt-1 size-4"
                            />
                            <div>
                                <h2 className={`font-semibold ${task.status === "CONCLUIDA" ? "line-through text-muted-foreground" : ""}`}>{task.title}</h2>
                                {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {formatDate(task.dueAt)} Â· {task.assignee?.name ?? "Sem responsÃ¡vel"} Â· {statusLabels[task.status]}
                                    {task.repeats ? ` Â· ${periodicityLabels[task.periodicity]}` : ""}
                                    {task.reminderAt ? " Â· Com lembrete" : ""}
                                </p>
                                {task.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{task.tags.map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-1 text-xs">{tag}</span>)}</div>}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            {confirmDeleteId === task.id ? (
                                <>
                                    <span className="text-sm">Excluir tarefa?</span>
                                    <button type="button" onClick={() => void removeTask(task.id)} className="rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground">Confirmar</button>
                                    <button type="button" onClick={() => setConfirmDeleteId("")} className="rounded-lg border px-3 py-2 text-sm">Cancelar</button>
                                </>
                            ) : (
                                <>
                                    <button type="button" onClick={() => openEditForm(task)} disabled={task.status === "CONCLUIDA" || task.status === "CANCELADA"} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Editar</button>
                                    <button type="button" onClick={() => setConfirmDeleteId(task.id)} className="rounded-lg border px-3 py-2 text-sm">Excluir</button>
                                </>
                            )}
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}
