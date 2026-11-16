import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomsRepository } from "./rooms.repository.js";

describe("RoomsRepository room-interest decisions", () => {
    const transaction = {
        $queryRaw: vi.fn(),
        interesse_anuncio: {
            findUniqueOrThrow: vi.fn(),
            update: vi.fn(),
        },
        negociacao_anuncio: { upsert: vi.fn() },
        notificacao: { create: vi.fn() },
        convite_casa: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        participacao: {
            findFirst: vi.fn(),
            create: vi.fn(),
            findUniqueOrThrow: vi.fn(),
        },
    };
    const prisma = {
        $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
            callback(transaction)
        ),
    };
    const repository = new RoomsRepository(prisma as never);

    beforeEach(() => {
        vi.clearAllMocks();
        transaction.$queryRaw.mockResolvedValue([{ id: "interest-1" }]);
        transaction.interesse_anuncio.findUniqueOrThrow.mockResolvedValue({
            id: "interest-1",
            usuario_id: "seeker-1",
            anuncio_quarto: { casa_id: "house-1" },
        });
        transaction.interesse_anuncio.update.mockResolvedValue({});
        transaction.negociacao_anuncio.upsert.mockResolvedValue({ id: "negotiation-1" });
        transaction.notificacao.create.mockResolvedValue({});
        transaction.convite_casa.findFirst.mockResolvedValue(null);
        transaction.convite_casa.findUnique.mockResolvedValue({
            id: "invitation-1",
            casa_id: "house-1",
            negociacao_anuncio_id: "negotiation-1",
            usuario_convidado_id: "seeker-1",
            convidado_por_participacao_id: "manager-member-1",
            status: "PENDENTE",
            expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        transaction.convite_casa.create.mockResolvedValue({
            id: "invitation-1",
            status: "PENDENTE",
            expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        transaction.convite_casa.update.mockResolvedValue({});
        transaction.convite_casa.updateMany.mockResolvedValue({ count: 0 });
        transaction.participacao.findFirst.mockResolvedValue(null);
        transaction.participacao.create.mockResolvedValue({ id: "membership-1" });
        transaction.participacao.findUniqueOrThrow.mockResolvedValue({ usuario_id: "owner-1" });
    });

    it("creates a single negotiation and acceptance notification in the decision transaction", async () => {
        await expect(
            repository.decideInterest("listing-1", "interest-1", "ACEITO")
        ).resolves.toEqual({ status: "ACEITO", negotiationId: "negotiation-1" });

        expect(transaction.negociacao_anuncio.upsert).toHaveBeenCalledOnce();
        expect(transaction.notificacao.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    usuario_id: "seeker-1",
                    casa_id: "house-1",
                    entidade_tipo: "NEGOCIACAO_QUARTO",
                    entidade_id: "negotiation-1",
                }),
            })
        );
    });

    it("declines an interest without creating a negotiation or notification", async () => {
        await expect(
            repository.decideInterest("listing-1", "interest-1", "RECUSADO")
        ).resolves.toEqual({ status: "RECUSADO", negotiationId: null });

        expect(transaction.negociacao_anuncio.upsert).not.toHaveBeenCalled();
        expect(transaction.notificacao.create).not.toHaveBeenCalled();
    });

    it("rejects a repeated decision after the first transaction consumes the pending interest", async () => {
        transaction.$queryRaw
            .mockResolvedValueOnce([{ id: "interest-1" }])
            .mockResolvedValueOnce([]);

        await repository.decideInterest("listing-1", "interest-1", "ACEITO");
        await expect(
            repository.decideInterest("listing-1", "interest-1", "ACEITO")
        ).rejects.toBeInstanceOf(NotFoundException);

        expect(transaction.negociacao_anuncio.upsert).toHaveBeenCalledOnce();
    });

    it("propagates notification failures so the database transaction can roll back acceptance", async () => {
        transaction.notificacao.create.mockRejectedValue(new Error("notification insert failed"));

        await expect(
            repository.decideInterest("listing-1", "interest-1", "ACEITO")
        ).rejects.toThrow("notification insert failed");
    });

    it("creates a seven-day invitation for the exact accepted-interest participant", async () => {
        transaction.$queryRaw.mockResolvedValue([{ casa_id: "house-1" }]);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await repository.createNegotiationInvitation(
            "negotiation-1",
            "seeker-1",
            "manager-member-1",
            expiresAt
        );

        expect(transaction.convite_casa.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    casa_id: "house-1",
                    negociacao_anuncio_id: "negotiation-1",
                    usuario_convidado_id: "seeker-1",
                    convidado_por_participacao_id: "manager-member-1",
                    expira_em: expiresAt,
                }),
            })
        );
        expect(transaction.notificacao.create).toHaveBeenCalled();
    });

    it("accepts a pending invite and creates an active member in one transaction", async () => {
        transaction.$queryRaw.mockResolvedValue([{ id: "invitation-1" }]);

        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "ACEITO")
        ).resolves.toEqual({
            id: "invitation-1",
            status: "ACEITO",
            membershipId: "membership-1",
        });

        expect(transaction.participacao.create).toHaveBeenCalledWith({
            data: {
                casa_id: "house-1",
                usuario_id: "seeker-1",
                papel: "MORADOR",
                convite_id: "invitation-1",
            },
            select: { id: true },
        });
        expect(transaction.convite_casa.update).toHaveBeenCalledWith({
            where: { id: "invitation-1" },
            data: { status: "ACEITO" },
        });
    });

    it("declines an invite without creating a membership", async () => {
        transaction.$queryRaw.mockResolvedValue([{ id: "invitation-1" }]);

        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "RECUSADO")
        ).resolves.toMatchObject({ status: "RECUSADO", membershipId: null });

        expect(transaction.participacao.create).not.toHaveBeenCalled();
        expect(transaction.convite_casa.update).toHaveBeenCalledWith({
            where: { id: "invitation-1" },
            data: { status: "RECUSADO" },
        });
    });

    it("rejects invitation responses from a different user without changing state", async () => {
        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "other-user", "ACEITO")
        ).rejects.toThrow("Somente a pessoa convidada pode responder.");
        expect(transaction.$queryRaw).not.toHaveBeenCalled();
        expect(transaction.participacao.create).not.toHaveBeenCalled();
    });

    it("expires a stale pending invite without creating membership", async () => {
        transaction.convite_casa.findUnique.mockResolvedValue({
            id: "invitation-1",
            casa_id: "house-1",
            negociacao_anuncio_id: "negotiation-1",
            usuario_convidado_id: "seeker-1",
            convidado_por_participacao_id: "manager-member-1",
            status: "PENDENTE",
            expira_em: new Date(Date.now() - 1),
        });
        transaction.$queryRaw.mockResolvedValue([{ id: "invitation-1" }]);

        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "ACEITO")
        ).resolves.toMatchObject({ status: "EXPIRADO", membershipId: null });
        expect(transaction.participacao.create).not.toHaveBeenCalled();
    });

    it("allows only one of two concurrent responses to activate membership", async () => {
        transaction.$queryRaw
            .mockResolvedValueOnce([{ id: "invitation-1" }])
            .mockResolvedValueOnce([]);

        await repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "ACEITO");
        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "ACEITO")
        ).rejects.toThrow("Este convite já foi respondido.");

        expect(transaction.participacao.create).toHaveBeenCalledOnce();
    });
});
