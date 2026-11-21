import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class NotificationsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async listForUser(userId: string, limit: number, cursor?: string, unreadOnly = false) {
        const cursorNotification = cursor
            ? await this.prisma.notificacao.findFirst({
                  where: { id: cursor, usuario_id: userId },
                  select: { id: true, criado_em: true },
              })
            : null;
        if (cursor && !cursorNotification) {
            throw new BadRequestException("Cursor de notificação inválido.");
        }

        const cursorWhere = cursorNotification
            ? {
                  OR: [
                      { criado_em: { lt: cursorNotification.criado_em } },
                      {
                          criado_em: cursorNotification.criado_em,
                          id: { lt: cursorNotification.id },
                      },
                  ],
              }
            : {};
        const listWhere = {
            usuario_id: userId,
            ...(unreadOnly ? { lida: false } : {}),
            ...cursorWhere,
        };

        const [notifications, unreadCount] = await Promise.all([
            this.prisma.notificacao.findMany({
                where: listWhere,
                orderBy: [{ criado_em: "desc" }, { id: "desc" }],
                take: limit + 1,
            }),
            this.prisma.notificacao.count({
                where: { usuario_id: userId, lida: false },
            }),
        ]);
        const hasMore = notifications.length > limit;
        const pageItems = notifications.slice(0, limit);
        const invitationIds = pageItems
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
            items: pageItems.map((notification) => ({
                ...notification,
                invitation:
                    notification.entidade_tipo === "CONVITE_CASA" && notification.entidade_id
                        ? (invitationsById.get(notification.entidade_id) ?? null)
                        : null,
            })),
            unreadCount,
            nextCursor: hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null,
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
