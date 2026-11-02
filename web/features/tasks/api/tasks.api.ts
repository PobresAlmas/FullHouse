import { api } from "@/services/api";
import type { Residence } from "@/features/residences/api/residences.api";

export type TaskPeriodicity = "DIARIA" | "SEMANAL" | "QUINZENAL" | "MENSAL" | "PERSONALIZADA";

export type TaskStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "ATRASADA" | "CANCELADA";
export type TaskAssignmentType = "FIXA" | "RODIZIO";
export type TaskVisibility = "PUBLICA" | "PRIVADA";
export type TaskScope = "CASA" | "INDIVIDUAL";

export interface TaskMember {
    id: string;
    name: string;
    role: "LIDER" | "ADMINISTRADOR" | "MORADOR";
}

export type TaskResidence = Residence;

export interface Task {
    id: string;
    definitionId: string;
    title: string;
    description: string | null;
    tags: string[];
    color: string | null;
    visibility?: TaskVisibility;
    scope?: TaskScope;
    assignmentType: TaskAssignmentType;
    rotationMemberIds: string[];
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
    assignmentType?: TaskAssignmentType;
    assigneeIds?: string[];
    color?: string | null;
    visibility?: TaskVisibility;
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

export async function getPersonalTasks(): Promise<Task[]> {
    const response = await api.get<Task[]>("/tasks/personal");
    return response.data;
}

export async function createPersonalTask(data: TaskInput): Promise<Task> {
    const response = await api.post<Task>("/tasks/personal", data);
    return response.data;
}

export async function updatePersonalTask(taskId: string, data: Partial<TaskInput>): Promise<Task> {
    const response = await api.patch<Task>(`/tasks/personal/${taskId}`, data);
    return response.data;
}

export async function completePersonalTask(taskId: string): Promise<Task> {
    const response = await api.patch<Task>(`/tasks/personal/${taskId}/complete`);
    return response.data;
}

export async function deletePersonalTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/personal/${taskId}`);
}

export interface TaskExchangeRequest {
    id: string;
    status: "PENDENTE" | "ACEITA" | "RECUSADA" | "EXPIRADA" | "CANCELADA";
    type: "PONTUAL" | "PERMANENTE";
    incoming: boolean;
    requester: string;
    recipient: string;
    task: { id: string; title: string; dueAt: string };
    targetTask: { id: string; title: string; dueAt: string } | null;
}

export async function getTaskExchangeRequests(residenceId: string): Promise<TaskExchangeRequest[]> {
    const response = await api.get<TaskExchangeRequest[]>(
        `/residences/${residenceId}/task-exchange-requests`
    );
    return response.data;
}

export async function createTaskExchangeRequest(
    residenceId: string,
    taskId: string,
    recipientMemberId: string,
    targetTaskId?: string
): Promise<void> {
    await api.post(`/residences/${residenceId}/task-exchange-requests`, {
        taskId,
        recipientMemberId,
        ...(targetTaskId ? { targetTaskId } : {}),
    });
}

export async function respondToTaskExchange(
    residenceId: string,
    requestId: string,
    status: "ACEITA" | "RECUSADA",
    targetTaskId?: string
): Promise<void> {
    await api.patch(`/residences/${residenceId}/task-exchange-requests/${requestId}`, {
        status,
        ...(targetTaskId ? { targetTaskId } : {}),
    });
}
