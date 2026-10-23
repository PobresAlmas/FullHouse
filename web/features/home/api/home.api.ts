import { api } from "@/services/api";

export interface PersonalHomeTask {
    id: string;
    title: string;
    dueAt: string;
    status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "ATRASADA" | "CANCELADA";
    completedAt: string | null;
}

export interface PersonalHomeExpense {
    id: string;
    description: string;
    amount: string;
    dueAt: string | null;
    paymentStatus: "PENDING" | "PAID" | "CANCELLED";
    paidAt: string | null;
}

export interface PersonalHomeData {
    tasks: PersonalHomeTask[];
    expenses: PersonalHomeExpense[];
    errors?: { tasks?: string; expenses?: string };
}

export async function getPersonalHome(): Promise<PersonalHomeData> {
    const response = await api.get<PersonalHomeData>("/home/personal");
    return response.data;
}
