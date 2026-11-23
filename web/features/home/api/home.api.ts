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

export interface HouseNotice {
    id: string;
    content: string;
    createdAt: string;
    authorName: string;
    authorId: string;
}

export async function getPersonalHome(): Promise<PersonalHomeData> {
    const response = await api.get<PersonalHomeData>("/home/personal");
    return response.data;
}

export async function getHouseNotices(residenceId: string): Promise<HouseNotice[]> {
    const response = await api.get<HouseNotice[]>(`/home/residences/${residenceId}/notices`);
    return response.data;
}

export async function createHouseNotice(
    residenceId: string,
    content: string
): Promise<HouseNotice> {
    const response = await api.post<HouseNotice>(`/home/residences/${residenceId}/notices`, {
        conteudo: content,
    });
    return response.data;
}

export async function updateHouseNotice(
    residenceId: string,
    noticeId: string,
    content: string
): Promise<HouseNotice> {
    const response = await api.patch<HouseNotice>(
        `/home/residences/${residenceId}/notices/${noticeId}`,
        { conteudo: content }
    );
    return response.data;
}

export async function deleteHouseNotice(residenceId: string, noticeId: string): Promise<void> {
    await api.delete(`/home/residences/${residenceId}/notices/${noticeId}`);
}
