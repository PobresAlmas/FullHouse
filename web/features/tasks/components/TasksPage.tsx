"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
    Bell,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    House,
    Plus,
    Repeat2,
    Settings,
    Trash2,
    X,
} from "lucide-react";
import {
    completeTask,
    createTask,
    deleteTask,
    getTaskMembers,
    getTaskResidences,
    getTasks,
    updateTask,
} from "@/features/tasks/api/tasks.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import type {
    Task,
    TaskAssignmentType,
    TaskInput,
    TaskMember,
    TaskPeriodicity,
    TaskResidence,
} from "@/features/tasks/api/tasks.api";
import {
    canCreateOrEditResidenceContent,
    isResidenceManager,
} from "@/features/residences/permissions";

type TaskFormState = {
    title: string;
    description: string;
    tags: string;
    assigneeId: string;
    assignmentType: TaskAssignmentType;
    assigneeIds: string[];
    color: string;
    dueAt: string;
    repeats: boolean;
    periodicity: TaskPeriodicity;
    hasReminder: boolean;
    reminderMinutesBefore: string;
};
type TaskTab = "all" | "mine" | "completed";

const initialForm: TaskFormState = {
    title: "",
    description: "",
    tags: "",
    assigneeId: "",
    assignmentType: "FIXA",
    assigneeIds: [],
    color: "#4f7f63",
    dueAt: "",
    repeats: false,
    periodicity: "SEMANAL",
    hasReminder: true,
    reminderMinutesBefore: "30",
};
const periodicityLabels: Record<TaskPeriodicity, string> = {
    DIARIA: "Diariamente",
    SEMANAL: "Semanalmente",
    QUINZENAL: "A cada duas semanas",
    MENSAL: "Mensalmente",
    PERSONALIZADA: "Personalizada",
};
const tagColors = [
    "bg-violet-100 text-violet-700",
    "bg-pink-100 text-pink-700",
    "bg-amber-100 text-amber-800",
    "bg-emerald-100 text-emerald-700",
    "bg-sky-100 text-sky-700",
    "bg-yellow-100 text-yellow-800",
];
const inputClass =
    "w-full rounded-lg border border-[#d3cbd7] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#4f7f63] focus:ring-2 focus:ring-[#4f7f63]/15";

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

function localDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function taskDateKey(task: Task) {
    return localDateKey(new Date(task.dueAt));
}
function formatDate(
    value: string,
    options: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" }
) {
    return new Intl.DateTimeFormat("pt-BR", options).format(new Date(value));
}
function toDateTimeLocal(value: string) {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function taskToForm(task: Task): TaskFormState {
    return {
        title: task.title,
        description: task.description ?? "",
        tags: task.tags.join(", "),
        assigneeId: task.assignee?.id ?? "",
        assignmentType: task.assignmentType ?? "FIXA",
        assigneeIds: task.rotationMemberIds ?? [],
        color: task.color ?? "#4f7f63",
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
        assignmentType: form.assignmentType,
        assigneeIds: form.assignmentType === "RODIZIO" ? form.assigneeIds : [],
        color: form.color,
        dueAt: new Date(form.dueAt).toISOString(),
        repeats: form.repeats,
        ...(form.repeats ? { periodicity: form.periodicity } : {}),
        reminderMinutesBefore: form.hasReminder ? Number(form.reminderMinutesBefore || 0) : null,
    };
}

function readPersonalTasks(userId: string): Task[] {
    try {
        const stored = window.localStorage.getItem(`fullhouse:personal-tasks:${userId}`);
        const parsed: unknown = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? (parsed as Task[]) : [];
    } catch {
        return [];
    }
}

function savePersonalTasks(userId: string, tasks: Task[]) {
    try {
        window.localStorage.setItem(`fullhouse:personal-tasks:${userId}`, JSON.stringify(tasks));
    } catch {
        /* A tarefa continua disponível na tela enquanto esta sessão estiver aberta. */
    }
}

function isPersonalTask(task: Task) {
    return task.id.startsWith("local-");
}

function toPersonalTask(input: TaskInput, existing?: Task): Task {
    const dueDate = new Date(input.dueAt);
    const reminderAt =
        input.reminderMinutesBefore == null
            ? null
            : new Date(dueDate.getTime() - input.reminderMinutesBefore * 60_000).toISOString();
    return {
        id: existing?.id ?? `local-${crypto.randomUUID()}`,
        definitionId: existing?.definitionId ?? `local-${crypto.randomUUID()}`,
        title: input.title,
        description: input.description ?? null,
        tags: input.tags ?? [],
        color: input.color ?? null,
        assignmentType: input.assignmentType ?? "FIXA",
        rotationMemberIds: input.assigneeIds ?? [],
        residenceId: null,
        assignee: null,
        dueAt: input.dueAt,
        periodicity: input.periodicity ?? existing?.periodicity ?? "SEMANAL",
        repeats: input.repeats ?? false,
        reminderAt,
        status: existing?.status ?? "PENDENTE",
        completedAt: existing?.completedAt ?? null,
    };
}

export default function TasksPage() {
    const { user } = useAuth();
    const userId = user?.id ?? "anonymous";
    const [residences, setResidences] = useState<TaskResidence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [members, setMembers] = useState<TaskMember[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<TaskTab>("all");
    const [scope, setScope] = useState<"personal" | "home">("personal");
    const [activeTag, setActiveTag] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [month, setMonth] = useState(
        () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );
    const [form, setForm] = useState<TaskFormState>(initialForm);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const residence = residences.find((item) => item.id === residenceId) ?? null;
    const houseName = residence?.name ?? "Nenhuma casa associada";
    const myMemberId = residence?.membership?.id ?? "";
    const canEditHouseTasks = canCreateOrEditResidenceContent(
        residence?.membership?.role,
        residence?.creationEditPolicy
    );
    const canDeleteHouseTasks = isResidenceManager(residence?.membership?.role);

    const loadResidenceData = useCallback(
        async (id: string) => {
            const [nextMembers, nextTasks] = await Promise.all([getTaskMembers(id), getTasks(id)]);
            const localTasks = readPersonalTasks(userId);
            setMembers(nextMembers);
            setTasks([...nextTasks, ...localTasks]);
        },
        [userId]
    );

    useEffect(() => {
        let active = true;
        const localTasks = readPersonalTasks(userId);
        getTaskResidences()
            .then(async (available) => {
                if (!active) return;
                setResidences(available);
                const id = available[0]?.id ?? "";
                setResidenceId(id);
                setScope(id ? "home" : "personal");
                if (id) {
                    const [nextMembers, nextTasks] = await Promise.all([
                        getTaskMembers(id),
                        getTasks(id),
                    ]);
                    if (active) {
                        setMembers(nextMembers);
                        setTasks([...nextTasks, ...localTasks]);
                        setNotice("");
                    }
                } else {
                    setTasks(localTasks);
                    setNotice(
                        "Modo pessoal ativo. As tarefas criadas sem casa ficam salvas neste navegador."
                    );
                }
            })
            .catch(() => {
                if (active) {
                    setResidences([]);
                    setResidenceId("");
                    setMembers([]);
                    setTasks(localTasks);
                    setError("");
                    setNotice(
                        "Modo pessoal ativo. As tarefas criadas sem casa ficam salvas neste navegador."
                    );
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [userId]);

    useEffect(() => {
        if (!showForm) return;
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setShowForm(false);
        }
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [showForm]);

    const categories = useMemo(
        () =>
            [...new Set(tasks.flatMap((task) => task.tags))].sort((a, b) =>
                a.localeCompare(b, "pt-BR")
            ),
        [tasks]
    );
    const todayKey = localDateKey(new Date());
    const activeTasks = tasks.filter(
        (task) => task.status !== "CONCLUIDA" && task.status !== "CANCELADA"
    );
    const overdueTasks = activeTasks.filter(
        (task) => taskDateKey(task) < todayKey || task.status === "ATRASADA"
    );
    const todayTasks = activeTasks.filter(
        (task) => taskDateKey(task) === todayKey && task.status !== "ATRASADA"
    );
    const todayCompleted = tasks.filter(
        (task) => task.status === "CONCLUIDA" && task.completedAt?.slice(0, 10) === todayKey
    );
    const myPending = activeTasks.filter(
        (task) => isPersonalTask(task) || task.assignee?.id === myMemberId
    );

    const visibleTasks = useMemo(() => {
        const normalized = search.trim().toLocaleLowerCase("pt-BR");
        return tasks
            .filter((task) => {
                if (scope === "personal" && !isPersonalTask(task)) return false;
                if (scope === "home" && isPersonalTask(task)) return false;
                if (
                    activeTab === "mine" &&
                    !isPersonalTask(task) &&
                    task.assignee?.id !== myMemberId
                )
                    return false;
                if (activeTab === "completed" && task.status !== "CONCLUIDA") return false;
                if (
                    activeTab !== "completed" &&
                    (task.status === "CONCLUIDA" || task.status === "CANCELADA")
                )
                    return false;
                if (activeTag && !task.tags.includes(activeTag)) return false;
                if (
                    normalized &&
                    ![task.title, task.description ?? "", ...task.tags]
                        .join(" ")
                        .toLocaleLowerCase("pt-BR")
                        .includes(normalized)
                )
                    return false;
                if (selectedDate && taskDateKey(task) !== selectedDate) return false;
                return true;
            })
            .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    }, [activeTab, activeTag, myMemberId, scope, search, selectedDate, tasks]);

    async function changeResidence(id: string) {
        setResidenceId(id);
        setScope("home");
        setError("");
        setNotice("");
        setLoading(true);
        try {
            await loadResidenceData(id);
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    }
    function openCreateForm() {
        if (scope === "home" && !canEditHouseTasks) return;
        setEditingTask(null);
        setForm({ ...initialForm, dueAt: `${todayKey}T19:00` });
        setError("");
        setShowForm(true);
    }
    function openEditForm(task: Task) {
        if (!isPersonalTask(task) && !canEditHouseTasks) return;
        setEditingTask(task);
        setForm(taskToForm(task));
        setError("");
        setShowForm(true);
    }
    function updateForm<K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    async function submitTask(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const isHomeTask = editingTask
            ? !isPersonalTask(editingTask)
            : Boolean(residenceId && scope === "home");
        if (isHomeTask && !canEditHouseTasks) {
            setError("A configuração desta residência não permite criar ou editar tarefas.");
            return;
        }
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const data = toTaskInput(form);
            if (!isHomeTask) {
                const savedTask = toPersonalTask(data, editingTask ?? undefined);
                const localTasks = readPersonalTasks(userId);
                const nextLocalTasks = editingTask
                    ? localTasks.map((task) => (task.id === savedTask.id ? savedTask : task))
                    : [...localTasks, savedTask];
                savePersonalTasks(userId, nextLocalTasks);
                setTasks((items) =>
                    editingTask
                        ? items.map((task) => (task.id === savedTask.id ? savedTask : task))
                        : [...items, savedTask]
                );
                setNotice(
                    residenceId
                        ? "Tarefa pessoal atualizada neste navegador."
                        : "Tarefa salva neste navegador."
                );
                setShowForm(false);
                setEditingTask(null);
                setForm(initialForm);
                return;
            }
            if (editingTask) {
                const updated = await updateTask(residenceId, editingTask.id, data);
                setTasks((items) => items.map((item) => (item.id === updated.id ? updated : item)));
                setNotice("Tarefa atualizada com sucesso.");
            } else {
                const created = await createTask(residenceId, data);
                setTasks((items) => [...items, created]);
                setNotice("Tarefa criada com sucesso.");
            }
            setShowForm(false);
            setEditingTask(null);
            setForm(initialForm);
        } catch (saveError: unknown) {
            setError(getErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    }
    async function markComplete(task: Task) {
        setError("");
        try {
            if (isPersonalTask(task)) {
                const completed: Task = {
                    ...task,
                    status: "CONCLUIDA",
                    completedAt: new Date().toISOString(),
                };
                const nextLocalTasks = readPersonalTasks(userId).map((item) =>
                    item.id === task.id ? completed : item
                );
                savePersonalTasks(userId, nextLocalTasks);
                setTasks((items) =>
                    items.map((item) => (item.id === completed.id ? completed : item))
                );
                setNotice("Tarefa concluída.");
                return;
            }
            if (!residenceId) return;
            const completed = await completeTask(residenceId, task.id);
            setTasks((items) => items.map((item) => (item.id === completed.id ? completed : item)));
            setNotice("Tarefa concluída.");
        } catch (completeError: unknown) {
            setError(getErrorMessage(completeError));
        }
    }
    async function removeTask(taskId: string) {
        const taskToRemove = tasks.find((task) => task.id === taskId);
        if (!taskToRemove || (!isPersonalTask(taskToRemove) && !canDeleteHouseTasks)) return;
        setError("");
        try {
            const task = tasks.find((item) => item.id === taskId);
            if (task && isPersonalTask(task)) {
                const nextLocalTasks = readPersonalTasks(userId).filter(
                    (item) => item.id !== taskId
                );
                savePersonalTasks(userId, nextLocalTasks);
                setTasks((items) => items.filter((item) => item.id !== taskId));
                setConfirmDeleteId("");
                setNotice("Tarefa removida.");
                return;
            }
            if (!residenceId) return;
            await deleteTask(residenceId, taskId);
            setTasks((items) => items.filter((task) => task.id !== taskId));
            setConfirmDeleteId("");
            setNotice("Tarefa removida.");
        } catch (deleteError: unknown) {
            setError(getErrorMessage(deleteError));
        }
    }

    return (
        <div className="min-h-screen bg-[#f8f4fa] text-[#29252d] md:flex">
            <AppSidebar activeSection="tasks" residenceName={residence?.name} />

            <div className="min-w-0 flex-1">
                <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#d9d0dc] bg-[#fffaff] px-5 py-3 md:px-7">
                    <div>
                        <h1 className="text-xl font-bold">Bom dia</h1>
                        <p className="flex items-center gap-1 text-xs text-[#77717c]">
                            <House size={12} />{" "}
                            {scope === "personal" ? "Tarefas pessoais" : houseName}
                        </p>
                    </div>
                    <div
                        className="flex items-center gap-1 rounded-xl bg-[#e8e5e9] p-0.5 text-xs"
                        aria-label="Escopo da casa"
                    >
                        <button
                            type="button"
                            aria-pressed={scope === "personal"}
                            onClick={() => setScope("personal")}
                            className={`rounded-lg px-4 py-2 ${scope === "personal" ? "bg-[#4e812f] font-medium text-white" : "text-[#77717c]"}`}
                        >
                            Pessoal
                        </button>
                        {residences.length > 1 ? (
                            <label className="sr-only" htmlFor="task-residence">
                                Selecionar casa
                            </label>
                        ) : null}
                        {residences.length > 1 ? (
                            <select
                                id="task-residence"
                                value={residenceId}
                                onChange={(event) => void changeResidence(event.target.value)}
                                className="max-w-[180px] rounded-lg bg-[#4e812f] px-4 py-2 font-medium text-white outline-none"
                            >
                                {residences.map((item) => (
                                    <option
                                        key={item.id}
                                        value={item.id}
                                        className="bg-white text-[#29252d]"
                                    >
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <button
                                type="button"
                                aria-pressed={scope === "home"}
                                disabled={!residenceId}
                                onClick={() => setScope("home")}
                                className={`max-w-[180px] truncate rounded-lg px-4 py-2 ${scope === "home" ? "bg-[#4e812f] font-medium text-white" : "text-[#a19ba5]"}`}
                            >
                                {residenceId ? houseName : "Residência"}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-[#514c56]">
                        <Link
                            href="/settings"
                            aria-label="Configurações"
                            className="grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"
                        >
                            <Settings size={19} />
                        </Link>
                        <span className="grid size-10 place-items-center rounded-full bg-[#4f7f63] font-semibold text-white">
                            {user?.email.slice(0, 1).toUpperCase() ?? "?"}
                        </span>
                    </div>
                </header>

                <main className="mx-auto max-w-[1600px] p-4 md:p-6 xl:p-[30px]">
                    {error && (
                        <div
                            role="alert"
                            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                        >
                            {error}
                        </div>
                    )}
                    {notice && (
                        <div
                            role="status"
                            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                        >
                            {notice}
                        </div>
                    )}
                    <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_310px]">
                        <section className="min-w-0 rounded-xl border border-[#d6cdd9] bg-[#fffaff] p-4 md:p-5">
                            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-[25px] font-bold leading-tight">
                                        Tarefas e Rotina
                                    </h2>
                                    <p className="mt-1 text-xs text-[#77717c]">
                                        {new Intl.DateTimeFormat("pt-BR", {
                                            dateStyle: "full",
                                        }).format(new Date())}{" "}
                                        · {members.length} moradores
                                    </p>
                                </div>
                                {(scope === "personal" || canEditHouseTasks) && (
                                    <button
                                        type="button"
                                        onClick={openCreateForm}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-[#4e812f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3e6b25]"
                                    >
                                        <Plus size={15} /> Nova tarefa
                                    </button>
                                )}
                            </div>
                            <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                <SummaryCard
                                    label="Tarefas de hoje"
                                    value={`${todayCompleted.length} de ${todayCompleted.length + todayTasks.length}`}
                                    detail="Concluídas hoje"
                                    progress={
                                        todayCompleted.length + todayTasks.length
                                            ? todayCompleted.length /
                                              (todayCompleted.length + todayTasks.length)
                                            : 0
                                    }
                                />
                                <SummaryCard
                                    label="Atrasadas"
                                    value={String(overdueTasks.length)}
                                    detail="Precisam de atenção"
                                    valueClass="text-red-600"
                                />
                                <SummaryCard
                                    label="Minhas pendentes"
                                    value={String(myPending.length)}
                                    detail="Atribuídas a você"
                                />
                                <SummaryCard
                                    label="Total pendentes"
                                    value={String(activeTasks.length)}
                                    detail="Tarefas em aberto"
                                />
                            </div>

                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                <div className="inline-flex overflow-hidden rounded-full border border-[#302a32] text-xs">
                                    {(
                                        [
                                            ["all", "Todas"],
                                            ["mine", "Minhas"],
                                            ["completed", "Concluídas"],
                                        ] as [TaskTab, string][]
                                    ).map(([tab, label], index) => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-1.5 ${index < 2 ? "border-r border-[#302a32]" : ""} ${activeTab === tab ? "bg-[#b9dda8] text-[#263922]" : "bg-white hover:bg-[#f4f0f5]"}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    aria-label="Buscar tarefas"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Buscar tarefa…"
                                    className="ml-auto min-w-[150px] flex-1 rounded-full border border-[#ded7e1] bg-white px-3 py-2 text-xs sm:max-w-[220px]"
                                />
                            </div>
                            <div className="mb-4">
                                <p className="mb-2 text-[11px] font-semibold">Categorias</p>
                                <div className="flex flex-wrap gap-2">
                                    <TagFilter
                                        label="Todas"
                                        active={!activeTag}
                                        onClick={() => setActiveTag("")}
                                    />
                                    {categories.map((tag, index) => (
                                        <TagFilter
                                            key={tag}
                                            label={tag}
                                            color={tagColors[index % tagColors.length]}
                                            active={activeTag === tag}
                                            onClick={() =>
                                                setActiveTag(activeTag === tag ? "" : tag)
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                            <TaskList
                                tasks={visibleTasks}
                                loading={loading}
                                hasResidence={residences.length > 0}
                                selectedDate={selectedDate}
                                onSelectDate={setSelectedDate}
                                onComplete={markComplete}
                                onEdit={openEditForm}
                                canEdit={scope === "personal" || canEditHouseTasks}
                                canDelete={scope === "personal" || canDeleteHouseTasks}
                                confirmDeleteId={confirmDeleteId}
                                onConfirmDelete={removeTask}
                                onAskDelete={setConfirmDeleteId}
                            />
                        </section>

                        <aside className="grid content-start gap-3">
                            <CalendarWidget
                                month={month}
                                tasks={tasks.filter((task) =>
                                    scope === "personal"
                                        ? isPersonalTask(task)
                                        : !isPersonalTask(task)
                                )}
                                selectedDate={selectedDate}
                                onMonthChange={setMonth}
                                onDateChange={setSelectedDate}
                                myMemberId={myMemberId}
                            />
                            <ExchangeRequests />
                        </aside>
                    </div>
                </main>
            </div>

            {showForm && (
                <TaskModal
                    form={form}
                    members={members}
                    editing={Boolean(editingTask)}
                    saving={saving}
                    error={error}
                    hasResidence={Boolean(residenceId) && scope === "home"}
                    onChange={updateForm}
                    onClose={() => setShowForm(false)}
                    onSubmit={submitTask}
                />
            )}
        </div>
    );
}

function SummaryCard({
    label,
    value,
    detail,
    valueClass = "",
    progress,
}: {
    label: string;
    value: string;
    detail: string;
    valueClass?: string;
    progress?: number;
}) {
    return (
        <div className="min-h-[76px] rounded-lg border border-[#d7ceda] px-3 py-2.5">
            <p className="text-[11px] font-medium">{label}</p>
            <p className={`mt-1 text-lg font-bold leading-tight ${valueClass}`}>{value}</p>
            {progress !== undefined ? (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e2e3e5]">
                    <div
                        className="h-full rounded-full bg-[#4e812f]"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                </div>
            ) : (
                <p className="mt-1 text-[10px] text-[#77717c]">{detail}</p>
            )}
        </div>
    );
}

function TagFilter({
    label,
    active,
    onClick,
    color = "",
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    color?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition ${active ? "border-[#b9dda8] bg-[#b9dda8] text-[#263922]" : "border-[#ded7e1] bg-white hover:bg-[#f6f2f7]"}`}
        >
            <span
                className={`size-2 rounded-full ${color || (active ? "bg-[#4e812f]" : "bg-[#b2adb5]")}`}
            />
            {label}
        </button>
    );
}

function TaskList({
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

function EmptyTasks({ title, onClear }: { title: string; onClear?: () => void }) {
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

function TaskRow({
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

function CalendarWidget({
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

function ExchangeRequests() {
    return (
        <section className="rounded-xl border border-[#e9e2eb] bg-[#fffaff] p-4">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold">Solicitações de troca</h2>
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] text-red-600">
                    2 novas
                </span>
            </div>
            {[
                {
                    name: "Ana",
                    initial: "A",
                    color: "bg-blue-600",
                    from: "Limpar banheiro",
                    fromDate: "Seg, 20/09",
                    to: "Lavar louça",
                    toDate: "Qui, 02/10",
                },
                {
                    name: "Clidenor",
                    initial: "C",
                    color: "bg-violet-600",
                    from: "Lavar chão",
                    fromDate: "Seg, 20/09",
                    to: "Lavar louça",
                    toDate: "Qui, 02/10",
                },
            ].map((request) => (
                <article
                    key={request.name}
                    className="mb-2 rounded-lg border border-[#d1c9d3] bg-white p-2.5 last:mb-0"
                >
                    <div className="mb-2 flex items-center gap-2">
                        <span
                            className={`grid size-7 place-items-center rounded-full ${request.color} text-[10px] font-semibold text-white`}
                        >
                            {request.initial}
                        </span>
                        <p className="text-[10px]">
                            <strong>{request.name}</strong> quer trocar uma tarefa para você
                        </p>
                    </div>
                    <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-1 text-[9px]">
                        <div className="rounded bg-[#eee9f0] px-2 py-1.5">
                            <span className="block truncate">{request.from}</span>
                            <span className="text-[#77717c]">{request.fromDate}</span>
                        </div>
                        <span className="grid size-6 place-items-center rounded-full bg-[#f4f0f5] text-[#4e812f]">
                            ⇄
                        </span>
                        <div className="rounded bg-[#eee9f0] px-2 py-1.5">
                            <span className="block truncate">{request.to}</span>
                            <span className="text-[#77717c]">{request.toDate}</span>
                        </div>
                    </div>
                    <p className="mt-2 text-right text-[9px] text-[#8b858e]">Ações indisponíveis</p>
                </article>
            ))}
        </section>
    );
}

function TaskModal({
    form,
    members,
    editing,
    saving,
    error,
    hasResidence,
    onChange,
    onClose,
    onSubmit,
}: {
    form: TaskFormState;
    members: TaskMember[];
    editing: boolean;
    saving: boolean;
    error: string;
    hasResidence: boolean;
    onChange: <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-4"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-modal-title"
                className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-[530px] overflow-y-auto rounded-2xl bg-[#fffaff] p-5 shadow-2xl md:p-7"
            >
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h2 id="task-modal-title" className="text-xl font-semibold">
                            {editing ? "Editar tarefa" : "Nova tarefa"}
                        </h2>
                        <p className="mt-1 text-[11px] text-[#625c66]">
                            Cadastre uma tarefa para a casa e defina quem é o responsável
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Fechar"
                        onClick={onClose}
                        className="rounded-lg p-1 text-[#77717c] hover:bg-[#f2edf3]"
                    >
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="grid gap-3">
                    {!hasResidence && (
                        <p
                            role="status"
                            className="rounded-lg border border-[#d8e7d1] bg-[#f0f6ed] p-2.5 text-xs text-[#456b35]"
                        >
                            Modo pessoal: esta tarefa ficará salva apenas neste navegador. A
                            sincronização com uma casa poderá ser adicionada depois.
                        </p>
                    )}
                    <label className="grid gap-1.5 text-[11px] font-medium">
                        Título *
                        <input
                            autoFocus
                            required
                            maxLength={150}
                            value={form.title}
                            onChange={(event) => onChange("title", event.target.value)}
                            className={inputClass}
                        />
                    </label>
                    <label className="grid gap-1.5 text-[11px] font-medium">
                        Descrição
                        <textarea
                            maxLength={2000}
                            rows={2}
                            value={form.description}
                            onChange={(event) => onChange("description", event.target.value)}
                            className={`${inputClass} resize-y`}
                        />
                    </label>
                    <label className="grid gap-1.5 text-[11px] font-medium">
                        Tags
                        <input
                            value={form.tags}
                            onChange={(event) => onChange("tags", event.target.value)}
                            placeholder="Ex.: Limpeza, Banheiro (separadas por vírgula)"
                            className={inputClass}
                        />
                    </label>
                    {hasResidence && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1.5 text-[11px] font-medium">
                                Atribuição
                                <select
                                    value={form.assignmentType}
                                    onChange={(event) =>
                                        onChange(
                                            "assignmentType",
                                            event.target.value as TaskAssignmentType
                                        )
                                    }
                                    className={inputClass}
                                >
                                    <option value="FIXA">Responsável fixo</option>
                                    <option value="RODIZIO">Rodízio entre moradores</option>
                                </select>
                            </label>
                            <label className="grid gap-1.5 text-[11px] font-medium">
                                Cor da tarefa
                                <input
                                    type="color"
                                    value={form.color}
                                    onChange={(event) => onChange("color", event.target.value)}
                                    className="h-10 w-full rounded-lg border border-[#d3cbd7] bg-white p-1"
                                />
                            </label>
                        </div>
                    )}
                    {form.assignmentType === "FIXA" ? (
                        <label className="grid gap-1.5 text-[11px] font-medium">
                            Responsável
                            <select
                                value={form.assigneeId}
                                onChange={(event) => onChange("assigneeId", event.target.value)}
                                className={inputClass}
                            >
                                <option value="">Sem responsável</option>
                                {members.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : (
                        <label className="grid gap-1.5 text-[11px] font-medium">
                            Ordem do rodízio (selecione ao menos dois moradores)
                            <select
                                multiple
                                value={form.assigneeIds}
                                onChange={(event) =>
                                    onChange(
                                        "assigneeIds",
                                        Array.from(
                                            event.currentTarget.selectedOptions,
                                            (option) => option.value
                                        )
                                    )
                                }
                                className={`${inputClass} min-h-24`}
                            >
                                {members.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-[11px] font-medium">
                            Data e horário
                            <input
                                required
                                type="datetime-local"
                                value={form.dueAt}
                                onChange={(event) => onChange("dueAt", event.target.value)}
                                className={inputClass}
                            />
                        </label>
                        <label className="grid gap-1.5 text-[11px] font-medium">
                            Repetição
                            <select
                                value={form.repeats ? form.periodicity : "NUNCA"}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    onChange("repeats", value !== "NUNCA");
                                    if (value !== "NUNCA")
                                        onChange("periodicity", value as TaskPeriodicity);
                                }}
                                className={inputClass}
                            >
                                <option value="NUNCA">Não repetir</option>
                                {(
                                    [
                                        "DIARIA",
                                        "SEMANAL",
                                        "QUINZENAL",
                                        "MENSAL",
                                    ] as TaskPeriodicity[]
                                ).map((value) => (
                                    <option key={value} value={value}>
                                        {periodicityLabels[value]}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label className="flex items-center gap-3 rounded-lg bg-[#e9e8e8] px-3 py-2.5 text-[11px]">
                        <Bell size={16} className="shrink-0" />
                        <span className="flex-1">
                            <strong className="block">Lembrete</strong>
                            <span className="text-[10px] text-[#625c66]">
                                Notificar os responsáveis antes do prazo
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            checked={form.hasReminder}
                            onChange={(event) => onChange("hasReminder", event.target.checked)}
                            className="size-4 accent-[#4e812f]"
                        />
                    </label>
                    {form.hasReminder && (
                        <label className="grid gap-1.5 text-[11px] font-medium">
                            Avisar com antecedência
                            <select
                                value={form.reminderMinutesBefore}
                                onChange={(event) =>
                                    onChange("reminderMinutesBefore", event.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="10">10 minutos antes</option>
                                <option value="30">30 minutos antes</option>
                                <option value="60">1 hora antes</option>
                                <option value="1440">1 dia antes</option>
                                <option value="10080">1 semana antes</option>
                            </select>
                        </label>
                    )}
                    {error && (
                        <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
                            {error}
                        </p>
                    )}
                    <div className="mt-1 flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-[#cfc7d3] px-4 py-2 text-xs"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4e812f] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                            <Check size={14} />
                            {saving ? "Salvando…" : editing ? "Salvar alterações" : "Salvar tarefa"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
