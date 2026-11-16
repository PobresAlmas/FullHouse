import { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { NotificationsController } from "../src/notifications/notifications.controller.js";
import { NotificationsService } from "../src/notifications/notifications.service.js";
import { createAuthenticatedTestApp } from "./utils/authenticated-test-app.js";

const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";

describe("Notifications HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authenticatedCookie: () => Promise<string>;
    const service = { list: vi.fn(), markRead: vi.fn() };

    beforeEach(async () => {
        vi.resetAllMocks();
        service.list.mockResolvedValue([]);
        service.markRead.mockResolvedValue({ id: "notification-1", lida: true });
        const testApp = await createAuthenticatedTestApp({
            controllers: [NotificationsController],
            providers: [{ provide: NotificationsService, useValue: service }],
        });
        app = testApp.app;
        authenticatedCookie = () =>
            testApp.authenticatedCookie({ id: USER_ID, email: "resident@example.com" });
    });

    it("requires authentication and lists only for the session identity", async () => {
        await request(app.getHttpServer()).get("/notifications").expect(401);
        await request(app.getHttpServer())
            .get("/notifications")
            .set("Cookie", await authenticatedCookie())
            .expect(200)
            .expect([]);
        expect(service.list).toHaveBeenCalledWith(USER_ID);
    });

    it("marks a notification read using the authenticated identity", async () => {
        const notificationId = "d8957f13-2e5e-45c1-8c22-194b4f610f43";
        await request(app.getHttpServer())
            .patch(`/notifications/${notificationId}/read`)
            .set("Cookie", await authenticatedCookie())
            .expect(200)
            .expect({ id: "notification-1", lida: true });
        expect(service.markRead).toHaveBeenCalledWith(notificationId, USER_ID);
    });
});
