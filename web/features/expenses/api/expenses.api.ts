import { api } from "@/services/api";

export interface ExpenseSubgroup {
    id: string;
    name: string;
    homeId: string;
    homeName: string;
    members: string[];
    memberIds?: string[];
    memberDetails?: { id: string; name: string }[];
    canEdit?: boolean;
}

export interface ExpenseHome {
    id: string;
    name: string;
}

export interface ExpenseHomeMember {
    id: string;
    name: string;
}

export interface ExpenseAllocation {
    participationId: string;
    memberName: string;
    amount: string;
}

export interface ExpenseAllocationInput {
    participationId: string;
    amount: string;
}

export interface CreateExpenseSubgroupInput {
    homeId: string;
    name: string;
    memberIds: string[];
}

export interface Expense {
    id: string;
    description: string;
    amount: string;
    date: string | null;
    homeId?: string;
    homeName?: string;
    subgroup: { id: string; nome: string } | null;
    paymentStatus: "PENDING" | "PAID" | "CANCELLED";
    paidBy: string | null;
    paidAt: string | null;
    scope?: "HOME" | "PERSONAL";
    sourceLabel?: string;
    totalAmount?: string;
    canEdit?: boolean;
    reminder?: { id: string; message: string; remindAt: string } | null;
    allocations?: ExpenseAllocation[];
    allocationStrategy?: "IGUALITARIO" | "PERSONALIZADO";
    proofs?: { id: string; url: string; type: "IMAGEM" | "PDF" }[];
}

export interface ExpenseReminderInput {
    remindAt: string;
    message?: string;
    enabled: boolean;
}

export interface ExpenseReminder {
    id: string;
    message: string;
    remindAt: string;
    enabled: boolean;
}

export interface ExpenseProof {
    id: string;
    url: string;
    type: "IMAGEM" | "PDF";
}

export type ExpenseScope = "HOME" | "PERSONAL";

export interface CreateExpenseInput {
    description: string;
    amount: string;
    date: string;
    paymentDate?: string | null;
    homeId?: string;
    subgroupId?: string | null;
    paymentStatus: "PENDING" | "PAID";
    scope?: ExpenseScope;
    allocations?: ExpenseAllocationInput[];
}

export async function getExpenseSubgroups(): Promise<ExpenseSubgroup[]> {
    const response = await api.get<ExpenseSubgroup[]>("/expenses/subgroups");
    return response.data;
}

export async function getAllExpenseSubgroups(): Promise<ExpenseSubgroup[]> {
    const response = await api.get<ExpenseSubgroup[]>("/expenses/subgroups/all");
    return response.data;
}

export async function getExpenseHomes(): Promise<ExpenseHome[]> {
    const response = await api.get<ExpenseHome[]>("/expenses/homes");
    return response.data;
}

export async function getExpenseHomeMembers(homeId: string): Promise<ExpenseHomeMember[]> {
    const response = await api.get<ExpenseHomeMember[]>(`/expenses/homes/${homeId}/members`);
    return response.data;
}

export async function createExpenseSubgroup(
    data: CreateExpenseSubgroupInput
): Promise<ExpenseSubgroup> {
    const response = await api.post<ExpenseSubgroup>("/expenses/subgroups", data);
    return response.data;
}

export async function updateExpenseSubgroup(
    id: string,
    data: CreateExpenseSubgroupInput
): Promise<ExpenseSubgroup> {
    const response = await api.put<ExpenseSubgroup>(`/expenses/subgroups/${id}`, data);
    return response.data;
}

export async function getExpenses(scope: ExpenseScope = "HOME"): Promise<Expense[]> {
    const response = await api.get<Expense[]>("/expenses", { params: { scope } });
    return response.data;
}

export async function setExpensePaymentStatus(id: string, paid: boolean) {
    const response = await api.patch<{
        id: string;
        paymentStatus: "PENDING" | "PAID";
        paidAt: string | null;
    }>(`/expenses/${id}/personal-payment`, { paid });
    return response.data;
}

export async function saveExpenseReminder(
    id: string,
    data: ExpenseReminderInput
): Promise<ExpenseReminder | null> {
    const response = await api.post<ExpenseReminder | null>(`/expenses/${id}/reminder`, data);
    return response.data;
}

export async function deleteExpenseReminder(id: string): Promise<void> {
    await api.delete(`/expenses/${id}/reminder`);
}

export async function uploadExpenseProof(id: string, file: File): Promise<ExpenseProof> {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post<ExpenseProof>(`/expenses/${id}/proofs`, form);
    return response.data;
}

export async function createExpense(data: CreateExpenseInput): Promise<Expense> {
    const response = await api.post<Expense>("/expenses", data);
    return response.data;
}

export async function updateExpense(id: string, data: CreateExpenseInput): Promise<Expense> {
    const response = await api.put<Expense>(`/expenses/${id}`, data);
    return response.data;
}

export async function deleteExpense(id: string): Promise<void> {
    await api.delete(`/expenses/${id}`);
}
