import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsRepository } from "./notifications.repository.js";

describe("NotificationsRepository", () => {
    const prisma = {
        notificacao: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            updateMany: vi.fn(),
        },
        convite_casa: { findMany: vi.fn() },
    };
    const repository = new NotificationsRepository(prisma as never);

    beforeEach(() => {
        vi.clearAllMocks();
        prisma.notificacao.findMany.mockResolvedValue([
            {
                id: "notification-1",
                usuario_id: "user-1",
                entidade_tipo: "CONVITE_CASA",
                entidade_id: "invitation-1",
            },
        ]);
        prisma.notificacao.findFirst.mockResolvedValue({
            id: "cursor-1",
            criado_em: new Date("2026-11-19T12:00:00.000Z"),
        });
        prisma.notificacao.count.mockResolvedValue(1);
        prisma.convite_casa.findMany.mockResolvedValue([
            {
                id: "invitation-1",
                usuario_convidado_id: "user-1",
                status: "PENDENTE",
                expira_em: new Date("2026-11-20T12:00:00.000Z"),
                negociacao_anuncio_id: "negotiation-1",
            },
        ]);
        prisma.notificacao.updateMany.mockResolvedValue({ count: 1 });
    });

    it("scopes notification and invitation records to the authenticated user", async () => {
        const result = await repository.listForUser("user-1", 20);

        expect(prisma.notificacao.findMany).toHaveBeenCalledWith({
            where: { usuario_id: "user-1" },
            orderBy: [{ criado_em: "desc" }, { id: "desc" }],
            take: 21,
        });
        expect(prisma.notificacao.count).toHaveBeenCalledWith({
            where: { usuario_id: "user-1", lida: false },
        });
        expect(prisma.convite_casa.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: { in: ["invitation-1"] },
                },
            })
        );
        expect(result.items[0].invitation?.id).toBe("invitation-1");
        expect(result.unreadCount).toBe(1);
    });

    it("validates the cursor belongs to the authenticated account and applies stable ordering", async () => {
        await repository.listForUser("user-1", 10, "cursor-1");
        expect(prisma.notificacao.findFirst).toHaveBeenCalledWith({
            where: { id: "cursor-1", usuario_id: "user-1" },
            select: { id: true, criado_em: true },
        });

        expect(prisma.notificacao.findMany).toHaveBeenCalledWith({
            where: {
                usuario_id: "user-1",
                OR: [
                    { criado_em: { lt: new Date("2026-11-19T12:00:00.000Z") } },
                    { criado_em: new Date("2026-11-19T12:00:00.000Z"), id: { lt: "cursor-1" } },
                ],
            },
            orderBy: [{ criado_em: "desc" }, { id: "desc" }],
            take: 11,
        });
    });

    it("filters only unread notifications without changing the global unread count", async () => {
        await repository.listForUser("user-1", 10, undefined, true);

        expect(prisma.notificacao.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { usuario_id: "user-1", lida: false },
            })
        );
        expect(prisma.notificacao.count).toHaveBeenCalledWith({
            where: { usuario_id: "user-1", lida: false },
        });
    });

    it("does not allow a user to mark another user's notification as read", async () => {
        prisma.notificacao.updateMany.mockResolvedValue({ count: 0 });

        await expect(repository.markRead("notification-1", "other-user")).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(prisma.notificacao.updateMany).toHaveBeenCalledWith({
            where: { id: "notification-1", usuario_id: "other-user" },
            data: { lida: true },
        });
    });

    it("marks all unread rows for the account in one update and is idempotent", async () => {
        prisma.notificacao.updateMany
            .mockResolvedValueOnce({ count: 26 })
            .mockResolvedValueOnce({ count: 0 });

        await expect(repository.markAllRead("user-1")).resolves.toEqual({ updatedCount: 26 });
        await expect(repository.markAllRead("user-1")).resolves.toEqual({ updatedCount: 0 });
        expect(prisma.notificacao.updateMany).toHaveBeenCalledTimes(2);
        expect(prisma.notificacao.updateMany).toHaveBeenCalledWith({
            where: { usuario_id: "user-1", lida: false },
            data: { lida: true },
        });
        expect(prisma.convite_casa.findMany).not.toHaveBeenCalled();
    });
});
