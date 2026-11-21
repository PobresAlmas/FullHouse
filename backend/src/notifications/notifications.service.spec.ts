import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsService } from "./notifications.service.js";

describe("NotificationsService", () => {
    const repository = { listForUser: vi.fn(), markRead: vi.fn() };
    const service = new NotificationsService(repository as never);

    beforeEach(() => vi.clearAllMocks());

    it("returns an invitation action only while the addressed invite is pending and unexpired", async () => {
        repository.listForUser.mockResolvedValue({
            items: [
                {
                    id: "notification-1",
                    titulo: "Convite",
                    mensagem: "Aceite ou recuse.",
                    lida: false,
                    criado_em: new Date("2026-11-09T12:00:00.000Z"),
                    entidade_tipo: "CONVITE_CASA",
                    entidade_id: "invitation-1",
                    invitation: {
                        id: "invitation-1",
                        usuario_convidado_id: "user-1",
                        status: "PENDENTE",
                        expira_em: new Date(Date.now() + 60_000),
                        negociacao_anuncio_id: "negotiation-1",
                    },
                },
            ],
            unreadCount: 3,
            nextCursor: "next-page",
        });

        const { items, unreadCount, nextCursor } = await service.list("user-1", 20);

        expect(items[0]).toMatchObject({
            negotiationId: "negotiation-1",
            convite: { id: "invitation-1", status: "PENDENTE", podeResponder: true },
        });
        expect(unreadCount).toBe(3);
        expect(nextCursor).toBe("next-page");
        expect(repository.listForUser).toHaveBeenCalledWith("user-1", 20, undefined);
    });

    it("delegates read marking with the authenticated user identity", async () => {
        repository.markRead.mockResolvedValue({ id: "notification-1", lida: true });

        await expect(service.markRead("notification-1", "user-1")).resolves.toEqual({
            id: "notification-1",
            lida: true,
        });
        expect(repository.markRead).toHaveBeenCalledWith("notification-1", "user-1");
    });

    it("keeps invitation actions unavailable to the house inviter", async () => {
        repository.listForUser.mockResolvedValue({
            items: [
                {
                    id: "notification-2",
                    titulo: "Convite aceito",
                    mensagem: "A pessoa entrou na casa.",
                    lida: false,
                    criado_em: new Date(),
                    entidade_tipo: "CONVITE_CASA",
                    entidade_id: "invitation-1",
                    invitation: {
                        id: "invitation-1",
                        usuario_convidado_id: "seeker-1",
                        status: "ACEITO",
                        expira_em: new Date(Date.now() + 60_000),
                        negociacao_anuncio_id: "negotiation-1",
                    },
                },
            ],
            unreadCount: 1,
            nextCursor: null,
        });

        const { items } = await service.list("owner-1", 20);

        expect(items[0].negotiationId).toBe("negotiation-1");
        expect(items[0].convite?.podeResponder).toBe(false);
    });
});
