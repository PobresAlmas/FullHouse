import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomsRepository } from "./rooms.repository.js";

describe("RoomsRepository negotiation message pagination", () => {
    const prisma = {
        mensagem_negociacao_anuncio: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
        },
    };
    const repository = new RoomsRepository(prisma as never);
    const negotiationId = "11111111-1111-4111-8111-111111111111";
    const newestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const middleId = "55555555-5555-4555-8555-555555555555";
    const oldestId = "11111111-1111-4111-8111-111111111112";
    const sentAt = new Date("2026-11-09T12:00:00.000Z");
    const message = (id: string) => ({
        id,
        usuario: { id: "user-1", nome: "Pessoa", foto_url: null },
        conteudo: id,
        enviada_em: sentAt,
    });

    beforeEach(() => {
        vi.clearAllMocks();
        prisma.mensagem_negociacao_anuncio.findFirst.mockResolvedValue({ id: middleId });
    });

    it("returns the latest page chronologically and uses message ID to break timestamp ties", async () => {
        prisma.mensagem_negociacao_anuncio.findMany.mockResolvedValue([
            message(newestId),
            message(middleId),
            message(oldestId),
        ]);

        await expect(
            repository.listNegotiationMessages(negotiationId, undefined, 2)
        ).resolves.toEqual({
            data: [message(middleId), message(newestId)],
            hasMore: true,
            nextCursor: middleId,
        });
        expect(prisma.mensagem_negociacao_anuncio.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { negociacao_id: negotiationId },
                orderBy: [{ enviada_em: "desc" }, { id: "desc" }],
                take: 3,
            })
        );
        expect(prisma.mensagem_negociacao_anuncio.findFirst).not.toHaveBeenCalled();
    });

    it("uses the cursor to return an older final page", async () => {
        prisma.mensagem_negociacao_anuncio.findMany.mockResolvedValue([message(oldestId)]);

        await expect(
            repository.listNegotiationMessages(negotiationId, middleId, 2)
        ).resolves.toEqual({
            data: [message(oldestId)],
            hasMore: false,
            nextCursor: null,
        });
        expect(prisma.mensagem_negociacao_anuncio.findFirst).toHaveBeenCalledWith({
            where: { id: middleId, negociacao_id: negotiationId },
            select: { id: true },
        });
        expect(prisma.mensagem_negociacao_anuncio.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                cursor: { id: middleId },
                skip: 1,
                take: 3,
            })
        );
    });

    it("rejects a cursor outside the negotiation and does not query messages", async () => {
        prisma.mensagem_negociacao_anuncio.findFirst.mockResolvedValue(null);

        await expect(
            repository.listNegotiationMessages(negotiationId, middleId, 2)
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.mensagem_negociacao_anuncio.findMany).not.toHaveBeenCalled();
    });

    it("returns an empty page without a cursor when the negotiation has no messages", async () => {
        prisma.mensagem_negociacao_anuncio.findMany.mockResolvedValue([]);

        await expect(
            repository.listNegotiationMessages(negotiationId, undefined, 30)
        ).resolves.toEqual({
            data: [],
            hasMore: false,
            nextCursor: null,
        });
    });
});
