import type { Task, TaskAssignmentType, TaskInput, TaskPeriodicity } from "../api/tasks.api";

export type TaskFormState = {
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
export type TaskTab = "all" | "mine" | "completed";

export const initialForm: TaskFormState = {
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
export const periodicityLabels: Record<TaskPeriodicity, string> = {
    DIARIA: "Diariamente",
    SEMANAL: "Semanalmente",
    QUINZENAL: "A cada duas semanas",
    MENSAL: "Mensalmente",
    PERSONALIZADA: "Personalizada",
};
export const tagColors = [
    "bg-violet-100 text-violet-700",
    "bg-pink-100 text-pink-700",
    "bg-amber-100 text-amber-800",
    "bg-emerald-100 text-emerald-700",
    "bg-sky-100 text-sky-700",
    "bg-yellow-100 text-yellow-800",
];
export const inputClass =
    "w-full rounded-lg border border-[#d3cbd7] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#4f7f63] focus:ring-2 focus:ring-[#4f7f63]/15";

export function getErrorMessage(error: unknown) {
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

export function localDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function taskDateKey(task: Task) {
    return localDateKey(new Date(task.dueAt));
}
export function formatDate(
    value: string,
    options: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" }
) {
    return new Intl.DateTimeFormat("pt-BR", options).format(new Date(value));
}
export function toDateTimeLocal(value: string) {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
export function taskToForm(task: Task): TaskFormState {
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
export function toTaskInput(form: TaskFormState): TaskInput {
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

export function readPersonalTasks(userId: string): Task[] {
    try {
        const stored = window.localStorage.getItem(`fullhouse:personal-tasks:${userId}`);
        const parsed: unknown = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? (parsed as Task[]) : [];
    } catch {
        return [];
    }
}

export function savePersonalTasks(userId: string, tasks: Task[]) {
    try {
        window.localStorage.setItem(`fullhouse:personal-tasks:${userId}`, JSON.stringify(tasks));
    } catch {
        /* A tarefa continua disponível na tela enquanto esta sessão estiver aberta. */
    }
}

export function isPersonalTask(task: Task) {
    return task.id.startsWith("local-");
}

export function toPersonalTask(input: TaskInput, existing?: Task): Task {
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
