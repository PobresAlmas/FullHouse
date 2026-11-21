import { Injectable } from "@nestjs/common";
import { NotificationsRepository } from "./notifications.repository.js";

@Injectable()
export class NotificationsService {
    constructor(private readonly repository: NotificationsRepository) {}

    async list(userId: string, limit: number, cursor?: string, unreadOnly = false) {
        const { items, unreadCount, nextCursor } = await this.repository.listForUser(
            userId,
            limit,
            cursor,
            unreadOnly
        );
        const now = Date.now();
        return {
            items: items.map((notification) => ({
                id: notification.id,
                titulo: notification.titulo,
                mensagem: notification.mensagem,
                lida: notification.lida,
                criadoEm: notification.criado_em.toISOString(),
                entidadeTipo: notification.entidade_tipo,
                entidadeId: notification.entidade_id,
                negotiationId:
                    notification.entidade_tipo === "NEGOCIACAO_QUARTO"
                        ? notification.entidade_id
                        : (notification.invitation?.negociacao_anuncio_id ?? null),
                convite: notification.invitation
                    ? {
                          id: notification.invitation.id,
                          status: notification.invitation.status,
                          expiraEm: notification.invitation.expira_em.toISOString(),
                          podeResponder:
                              notification.invitation.usuario_convidado_id === userId &&
                              notification.invitation.status === "PENDENTE" &&
                              notification.invitation.expira_em.getTime() > now,
                      }
                    : null,
            })),
            unreadCount,
            nextCursor,
        };
    }

    markRead(notificationId: string, userId: string) {
        return this.repository.markRead(notificationId, userId);
    }
}
