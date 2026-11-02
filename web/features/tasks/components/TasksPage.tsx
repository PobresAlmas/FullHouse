"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
    Bell,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    LogOut,
    Plus,
    Repeat2,
    Trash2,
    X,
} from "lucide-react";
import {
    completePersonalTask,
    completeTask,
    createPersonalTask,
    createTaskExchangeRequest,
    createTask,
    deletePersonalTask,
    deleteTask,
    getPersonalTasks,
    getTaskMembers,
    getTaskResidences,
    getTaskExchangeRequests,
    getTasks,
    respondToTaskExchange,
    updatePersonalTask,
    updateTask,
} from "@/features/tasks/api/tasks.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import type {
    Task,
    TaskAssignmentType,
    TaskInput,
    TaskMember,
    TaskPeriodicity,
    TaskResidence,
    TaskExchangeRequest,
} from "@/features/tasks/api/tasks.api";
import {
    canCreateOrEditResidenceContent,
    isResidenceManager,
} from "@/features/residences/permissions";

type TaskFormState = {
    title: string;
    description: string;
    tags: string[];
    assigneeId: string;
    assignmentType: TaskAssignmentType;
    assigneeIds: string[];
    color: string;
    dueAt: string;
    repeats: boolean;
    periodicity: TaskPeriodicity;
    hasReminder: boolean;
    reminderMinutesBefore: string;
    visibility: "PUBLICA" | "PRIVADA";
};
type TaskTab = "all" | "overdue" | "pending" | "completed";

const initialForm: TaskFormState = {
    title: "",
    description: "",
    tags: [],
    assigneeId: "",
    assignmentType: "FIXA",
    assigneeIds: [],
    color: "#4f7f63",
    dueAt: "",
    repeats: false,
    periodicity: "SEMANAL",
    hasReminder: true,
    reminderMinutesBefore: "30",
    visibility: "PUBLICA",
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
const tagDotColors = [
    "bg-violet-500",
    "bg-pink-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-sky-500",
    "bg-yellow-500",
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
        tags: task.tags,
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
        visibility: task.visibility ?? "PUBLICA",
    };
}
function toTaskInput(form: TaskFormState): TaskInput {
    return {
        title: form.title.trim(),
        description: form.description.trim() || null,
        tags: form.tags,
        assigneeId: form.assigneeId || null,
        assignmentType: form.assignmentType,
        assigneeIds: form.assignmentType === "RODIZIO" ? form.assigneeIds : [],
        color: form.color,
        visibility: form.visibility,
        dueAt: new Date(form.dueAt).toISOString(),
        repeats: form.repeats,
        ...(form.repeats ? { periodicity: form.periodicity } : {}),
        reminderMinutesBefore: form.hasReminder ? Number(form.reminderMinutesBefore || 0) : null,
    };
}

function isPersonalTask(task: Task) {
    return task.scope === "INDIVIDUAL";
}

export default function TasksPage() {
    const { user, logout } = useAuth();
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
    const [dataError, setDataError] = useState("");
    const [notice, setNotice] = useState("");
    const [exchangeRequests, setExchangeRequests] = useState<TaskExchangeRequest[]>([]);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState("");
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const residence = residences.find((item) => item.id === residenceId) ?? null;
    const myMemberId = residence?.membership?.id ?? "";
    const userName = user?.name?.trim() || user?.email?.split("@")[0] || "Minha conta";
    const avatarInitial = user?.name?.trim().charAt(0) || user?.email?.trim().charAt(0) || "?";
    const canEditHouseTasks = canCreateOrEditResidenceContent(
        residence?.membership?.role,
        residence?.creationEditPolicy
    );
    const canDeleteHouseTasks = isResidenceManager(residence?.membership?.role);

    useEffect(() => {
        document.documentElement.classList.add("tasks-hide-page-scrollbar");
        return () => document.documentElement.classList.remove("tasks-hide-page-scrollbar");
    }, []);

    const loadResidenceData = useCallback(async (id: string) => {
        const [nextMembers, nextTasks] = await Promise.all([getTaskMembers(id), getTasks(id)]);
        setMembers(nextMembers);
        setTasks(nextTasks);
        try {
            setExchangeRequests(await getTaskExchangeRequests(id));
        } catch (requestError: unknown) {
            setExchangeRequests([]);
            setError(getErrorMessage(requestError));
        }
    }, []);

    useEffect(() => {
        let active = true;
        async function loadInitialContext() {
            try {
                const available = await getTaskResidences();
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
                    if (!active) return;
                    setMembers(nextMembers);
                    setTasks(nextTasks);
                    setNotice("");
                    getTaskExchangeRequests(id)
                        .then((requests) => active && setExchangeRequests(requests))
                        .catch((requestError: unknown) => {
                            if (active) {
                                setExchangeRequests([]);
                                setError(getErrorMessage(requestError));
                            }
                        });
                } else {
                    const personalTasks = await getPersonalTasks();
                    if (!active) return;
                    setTasks(personalTasks);
                    setMembers([]);
                    setExchangeRequests([]);
                }
            } catch (loadError: unknown) {
                if (active) {
                    const message = getErrorMessage(loadError);
                    setError(message);
                    setDataError(message);
                }
            } finally {
                if (active) setLoading(false);
            }
        }
        void loadInitialContext();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!showForm) return;
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setShowForm(false);
        }
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [showForm]);

    useEffect(() => {
        if (!profileMenuOpen) return;
        function closeMenu(event: PointerEvent) {
            if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) {
                setProfileMenuOpen(false);
            }
        }
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setProfileMenuOpen(false);
        }
        document.addEventListener("pointerdown", closeMenu);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeMenu);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [profileMenuOpen]);

    const contextualTasks = tasks;
    const categories = useMemo(
        () =>
            [...new Set(contextualTasks.flatMap((task) => task.tags))].sort((a, b) =>
                a.localeCompare(b, "pt-BR")
            ),
        [contextualTasks]
    );
    const todayKey = localDateKey(new Date());
    const activeTasks = contextualTasks.filter(
        (task) => task.status !== "CONCLUIDA" && task.status !== "CANCELADA"
    );
    const overdueTasks = activeTasks.filter(
        (task) => taskDateKey(task) < todayKey || task.status === "ATRASADA"
    );
    const todayTasks = activeTasks.filter(
        (task) => taskDateKey(task) === todayKey && task.status !== "ATRASADA"
    );
    const todayCompleted = contextualTasks.filter(
        (task) => task.status === "CONCLUIDA" && task.completedAt?.slice(0, 10) === todayKey
    );
    const myPending = activeTasks.filter(
        (task) => isPersonalTask(task) || task.assignee?.id === myMemberId
    );

    const visibleTasks = useMemo(() => {
        const normalized = search.trim().toLocaleLowerCase("pt-BR");
        return contextualTasks
            .filter((task) => {
                const overdue = task.status === "ATRASADA" || taskDateKey(task) < todayKey;
                if (
                    activeTab === "overdue" &&
                    (task.status === "CONCLUIDA" || task.status === "CANCELADA" || !overdue)
                )
                    return false;
                if (
                    activeTab === "pending" &&
                    task.status !== "PENDENTE" &&
                    task.status !== "EM_ANDAMENTO" &&
                    !overdue
                )
                    return false;
                if (activeTab === "completed" && task.status !== "CONCLUIDA") return false;
                if (task.status === "CANCELADA") return false;
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
    }, [
        activeTab,
        activeTag,
        search,
        selectedDate,
        contextualTasks,
        todayKey,
    ]);

    const visibleExchangeRequests = exchangeRequests;

    async function changeResidence(id: string) {
        setResidenceId(id);
        setScope("home");
        setTasks([]);
        setMembers([]);
        setExchangeRequests([]);
        setError("");
        setDataError("");
        setNotice("");
        setLoading(true);
        try {
            await loadResidenceData(id);
        } catch (loadError: unknown) {
            const message = getErrorMessage(loadError);
            setError(message);
            setDataError(message);
        } finally {
            setLoading(false);
        }
    }
    async function changeScope(nextScope: "personal" | "home") {
        if (nextScope === "home" && !residenceId) return;
        setScope(nextScope);
        setActiveTab("all");
        setSelectedDate("");
        setActiveTag("");
        setTasks([]);
        setMembers([]);
        setExchangeRequests([]);
        setError("");
        setDataError("");
        setLoading(true);
        try {
            if (nextScope === "personal") {
                const personalTasks = await getPersonalTasks();
                setTasks(personalTasks);
            } else {
                await loadResidenceData(residenceId);
            }
        } catch (loadError: unknown) {
            const message = getErrorMessage(loadError);
            setError(message);
            setDataError(message);
        } finally {
            setLoading(false);
        }
    }
    function openCreateForm() {
        if (scope === "home" && (!residenceId || !myMemberId)) return;
        setEditingTask(null);
        setForm({
            ...initialForm,
            dueAt: `${todayKey}T19:00`,
            assigneeId: scope === "home" && !canEditHouseTasks ? myMemberId : "",
            visibility: scope === "personal" ? "PRIVADA" : "PUBLICA",
        });
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
        const isHomeTask = editingTask ? !isPersonalTask(editingTask) : scope === "home";
        if (
            isHomeTask &&
            (form.assignmentType === "FIXA" ? !form.assigneeId : form.assigneeIds.length < 2)
        ) {
            setError(
                form.assignmentType === "FIXA"
                    ? "Selecione um responsável para a tarefa."
                    : "Selecione pelo menos dois moradores para o rodízio."
            );
            return;
        }
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const data = toTaskInput(form);
            if (!isHomeTask) {
                const personalData = { ...data };
                delete personalData.assigneeId;
                delete personalData.assigneeIds;
                delete personalData.assignmentType;
                const savedTask = editingTask
                    ? await updatePersonalTask(editingTask.id, personalData)
                    : await createPersonalTask(personalData);
                setTasks((items) =>
                    editingTask
                        ? items.map((task) => (task.id === savedTask.id ? savedTask : task))
                        : [...items, savedTask]
                );
                setNotice(editingTask ? "Tarefa pessoal atualizada." : "Tarefa pessoal criada.");
                setShowForm(false);
                setEditingTask(null);
                setForm(initialForm);
                return;
            }
            const residenceData = canEditHouseTasks
                ? data
                : {
                      ...data,
                      assigneeId: myMemberId,
                      assignmentType: "FIXA" as const,
                      assigneeIds: [],
                  };
            if (editingTask) {
                const updated = await updateTask(residenceId, editingTask.id, residenceData);
                setTasks((items) => items.map((item) => (item.id === updated.id ? updated : item)));
                setNotice("Tarefa atualizada com sucesso.");
            } else {
                const created = await createTask(residenceId, residenceData);
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
                const completed = await completePersonalTask(task.id);
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
                await deletePersonalTask(taskId);
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
    async function requestExchange(task: Task, recipientMemberId: string, targetTaskId?: string) {
        if (!residenceId || !recipientMemberId) return;
        setError("");
        try {
            await createTaskExchangeRequest(residenceId, task.id, recipientMemberId, targetTaskId);
            setExchangeRequests(await getTaskExchangeRequests(residenceId));
            setNotice("Pedido de troca enviado.");
        } catch (requestError: unknown) {
            setError(getErrorMessage(requestError));
        }
    }
    async function respondToExchange(
        request: TaskExchangeRequest,
        status: "ACEITA" | "RECUSADA",
        targetTaskId?: string
    ) {
        if (!residenceId) return;
        setError("");
        try {
            await respondToTaskExchange(residenceId, request.id, status, targetTaskId);
            await loadResidenceData(residenceId);
            setNotice(status === "ACEITA" ? "Troca aceita." : "Solicitação recusada.");
        } catch (requestError: unknown) {
            setError(getErrorMessage(requestError));
        }
    }

    async function handleLogout() {
        setLoggingOut(true);
        setLogoutError("");
        try {
            await logout();
        } catch (logoutFailure: unknown) {
            setLogoutError(getErrorMessage(logoutFailure));
            setLoggingOut(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#f8f4fa] text-[#29252d] md:flex">
            <AppSidebar activeSection="tasks" residenceName={residence?.name} />

            <div className="min-w-0 flex-1">
                <AppPageHeader
                    greetingName={userName}
                    residenceName={scope === "home" ? residence?.name : undefined}
                    subtitle={scope === "personal" ? "Tarefas pessoais" : undefined}
                    residenceControl={
                        residences.length > 0 ? (
                            <div className="flex rounded-xl bg-[#e8e7eb] p-1" aria-label="Contexto da Home">
                                <button
                                    type="button"
                                    disabled={loading}
                                    aria-pressed={scope === "personal"}
                                    onClick={() => void changeScope("personal")}
                                    className={`min-w-28 rounded-lg px-5 py-2 text-xs ${scope === "personal" ? "bg-[#4e812f] text-white" : "text-[#3e3a41]"}`}
                                >
                                    Pessoal
                                </button>
                                {residences.length === 1 ? (
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => void changeScope("home")}
                                        aria-pressed={scope === "home"}
                                        className={`rounded-lg px-5 py-2 text-xs ${scope === "home" ? "bg-[#4e812f] text-white" : "text-[#3e3a41]"}`}
                                    >
                                        {residence?.name}
                                    </button>
                                ) : (
                                    <select
                                        aria-label="Residência"
                                        value={residenceId}
                                        disabled={loading}
                                        onChange={(event) => void changeResidence(event.target.value)}
                                        className="max-w-48 rounded-lg bg-[#4e812f] px-3 py-2 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-[#4e812f]"
                                    >
                                        {residences.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        ) : null
                    }
                    settingsHref="/settings"
                    profile={
                        <div className="relative" ref={profileMenuRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setProfileMenuOpen((open) => !open);
                                    setLogoutError("");
                                }}
                                aria-label={`Abrir menu da conta de ${userName}`}
                                aria-haspopup="menu"
                                aria-expanded={profileMenuOpen}
                                className="grid size-10 place-items-center rounded-full bg-[#4b825f] font-semibold text-white transition hover:bg-[#3e704f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f]"
                            >
                                {avatarInitial.toLocaleUpperCase("pt-BR")}
                            </button>
                            {profileMenuOpen && (
                                <div role="menu" aria-label="Menu da conta" className="absolute right-0 top-12 z-30 w-64 rounded-xl border border-[#d2c8d5] bg-white p-3 text-[#302a32] shadow-lg">
                                    <div className="border-b border-[#eee8ef] px-2 pb-3">
                                        <p className="truncate text-sm font-semibold">{userName}</p>
                                        {user?.email && <p className="truncate text-xs text-[#77717a]">{user.email}</p>}
                                    </div>
                                    {logoutError && <p role="alert" className="px-2 pt-2 text-xs text-red-700">Não foi possível sair: {logoutError}</p>}
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => void handleLogout()}
                                        disabled={loggingOut}
                                        className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-[#514c56] transition hover:bg-[#f7f2fa] disabled:cursor-wait disabled:opacity-60"
                                    >
                                        <LogOut size={16} />
                                        {loggingOut ? "Saindo…" : "Sair"}
                                    </button>
                                </div>
                            )}
                        </div>
                    }
                />

                <main className="mx-auto max-w-[1600px] p-5 md:p-6">
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
                                        · {members.length}{" "}
                                        {members.length === 1 ? "morador" : "moradores"}
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
                                <div
                                    className="inline-flex max-w-full flex-nowrap gap-1 overflow-x-auto rounded-full bg-[#f0edf2] p-1 text-xs"
                                    role="group"
                                    aria-label="Filtrar por status"
                                >
                                    {(
                                        [
                                            ["all", "Todas"],
                                            ["overdue", "Atrasadas"],
                                            ["pending", "Pendentes"],
                                            ["completed", "Concluídas"],
                                        ] as [TaskTab, string][]
                                    ).map(([tab, label]) => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActiveTab(tab)}
                                            aria-pressed={activeTab === tab}
                                            className={`shrink-0 rounded-full px-3 py-2 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356a22] ${activeTab === tab ? "bg-white font-semibold text-[#356a22] shadow-[0_2px_0_#4e812f]" : "bg-transparent text-[#554f59] hover:bg-white/70"}`}
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
                                <p className="mb-2 text-xs font-semibold text-[#39333e]">Categorias</p>
                                <div className="flex flex-wrap gap-2.5">
                                    <TagFilter
                                        label="Todas"
                                        active={!activeTag}
                                        onClick={() => setActiveTag("")}
                                    />
                                    {categories.map((tag, index) => (
                                        <TagFilter
                                            key={tag}
                                            label={tag}
                                            color={tagDotColors[index % tagDotColors.length]}
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
                                dataError={dataError}
                                onRetry={() => void changeScope(scope)}
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
                                members={members}
                                myMemberId={myMemberId}
                                exchangeTasks={scope === "home" ? contextualTasks : []}
                                onRequestExchange={requestExchange}
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
                            <ExchangeRequests
                                requests={scope === "home" ? visibleExchangeRequests : []}
                                loading={loading}
                                tasks={scope === "home" ? contextualTasks : []}
                                myMemberId={myMemberId}
                                onRespond={respondToExchange}
                            />
                        </aside>
                    </div>
                </main>
            </div>

            {showForm && (
                <TaskModal
                    form={form}
                    members={members}
                    myMemberId={myMemberId}
                    canAssignOthers={canEditHouseTasks}
                    existingTags={categories}
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
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#356a22] ${active ? "border-[#8bb876] bg-[#dcebd5] text-[#263922]" : "border-[#ded7e1] bg-white text-[#3f3944] hover:bg-[#f6f2f7]"}`}
        >
            <span
                className={`size-2.5 shrink-0 rounded-full ${color || (active ? "bg-[#4e812f]" : "bg-[#8c8790]")}`}
            />
            {label}
        </button>
    );
}

function TaskList({
    tasks,
    loading,
    dataError,
    onRetry,
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
    members,
    myMemberId,
    exchangeTasks,
    onRequestExchange,
}: {
    tasks: Task[];
    loading: boolean;
    dataError: string;
    onRetry: () => void;
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
    members: TaskMember[];
    myMemberId: string;
    exchangeTasks: Task[];
    onRequestExchange: (task: Task, recipientMemberId: string, targetTaskId?: string) => void;
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
    if (dataError)
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-red-800">
                    Não foi possível carregar as tarefas.
                </p>
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-2 text-xs font-semibold text-red-800 underline"
                >
                    Tentar novamente
                </button>
            </div>
        );
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
                                members={members}
                                myMemberId={myMemberId}
                                exchangeTasks={exchangeTasks}
                                onRequestExchange={(memberId, targetTaskId) =>
                                    onRequestExchange(task, memberId, targetTaskId)
                                }
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
    members,
    myMemberId,
    exchangeTasks,
    onRequestExchange,
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
    members: TaskMember[];
    myMemberId: string;
    exchangeTasks: Task[];
    onRequestExchange: (recipientMemberId: string, targetTaskId?: string) => void;
}) {
    const completed = task.status === "CONCLUIDA";
    const [exchangeMenuOpen, setExchangeMenuOpen] = useState(false);
    const [selectedRecipientId, setSelectedRecipientId] = useState("");
    const [preferredTaskId, setPreferredTaskId] = useState("");
    const otherMembers = members.filter((member) => member.id !== myMemberId);
    const selectedRecipient = otherMembers.find((member) => member.id === selectedRecipientId);
    const recipientTasks = exchangeTasks.filter(
        (candidate) =>
            candidate.id !== task.id &&
            candidate.assignee?.id === selectedRecipientId &&
            candidate.scope !== "INDIVIDUAL" &&
            candidate.visibility !== "PRIVADA" &&
            ["PENDENTE", "EM_ANDAMENTO", "ATRASADA"].includes(candidate.status)
    );
    const duplicatedNames = new Set(
        otherMembers
            .filter((member) => otherMembers.filter((other) => other.name === member.name).length > 1)
            .map((member) => member.id)
    );
    const eligibleForExchange =
        task.scope !== "INDIVIDUAL" &&
        task.assignee?.id === myMemberId &&
        ["PENDENTE", "EM_ANDAMENTO", "ATRASADA"].includes(task.status);
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
                            className={`inline-flex items-center rounded-full border border-black/5 px-2.5 py-1 text-[10px] font-medium leading-none ${tagColors[index % tagColors.length]}`}
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
                    {eligibleForExchange && members.some((member) => member.id !== myMemberId) && (
                        <div className="relative">
                            <button
                                type="button"
                                aria-label={`Solicitar troca da tarefa ${task.title}`}
                                aria-haspopup="menu"
                                aria-expanded={exchangeMenuOpen}
                                onClick={() => {
                                    setExchangeMenuOpen((open) => !open);
                                    setSelectedRecipientId("");
                                    setPreferredTaskId("");
                                }}
                                className="grid size-8 place-items-center rounded-full border border-[#cfc7d3] text-[#356a22] hover:bg-[#eff7eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f]"
                            >
                                <Repeat2 size={15} />
                            </button>
                            {exchangeMenuOpen && (
                                <div role="dialog" aria-label="Solicitar troca" className="absolute right-0 top-9 z-20 w-60 rounded-lg border border-[#d7ceda] bg-white p-2 shadow-lg">
                                    {!selectedRecipient ? (
                                        <>
                                            <p className="px-2 py-1.5 text-[10px] font-semibold text-[#77717c]">Solicitar troca com</p>
                                            {otherMembers.map((member) => (
                                                <button
                                                    key={member.id}
                                                    type="button"
                                                    onClick={() => setSelectedRecipientId(member.id)}
                                                    className="block w-full rounded-md px-2 py-2 text-left text-xs text-[#302a32] hover:bg-[#f3eff5] focus-visible:outline-2 focus-visible:outline-[#4e812f]"
                                                >
                                                    {member.name}
                                                    {duplicatedNames.has(member.id) && (
                                                        <span className="ml-1 text-[10px] text-[#77717c]">
                                                            ({member.role.toLocaleLowerCase("pt-BR")}, …{member.id.slice(-4)})
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <p className="truncate text-[10px] font-semibold text-[#302a32]">
                                                    Trocar com {selectedRecipient.name}
                                                    {duplicatedNames.has(selectedRecipient.id) && (
                                                        <span className="ml-1 font-normal text-[#77717c]">
                                                            ({selectedRecipient.role.toLocaleLowerCase("pt-BR")}, …{selectedRecipient.id.slice(-4)})
                                                        </span>
                                                    )}
                                                </p>
                                                <button type="button" onClick={() => { setSelectedRecipientId(""); setPreferredTaskId(""); }} className="shrink-0 text-[10px] text-[#356a22] underline">Alterar</button>
                                            </div>
                                            <label className="grid gap-1 text-[10px] text-[#514c56]">
                                                Tarefa desejada (opcional)
                                                <select
                                                    aria-label={`Tarefa desejada de ${selectedRecipient.name}`}
                                                    value={preferredTaskId}
                                                    onChange={(event) => setPreferredTaskId(event.target.value)}
                                                    className="w-full rounded-md border border-[#d1c9d3] bg-white px-2 py-1.5 text-xs text-[#302a32]"
                                                >
                                                    <option value="">Sem preferência; deixa a pessoa decidir</option>
                                                    {recipientTasks.map((candidate) => (
                                                        <option key={candidate.id} value={candidate.id}>{candidate.title}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onRequestExchange(selectedRecipient.id, preferredTaskId || undefined);
                                                    setExchangeMenuOpen(false);
                                                }}
                                                className="mt-2 w-full rounded-md bg-[#4e812f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3e6b25]"
                                            >
                                                Enviar pedido
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
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

function ExchangeRequests({
    requests,
    loading,
    tasks,
    myMemberId,
    onRespond,
}: {
    requests: TaskExchangeRequest[];
    loading: boolean;
    tasks: Task[];
    myMemberId: string;
    onRespond: (
        request: TaskExchangeRequest,
        status: "ACEITA" | "RECUSADA",
        targetTaskId?: string
    ) => void;
}) {
    const [selectedTasks, setSelectedTasks] = useState<Record<string, string>>({});
    const ownOpenTasks = tasks.filter(
        (task) =>
            task.scope !== "INDIVIDUAL" &&
            task.assignee?.id === myMemberId &&
            ["PENDENTE", "EM_ANDAMENTO", "ATRASADA"].includes(task.status)
    );
    const incoming = requests.filter(
        (request) => request.incoming && request.status === "PENDENTE"
    );
    return (
        <section className="rounded-xl border border-[#e9e2eb] bg-[#fffaff] p-4">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold">Solicitações de troca</h2>
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">
                    {incoming.length} novas
                </span>
            </div>
            {loading ? (
                <p className="py-5 text-center text-xs text-[#625c66]">Carregando solicitações…</p>
            ) : requests.length === 0 ? (
                <p className="py-5 text-center text-xs text-[#625c66]">
                    Nenhuma solicitação de troca.
                </p>
            ) : (
                requests.map((request) => {
                    const recipientTaskChoices = ownOpenTasks.filter(
                        (candidate) => candidate.id !== request.task.id
                    );
                    const selectedTargetTaskId =
                        selectedTasks[request.id] ?? request.targetTask?.id ?? "";
                    const selectedTargetIsAvailable = recipientTaskChoices.some(
                        (candidate) => candidate.id === selectedTargetTaskId
                    );
                    return (
                    <article
                        key={request.id}
                        className="mb-2 rounded-lg border border-[#d1c9d3] bg-white p-3 last:mb-0"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="grid size-7 place-items-center rounded-full bg-[#356a22] text-xs font-semibold text-white">
                                {request.requester.slice(0, 1).toUpperCase()}
                            </span>
                            <p className="text-xs text-[#302a32]">
                                <strong>{request.requester}</strong>{" "}
                                {request.incoming
                                    ? "propôs trocar tarefas com você:"
                                    : `proposta para ${request.recipient}:`}
                            </p>
                        </div>
                        <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-1 text-xs">
                            <div className="min-w-0 rounded-md bg-[#eee9f0] px-2 py-2">
                                <span className="block truncate font-medium">
                                    {request.task.title}
                                </span>
                                <span className="text-[#514c56]">
                                    {formatDate(request.task.dueAt, { dateStyle: "medium" })}
                                </span>
                            </div>
                            <span className="text-center text-[#356a22]" aria-label="troca por">
                                ⇄
                            </span>
                            {request.incoming && request.status === "PENDENTE" ? (
                                <label className="min-w-0 rounded-md bg-[#f4f0f5] px-2 py-2 text-[#514c56]">
                                    <span className="mb-1 block text-[10px]">
                                        {request.targetTask ? "Tarefa sugerida · confirme ou altere" : "Sua tarefa"}
                                    </span>
                                    <select
                                        aria-label={`Escolher tarefa para trocar com ${request.requester}`}
                                        value={selectedTargetTaskId}
                                        onChange={(event) =>
                                            setSelectedTasks((current) => ({
                                                ...current,
                                                [request.id]: event.target.value,
                                            }))
                                        }
                                        className="w-full rounded border border-[#d1c9d3] bg-white px-1.5 py-1 text-[11px] text-[#302a32]"
                                    >
                                        <option value="">Escolha uma tarefa…</option>
                                        {recipientTaskChoices.map((candidate) => (
                                            <option key={candidate.id} value={candidate.id}>
                                                {candidate.title}
                                            </option>
                                        ))}
                                    </select>
                                    {recipientTaskChoices.length === 0 && (
                                        <span className="mt-1 block text-[10px]">Você não tem outra tarefa aberta disponível.</span>
                                    )}
                                </label>
                            ) : request.targetTask ? (
                                <div className="min-w-0 rounded-md bg-[#eee9f0] px-2 py-2">
                                    <span className="block truncate font-medium">
                                        {request.targetTask.title}
                                    </span>
                                    <span className="text-[#514c56]">
                                        {formatDate(request.targetTask.dueAt, {
                                            dateStyle: "medium",
                                        })}
                                    </span>
                                </div>
                            ) : (
                                <div className="rounded-md bg-[#f4f0f5] px-2 py-2 text-[#514c56]">
                                    Aguardando escolha do destinatário
                                </div>
                            )}
                        </div>
                        {request.incoming && request.status === "PENDENTE" ? (
                            <div className="mt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => onRespond(request, "RECUSADA")}
                                    className="rounded-md border border-[#4e812f] px-3 py-1.5 text-xs font-medium text-[#356a22] hover:bg-[#eff7eb]"
                                >
                                    Recusar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onRespond(request, "ACEITA", selectedTargetTaskId || undefined)}
                                    disabled={!selectedTargetIsAvailable}
                                    className="rounded-md bg-[#4e812f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3e6b25] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Aceitar
                                </button>
                            </div>
                        ) : (
                            <p className="mt-2 text-right text-xs text-[#514c56]">
                                {!request.targetTask && request.status !== "PENDENTE"
                                    ? "Solicitação encerrada"
                                    : request.status === "PENDENTE"
                                      ? "Aguardando resposta"
                                      : request.status === "ACEITA"
                                        ? "Aceita"
                                        : request.status === "RECUSADA"
                                          ? "Recusada"
                                          : "Encerrada"}
                            </p>
                        )}
                    </article>
                    );
                })
            )}
        </section>
    );
}

function TaskModal({
    form,
    members,
    myMemberId,
    canAssignOthers,
    existingTags,
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
    myMemberId: string;
    canAssignOthers: boolean;
    existingTags: string[];
    editing: boolean;
    saving: boolean;
    error: string;
    hasResidence: boolean;
    onChange: <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const [tagDraft, setTagDraft] = useState("");
    function addTag(value: string) {
        const normalized = value.trim();
        if (!normalized) return;
        const exists = form.tags.some(
            (tag) => tag.toLocaleLowerCase("pt-BR") === normalized.toLocaleLowerCase("pt-BR")
        );
        if (!exists) onChange("tags", [...form.tags, normalized]);
        setTagDraft("");
    }
    function toggleMember(memberId: string) {
        if (form.assignmentType === "RODIZIO") {
            onChange(
                "assigneeIds",
                form.assigneeIds.includes(memberId)
                    ? form.assigneeIds.filter((id) => id !== memberId)
                    : [...form.assigneeIds, memberId]
            );
        } else {
            onChange("assigneeId", memberId);
        }
    }
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
                            Esta tarefa ficará vinculada somente ao seu perfil pessoal.
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
                    <div className="grid gap-2 text-[11px] font-medium">
                        <label htmlFor="task-tag-input">Tags</label>
                        <div className="flex gap-2">
                            <input
                                id="task-tag-input"
                                value={tagDraft}
                                onChange={(event) => setTagDraft(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        addTag(tagDraft);
                                    }
                                }}
                                placeholder="Digite uma tag"
                                className={inputClass}
                            />
                            <button
                                type="button"
                                onClick={() => addTag(tagDraft)}
                                className="shrink-0 rounded-lg border border-[#4e812f] px-3 text-xs font-semibold text-[#356a22]"
                            >
                                + Nova tag
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5" aria-label="Tags selecionadas">
                            {form.tags.map((tag, index) => (
                                <button
                                    key={tag}
                                    type="button"
                                    aria-pressed="true"
                                    onClick={() =>
                                        onChange(
                                            "tags",
                                            form.tags.filter((item) => item !== tag)
                                        )
                                    }
                                    className={`rounded-full px-2.5 py-1 text-[10px] ${tagColors[index % tagColors.length]}`}
                                >
                                    {tag} ×
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5" aria-label="Sugestões de tags">
                            {existingTags
                                .filter((tag) => !form.tags.includes(tag))
                                .map((tag, index) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        aria-pressed="false"
                                        onClick={() => addTag(tag)}
                                        className={`rounded-full border border-[#d7ceda] px-2.5 py-1 text-[10px] ${tagColors[index % tagColors.length]}`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                        </div>
                    </div>
                    <fieldset className="grid gap-2 text-[11px] font-medium">
                        <legend>Visibilidade</legend>
                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    ["PUBLICA", "Comunitária"],
                                    ["PRIVADA", "Privada"],
                                ] as const
                            ).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={form.visibility === value}
                                    onClick={() => onChange("visibility", value)}
                                    className={`rounded-full border px-3 py-1.5 text-xs ${form.visibility === value ? "border-[#4e812f] bg-[#e7f1e1] text-[#264d18]" : "border-[#d7ceda] bg-white text-[#514c56]"}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </fieldset>
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
                                    {canAssignOthers && (
                                        <option value="RODIZIO">Rodízio entre moradores</option>
                                    )}
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
                    {hasResidence && (
                        <fieldset className="grid gap-2 text-[11px] font-medium">
                            <legend>
                                {form.assignmentType === "RODIZIO"
                                    ? "Responsáveis · ordem do rodízio (selecione ao menos 2)"
                                    : "Responsável *"}
                            </legend>
                            <div className="flex flex-wrap gap-2">
                                {members
                                    .filter((member) => canAssignOthers || member.id === myMemberId)
                                    .map((member, index) => {
                                        const selected =
                                            form.assignmentType === "RODIZIO"
                                                ? form.assigneeIds.includes(member.id)
                                                : form.assigneeId === member.id;
                                        return (
                                            <button
                                                key={member.id}
                                                type="button"
                                                aria-pressed={selected}
                                                onClick={() => toggleMember(member.id)}
                                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${selected ? "border-[#4e812f] bg-[#b9dda8] text-[#203c17]" : "border-[#d7ceda] bg-white text-[#302a32]"}`}
                                            >
                                                <span
                                                    className={`grid size-5 place-items-center rounded-full text-[10px] font-bold text-white ${["bg-[#4f7f63]", "bg-violet-700", "bg-blue-700", "bg-orange-700"][index % 4]}`}
                                                >
                                                    {member.name.slice(0, 1).toUpperCase()}
                                                </span>
                                                {member.name}
                                            </button>
                                        );
                                    })}
                            </div>
                            {!canAssignOthers && (
                                <p className="text-[10px] text-[#514c56]">
                                    Você pode atribuir esta tarefa somente a si mesmo.
                                </p>
                            )}
                        </fieldset>
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
