import { api } from "@/services/api";

export type TaskPeriodicity = "DIARIA" | "SEMANAL" | "QUINZENAL" | "MENSAL" | "PERSONALIZADA";

export type TaskStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "ATRASADA" | "CANCELADA";

export interface TaskMember {
    id: string;
    name: string;
    role: "LIDER" | "ADMINISTRADOR" | "MORADOR";
}

export interface TaskResidence {
    id: string;
    name: string;
    membership: { id: string; role: "LIDER" | "ADMINISTRADOR" | "MORADOR" } | null;
}

export interface Task {
    id: string;
    definitionId: string;
    title: string;
    description: string | null;
    tags: string[];
    residenceId: string | null;
    assignee: { id: string; name: string } | null;
    dueAt: string;
    periodicity: TaskPeriodicity;
    repeats: boolean;
    reminderAt: string | null;
    status: TaskStatus;
    completedAt: string | null;
}

export interface TaskInput {
    title: string;
    description?: string | null;
    tags?: string[];
    assigneeId?: string | null;
    dueAt: string;
    repeats?: boolean;
    periodicity?: TaskPeriodicity;
    reminderMinutesBefore?: number | null;
}

export interface TaskFilters {
    search?: string;
    status?: TaskStatus;
    assigneeId?: string;
    periodicity?: TaskPeriodicity;
}

function residenceTasksPath(residenceId: string) {
    return `/residences/${residenceId}/tasks`;
}

export async function getTaskResidences(): Promise<TaskResidence[]> {
    const response = await api.get<TaskResidence[]>("/residences");
    return response.data;
}

export async function getTaskMembers(residenceId: string): Promise<TaskMember[]> {
    const response = await api.get<TaskMember[]>(`${residenceTasksPath(residenceId)}/members`);
    return response.data;
}

export async function getTasks(residenceId: string, filters: TaskFilters = {}): Promise<Task[]> {
    const response = await api.get<Task[]>(residenceTasksPath(residenceId), { params: filters });
    return response.data;
}

export async function getTask(residenceId: string, taskId: string): Promise<Task> {
    const response = await api.get<Task>(`${residenceTasksPath(residenceId)}/${taskId}`);
    return response.data;
}

export async function createTask(residenceId: string, data: TaskInput): Promise<Task> {
    const response = await api.post<Task>(residenceTasksPath(residenceId), data);
    return response.data;
}

export async function updateTask(
    residenceId: string,
    taskId: string,
    data: Partial<TaskInput>
): Promise<Task> {
    const response = await api.patch<Task>(`${residenceTasksPath(residenceId)}/${taskId}`, data);
    return response.data;
}

export async function completeTask(residenceId: string, taskId: string): Promise<Task> {
    const response = await api.patch<Task>(`${residenceTasksPath(residenceId)}/${taskId}/complete`);
    return response.data;
}

export async function deleteTask(residenceId: string, taskId: string): Promise<void> {
    await api.delete(`${residenceTasksPath(residenceId)}/${taskId}`);
}
