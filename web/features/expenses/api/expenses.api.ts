import { api } from "@/services/api";

export interface ExpenseSubgroup {
    id: string;
    name: string;
    homeId: string;
    homeName: string;
    members: string[];
}

export interface ExpenseHome { id: string; name: string; }

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
}

export interface CreateExpenseInput {
    description: string;
    amount: string;
    date: string;
    subgroupId?: string | null;
    paymentStatus: "PENDING" | "PAID";
}

export async function getExpenseSubgroups(): Promise<ExpenseSubgroup[]> {
    const response = await api.get<ExpenseSubgroup[]>("/expenses/subgroups");
    return response.data;
}

export async function getExpenseHomes(): Promise<ExpenseHome[]> {
    const response = await api.get<ExpenseHome[]>("/expenses/homes");
    return response.data;
}

export async function getExpenses(): Promise<Expense[]> {
    const response = await api.get<Expense[]>("/expenses");
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
