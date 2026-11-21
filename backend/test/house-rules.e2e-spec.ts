import { ForbiddenException, INestApplication, NotFoundException } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types.js";
import { HouseRulesController } from "../src/house-rules/house-rules.controller.js";
import { HouseRulesService } from "../src/house-rules/house-rules.service.js";
import { createAuthenticatedTestApp } from "./utils/authenticated-test-app.js";

const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";
const HOME_ID = "4ca328bc-3d0c-4ce7-a26a-e827684cc634";
const RULE_ID = "bc3c5c4b-3f52-4faf-9341-2370fcde6cee";

describe("House rules HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authenticatedCookie: () => Promise<string>;
    const service = { findAll: vi.fn(), create: vi.fn(), update: vi.fn() };

    beforeEach(async () => {
        vi.resetAllMocks();
        service.findAll.mockResolvedValue([]);
        service.create.mockResolvedValue({ id: RULE_ID, title: "Silêncio" });
        service.update.mockResolvedValue({ id: RULE_ID, title: "Silêncio atualizado" });
        const testApp = await createAuthenticatedTestApp({
            controllers: [HouseRulesController],
            providers: [{ provide: HouseRulesService, useValue: service }],
        });
        app = testApp.app;
        authenticatedCookie = () =>
            testApp.authenticatedCookie({ id: USER_ID, email: "resident@example.com" });
    });

    it("requires authentication and lists current residence rules", async () => {
        await request(app.getHttpServer()).get(`/residences/${HOME_ID}/rules`).expect(401);
        await request(app.getHttpServer())
            .get(`/residences/${HOME_ID}/rules`)
            .set("Cookie", await authenticatedCookie())
            .expect(200);
        expect(service.findAll).toHaveBeenCalledWith(HOME_ID, USER_ID);
    });

    it("rejects non-members and unavailable rule edits", async () => {
        service.findAll.mockRejectedValueOnce(new ForbiddenException());
        await request(app.getHttpServer())
            .get(`/residences/${HOME_ID}/rules`)
            .set("Cookie", await authenticatedCookie())
            .expect(403);
        service.update.mockRejectedValueOnce(new NotFoundException());
        await request(app.getHttpServer())
            .patch(`/residences/${HOME_ID}/rules/${RULE_ID}`)
            .set("Cookie", await authenticatedCookie())
            .send({ title: "x", description: "y" })
            .expect(404);
    });

    it("validates required title and description and creates authored rules", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post(`/residences/${HOME_ID}/rules`)
            .set("Cookie", cookie)
            .send({ title: " ", description: "ok" })
            .expect(400);
        await request(app.getHttpServer())
            .post(`/residences/${HOME_ID}/rules`)
            .set("Cookie", cookie)
            .send({ title: "Silêncio", description: "Após 22h" })
            .expect(201);
        expect(service.create).toHaveBeenCalledWith(
            HOME_ID,
            { title: "Silêncio", description: "Após 22h" },
            USER_ID
        );
    });

});
