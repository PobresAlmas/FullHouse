import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatRepository } from "../../../src/chat/chat.repository.js";
import { PrismaService } from "../../../src/prisma/prisma.service.js";

describe("ChatRepository", () => {
    const conversationId = "00000000-0000-4000-8000-000000000001";
    const messageId = "00000000-0000-4000-8000-000000000002";
    let prisma: {
        mensagem: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    };
    let repository: ChatRepository;

    beforeEach(() => {
        prisma = {
            mensagem: {
                findFirst: vi.fn().mockResolvedValue({
                    id: messageId,
                    enviada_em: new Date("2026-01-01T00:00:00Z"),
                }),
                findMany: vi.fn().mockResolvedValue([]),
            },
        };
        repository = new ChatRepository(prisma as PrismaService);
    });

    it("orders history chronologically and uses ID as a stable tie-breaker", async () => {
        await repository.findMessages(conversationId);
        expect(prisma.mensagem.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { conversa_id: conversationId, excluido_em: null },
                orderBy: [{ enviada_em: "asc" }, { id: "asc" }],
            })
        );
    });

    it("loads only records newer than a cursor in the same conversation", async () => {
        await repository.findMessages(conversationId, messageId);
        expect(prisma.mensagem.findFirst).toHaveBeenCalledWith({
            where: { id: messageId, conversa_id: conversationId },
            select: { id: true, enviada_em: true },
        });
        expect(prisma.mensagem.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    conversa_id: conversationId,
                    OR: [
                        { enviada_em: { gt: expect.any(Date) } },
                        { enviada_em: expect.any(Date), id: { gt: messageId } },
                    ],
                }),
            })
        );
    });
});
