import { ForbiddenException, INestApplication, NotFoundException } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types.js";
import { of } from "rxjs";
import { ChatController } from "../src/chat/chat.controller.js";
import { ChatService } from "../src/chat/chat.service.js";
import { createAuthenticatedTestApp } from "./utils/authenticated-test-app.js";

const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";
const HOME_ID = "4ca328bc-3d0c-4ce7-a26a-e827684cc634";
const MESSAGE_ID = "bc3c5c4b-3f52-4faf-9341-2370fcde6cee";

describe("Residence chat HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authenticatedCookie: () => Promise<string>;
    const chatService = {
        getConversation: vi.fn(),
        getMessages: vi.fn(),
        send: vi.fn(),
        stream: vi.fn(),
        isActiveMember: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        chatService.getConversation.mockResolvedValue({
            id: MESSAGE_ID,
            residenceId: HOME_ID,
            messages: [],
        });
        chatService.getMessages.mockResolvedValue([]);
        chatService.send.mockResolvedValue({ id: MESSAGE_ID, content: "Oi" });
        chatService.stream.mockResolvedValue({
            memberId: "member-1",
            messages$: of({ id: MESSAGE_ID, content: "Oi" }),
        });
        chatService.isActiveMember.mockResolvedValue(true);
        const testApp = await createAuthenticatedTestApp({
            controllers: [ChatController],
            providers: [{ provide: ChatService, useValue: chatService }],
        });
        app = testApp.app;
        authenticatedCookie = () =>
            testApp.authenticatedCookie({ id: USER_ID, email: "resident@example.com" });
    });

    it("requires authentication and returns the residence conversation to an authenticated member", async () => {
        await request(app.getHttpServer()).get(`/residences/${HOME_ID}/chat`).expect(401);
        await request(app.getHttpServer())
            .get(`/residences/${HOME_ID}/chat`)
            .set("Cookie", await authenticatedCookie())
            .expect(200);
        expect(chatService.getConversation).toHaveBeenCalledWith(HOME_ID, USER_ID);
    });

    it("returns authorization and not-found failures without chat content", async () => {
        chatService.getConversation.mockRejectedValueOnce(new ForbiddenException());
        await request(app.getHttpServer())
            .get(`/residences/${HOME_ID}/chat`)
            .set("Cookie", await authenticatedCookie())
            .expect(403);
        chatService.getConversation.mockRejectedValueOnce(new NotFoundException());
        await request(app.getHttpServer())
            .get(`/residences/${HOME_ID}/chat`)
            .set("Cookie", await authenticatedCookie())
            .expect(404);
    });

    it("rejects empty and unexpected send payloads", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .get(`/residences/${HOME_ID}/chat/messages?afterId=invalid`)
            .set("Cookie", cookie)
            .expect(400);
        await request(app.getHttpServer())
            .post(`/residences/${HOME_ID}/chat/messages`)
            .set("Cookie", cookie)
            .send({ content: "  " })
            .expect(400);
        await request(app.getHttpServer())
            .post(`/residences/${HOME_ID}/chat/messages`)
            .set("Cookie", cookie)
            .send({ content: "Oi", authorId: USER_ID })
            .expect(400);
        expect(chatService.send).not.toHaveBeenCalled();
    });

    it("sends messages with authenticated identity and exposes the live stream", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post(`/residences/${HOME_ID}/chat/messages`)
            .set("Cookie", cookie)
            .send({ content: "Oi" })
            .expect(201);
        expect(chatService.send).toHaveBeenCalledWith(HOME_ID, USER_ID, "Oi");
        await request(app.getHttpServer())
            .get(`/residences/${HOME_ID}/chat/stream`)
            .set("Cookie", cookie)
            .expect(200);
    });

});
