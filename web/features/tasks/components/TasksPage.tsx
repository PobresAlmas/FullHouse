"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { SummaryCard, TagFilter } from "@/features/tasks/components/TaskSummary";
import { TaskList } from "@/features/tasks/components/TaskList";
import { CalendarWidget } from "@/features/tasks/components/TaskCalendar";
import { ExchangeRequests } from "@/features/tasks/components/ExchangeRequests";
import { TaskModal } from "@/features/tasks/components/TaskModal";
import {
    getErrorMessage,
    initialForm,
    isPersonalTask,
    localDateKey,
    readPersonalTasks,
    savePersonalTasks,
    tagColors,
    taskDateKey,
    taskToForm,
    toPersonalTask,
    toTaskInput,
    type TaskFormState,
    type TaskTab,
} from "@/features/tasks/lib/tasks.utils";

import Link from "next/link";
import { House, Plus, Settings } from "lucide-react";
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
import type { Task, TaskMember, TaskResidence } from "@/features/tasks/api/tasks.api";
import {
    canCreateOrEditResidenceContent,
    isResidenceManager,
} from "@/features/residences/permissions";

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
