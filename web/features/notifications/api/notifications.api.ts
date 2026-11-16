import { api } from "@/services/api";

export interface AppNotification {
    id: string;
    titulo: string;
    mensagem: string | null;
    lida: boolean;
    criadoEm: string;
    entidadeTipo: string | null;
    entidadeId: string | null;
    negotiationId: string | null;
    convite: {
        id: string;
        status: "PENDENTE" | "ACEITO" | "RECUSADO" | "EXPIRADO" | "CANCELADO";
        expiraEm: string;
        podeResponder: boolean;
    } | null;
}

export interface NotificationsResponse {
    items: AppNotification[];
    unreadCount: number;
}

export async function getNotifications() {
    const response = await api.get<NotificationsResponse>("/notifications");
    return response.data;
}

export async function markNotificationRead(id: string) {
    const response = await api.patch<{ id: string; lida: boolean }>(`/notifications/${id}/read`);
    return response.data;
}
