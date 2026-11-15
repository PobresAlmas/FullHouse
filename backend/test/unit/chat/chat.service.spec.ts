import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatRepository } from "../../../src/chat/chat.repository.js";
import { ChatService } from "../../../src/chat/chat.service.js";
import { ResidenceAccessService } from "../../../src/residences/residence-access.service.js";

describe("ChatService", () => {
    const residenceId = "00000000-0000-4000-8000-000000000001";
    const userId = "00000000-0000-4000-8000-000000000002";
    const memberId = "00000000-0000-4000-8000-000000000003";
    const conversation = { id: "00000000-0000-4000-8000-000000000004" };
    const message = {
        id: "00000000-0000-4000-8000-000000000005",
        conteudo: "Oi",
        enviada_em: new Date("2026-01-01T12:00:00Z"),
        participacao: { id: memberId, usuario: { nome: "Iago", apelido: null } },
    };
    let repository: {
        getOrCreateResidenceConversation: ReturnType<typeof vi.fn>;
        findMessages: ReturnType<typeof vi.fn>;
        createMessage: ReturnType<typeof vi.fn>;
    };
    let access: {
        requireMembership: ReturnType<typeof vi.fn>;
        requireActiveMember: ReturnType<typeof vi.fn>;
    };
    let service: ChatService;

    beforeEach(() => {
        repository = {
            getOrCreateResidenceConversation: vi.fn().mockResolvedValue(conversation),
            findMessages: vi.fn().mockResolvedValue([message]),
            createMessage: vi.fn().mockResolvedValue(message),
        };
        access = {
            requireMembership: vi.fn().mockResolvedValue({ residenceId, memberId }),
            requireActiveMember: vi.fn().mockResolvedValue({ id: memberId }),
        };
        service = new ChatService(
            repository as unknown as ChatRepository,
            access as unknown as ResidenceAccessService
        );
    });

    it("returns chronological conversation history for the requested home", async () => {
        const result = await service.getConversation(residenceId, userId);
        expect(access.requireMembership).toHaveBeenCalledWith(residenceId, userId);
        expect(repository.getOrCreateResidenceConversation).toHaveBeenCalledWith(residenceId);
        expect(result.messages[0]).toMatchObject({
            id: message.id,
            content: "Oi",
            author: { memberId, name: "Iago" },
        });
    });

    it("does not expose a different residence when membership is missing", async () => {
        access.requireMembership.mockRejectedValue(new NotFoundException());
        await expect(service.getConversation(residenceId, userId)).rejects.toThrow(
            NotFoundException
        );
        expect(repository.findMessages).not.toHaveBeenCalled();
    });

    it("rejects whitespace-only messages without persisting", async () => {
        await expect(service.send(residenceId, userId, "   ")).rejects.toThrow(BadRequestException);
        expect(repository.createMessage).not.toHaveBeenCalled();
    });

    it("attributes a message to the authenticated active participation", async () => {
        const result = await service.send(residenceId, userId, "  Oi  ");
        expect(repository.createMessage).toHaveBeenCalledWith(conversation.id, memberId, "Oi");
        expect(result.author.memberId).toBe(memberId);
        expect(result.sentAt).toEqual(message.enviada_em);
    });

    it("delivers only to subscribers of the same residence conversation", async () => {
        const received: unknown[] = [];
        const receivedFromOtherResidence: unknown[] = [];
        const stream = await service.stream(residenceId, userId);
        const subscription = stream.messages$.subscribe((value) => received.push(value));
        repository.getOrCreateResidenceConversation.mockResolvedValueOnce({
            id: "00000000-0000-4000-8000-000000000099",
        });
        const otherStream = await service.stream("00000000-0000-4000-8000-000000000098", userId);
        const otherSubscription = otherStream.messages$.subscribe((value) =>
            receivedFromOtherResidence.push(value)
        );
        await service.send(residenceId, userId, "Nova mensagem");
        expect(received).toHaveLength(1);
        expect(receivedFromOtherResidence).toHaveLength(0);
        expect(received[0]).toMatchObject({ id: message.id });
        subscription.unsubscribe();
        otherSubscription.unsubscribe();
    });

    it("reports revoked membership for stream access checks", async () => {
        access.requireActiveMember.mockResolvedValue(null);
        await expect(service.isActiveMember(residenceId, memberId)).resolves.toBe(false);
    });
});
