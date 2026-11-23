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
    nextCursor?: string | null;
}

export async function getNotifications(limit = 20, cursor?: string, unreadOnly = false) {
    const response = await api.get<NotificationsResponse>("/notifications", {
        params: {
            limit,
            ...(cursor ? { cursor } : {}),
            ...(unreadOnly ? { unreadOnly: true } : {}),
        },
    });
    return response.data;
}

export function subscribeNotifications(
    onUpdate: (response: NotificationsResponse) => void,
    onError?: (event: Event) => void
) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const source = new EventSource(`${baseUrl}/notifications/stream`, {
        withCredentials: true,
    });
    source.onmessage = (event) => {
        try {
            onUpdate(JSON.parse(event.data) as NotificationsResponse);
        } catch {
            onError?.(event);
        }
    };
    source.onerror = (event) => onError?.(event);
    return () => source.close();
}

export async function markNotificationRead(id: string) {
    const response = await api.patch<{ id: string; lida: boolean }>(`/notifications/${id}/read`);
    return response.data;
}

export async function markAllNotificationsRead() {
    const response = await api.patch<{ updatedCount: number }>("/notifications/read-all");
    return response.data;
}
