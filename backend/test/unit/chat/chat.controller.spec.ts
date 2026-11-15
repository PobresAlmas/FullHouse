import { ForbiddenException } from "@nestjs/common";
import { Subject } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatController } from "../../../src/chat/chat.controller.js";
import { ChatService } from "../../../src/chat/chat.service.js";
import type { ChatMessage } from "../../../src/chat/chat.service.js";

describe("ChatController SSE", () => {
    const residenceId = "00000000-0000-4000-8000-000000000001";
    const user = { id: "00000000-0000-4000-8000-000000000002" };
    let chat: { stream: ReturnType<typeof vi.fn>; isActiveMember: ReturnType<typeof vi.fn> };
    let controller: ChatController;

    beforeEach(() => {
        vi.useRealTimers();
        chat = {
            stream: vi.fn().mockResolvedValue({ memberId: "member-1", messages$: new Subject() }),
            isActiveMember: vi.fn().mockResolvedValue(true),
        };
        controller = new ChatController(chat as unknown as ChatService);
    });

    it("authenticates stream membership before opening the live channel", async () => {
        chat.stream.mockRejectedValue(new ForbiddenException());
        await expect(controller.stream(residenceId, user)).rejects.toThrow(ForbiddenException);
    });

    it("completes the stream after the member's access is revoked", async () => {
        vi.useFakeTimers();
        chat.isActiveMember.mockResolvedValue(false);
        const events = await controller.stream(residenceId, user);
        const subscription = events.subscribe();
        await vi.advanceTimersByTimeAsync(15_000);
        expect(subscription.closed).toBe(true);
        vi.useRealTimers();
    });

    it("does not deliver an event after authorization is revoked", async () => {
        const messages = new Subject<ChatMessage>();
        chat.stream.mockResolvedValue({ memberId: "member-1", messages$: messages });
        chat.isActiveMember.mockResolvedValue(false);
        const events = await controller.stream(residenceId, user);
        const next = vi.fn();
        const complete = new Promise<void>((resolve) =>
            events.subscribe({ next, complete: resolve })
        );
        messages.next({
            id: "00000000-0000-4000-8000-000000000003",
            content: "secret",
            sentAt: new Date(),
            author: { memberId: "member-1", name: "Resident" },
        });
        await complete;
        expect(next).not.toHaveBeenCalled();
    });
});
