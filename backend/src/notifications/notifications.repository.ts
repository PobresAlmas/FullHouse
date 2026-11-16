import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class NotificationsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async listForUser(userId: string) {
        const [notifications, unreadCount] = await Promise.all([
            this.prisma.notificacao.findMany({
                where: { usuario_id: userId },
                orderBy: [{ criado_em: "desc" }, { id: "desc" }],
                take: 4,
            }),
            this.prisma.notificacao.count({
                where: { usuario_id: userId, lida: false },
            }),
        ]);
        const invitationIds = notifications
            .filter(
                (notification) =>
                    notification.entidade_tipo === "CONVITE_CASA" &&
                    notification.entidade_id !== null
            )
            .map((notification) => notification.entidade_id!);
        const invitations = invitationIds.length
            ? await this.prisma.convite_casa.findMany({
                  where: {
                      id: { in: invitationIds },
                  },
                  select: {
                      id: true,
                      usuario_convidado_id: true,
                      status: true,
                      expira_em: true,
                      negociacao_anuncio_id: true,
                  },
              })
            : [];
        const invitationsById = new Map(
            invitations.map((invitation) => [invitation.id, invitation])
        );

        return {
            items: notifications.map((notification) => ({
                ...notification,
                invitation:
                    notification.entidade_tipo === "CONVITE_CASA" && notification.entidade_id
                        ? (invitationsById.get(notification.entidade_id) ?? null)
                        : null,
            })),
            unreadCount,
        };
    }

    async markRead(notificationId: string, userId: string) {
        const result = await this.prisma.notificacao.updateMany({
            where: { id: notificationId, usuario_id: userId },
            data: { lida: true },
        });
        if (!result.count) throw new NotFoundException("Notificação não encontrada.");
        return { id: notificationId, lida: true };
    }
}
