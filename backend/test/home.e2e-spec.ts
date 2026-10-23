import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types.js";
import { HomeController } from "../src/home/home.controller.js";
import { HomeService } from "../src/home/home.service.js";
import { createAuthenticatedTestApp } from "./utils/authenticated-test-app.js";

const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";

describe("Home HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authenticatedCookie: () => Promise<string>;
    const homeService = { getPersonal: vi.fn() };

    beforeEach(async () => {
        vi.resetAllMocks();
        homeService.getPersonal.mockResolvedValue({
            tasks: [],
            expenses: [],
        });

        const testApp = await createAuthenticatedTestApp({
            controllers: [HomeController],
            providers: [{ provide: HomeService, useValue: homeService }],
        });
        app = testApp.app;
        authenticatedCookie = () =>
            testApp.authenticatedCookie({ id: USER_ID, email: "resident@example.com" });
    });

    it("requires authentication", async () => {
        await request(app.getHttpServer()).get("/home/personal").expect(401);
    });

    it("passes the authenticated user to the personal Home service", async () => {
        await request(app.getHttpServer())
            .get("/home/personal")
            .set("Cookie", await authenticatedCookie())
            .expect(200)
            .expect({ tasks: [], expenses: [] });

        expect(homeService.getPersonal).toHaveBeenCalledWith(USER_ID);
    });

    afterEach(async () => {
        await app.close();
    });
});
