import { api } from "@/services/api";

export type ChatMessage = {
    id: string;
    content: string;
    sentAt: string;
    author: { memberId: string; name: string };
};

export async function getChat(residenceId: string) {
    const response = await api.get<{
        id: string;
        residenceId: string;
        lastReadMessageId?: string | null;
        messages: ChatMessage[];
    }>(`/residences/${residenceId}/chat`);
    return response.data;
}

export async function markChatRead(residenceId: string, messageId: string) {
    await api.post(`/residences/${residenceId}/chat/read`, { messageId });
}

export async function getChatMessages(residenceId: string, afterId?: string) {
    const response = await api.get<ChatMessage[]>(`/residences/${residenceId}/chat/messages`, {
        params: afterId ? { afterId } : undefined,
    });
    return response.data;
}

export async function sendChatMessage(residenceId: string, content: string) {
    const response = await api.post<ChatMessage>(`/residences/${residenceId}/chat/messages`, {
        content,
    });
    return response.data;
}

export function createChatEventSource(residenceId: string) {
    return new EventSource(`http://localhost:3000/residences/${residenceId}/chat/stream`, {
        withCredentials: true,
    });
}
