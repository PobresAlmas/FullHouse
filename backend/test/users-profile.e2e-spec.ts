import { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { UsersController } from "../src/users/users.controller.js";
import { UsersService } from "../src/users/users.service.js";
import { createAuthenticatedTestApp } from "./utils/authenticated-test-app.js";

const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";

describe("User profile HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authenticatedCookie: () => Promise<string>;
    const service = {
        getProfile: vi.fn(),
        updateProfile: vi.fn(),
        updateAvatar: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        service.getProfile.mockResolvedValue({
            id: USER_ID,
            name: "Ana",
            nickname: "Nina",
            email: "ana@example.com",
        });
        service.updateProfile.mockResolvedValue({
            id: USER_ID,
            name: "Ana Silva",
            nickname: "Nina",
            email: "ana@example.com",
        });
        const testApp = await createAuthenticatedTestApp({
            controllers: [UsersController],
            providers: [{ provide: UsersService, useValue: service }],
        });
        app = testApp.app;
        authenticatedCookie = () =>
            testApp.authenticatedCookie({ id: USER_ID, email: "ana@example.com" });
    });

    it("requires authentication and returns the signed-in user's profile", async () => {
        await request(app.getHttpServer()).get("/users/me").expect(401);
        await request(app.getHttpServer())
            .get("/users/me")
            .set("Cookie", await authenticatedCookie())
            .expect(200)
            .expect(({ body }) => {
                expect(body).toMatchObject({ id: USER_ID, email: "ana@example.com" });
            });
        expect(service.getProfile).toHaveBeenCalledWith(USER_ID);
    });

    it("validates and updates only the signed-in user's profile", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .patch("/users/me")
            .set("Cookie", cookie)
            .send({ name: "A" })
            .expect(400);

        await request(app.getHttpServer())
            .patch("/users/me")
            .set("Cookie", cookie)
            .send({ name: "Ana Silva", nickname: " Nina " })
            .expect(200);
        expect(service.updateProfile).toHaveBeenCalledWith(USER_ID, {
            name: "Ana Silva",
            nickname: "Nina",
        });
    });
});
