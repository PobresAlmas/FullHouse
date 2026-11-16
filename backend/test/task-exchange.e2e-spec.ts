import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types.js";
import { TaskExchangeController } from "../src/tasks/task-exchange.controller.js";
import { TaskExchangeService } from "../src/tasks/task-exchange.service.js";
import { createAuthenticatedTestApp } from "./utils/authenticated-test-app.js";

const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";
const RESIDENCE_ID = "4ca328bc-3d0c-4ce7-a26a-e827684cc634";
const REQUEST_ID = "bc3c5c4b-3f52-4faf-9341-2370fcde6cee";
const TASK_ID = "6f8fa972-a05e-47a9-b48f-f54de5ab3752";
const RECIPIENT_MEMBER_ID = "bd0a2c6c-2436-4cf7-9fe3-61c28ab2b271";

describe("Task exchange HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authenticatedCookie: () => Promise<string>;
    const exchangeService = {
        list: vi.fn(),
        create: vi.fn(),
        respond: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        exchangeService.list.mockResolvedValue([]);
        exchangeService.create.mockResolvedValue({ id: REQUEST_ID, status: "PENDENTE" });
        exchangeService.respond.mockResolvedValue({ id: REQUEST_ID, status: "ACEITA" });

        const testApp = await createAuthenticatedTestApp({
            controllers: [TaskExchangeController],
            providers: [{ provide: TaskExchangeService, useValue: exchangeService }],
        });
        app = testApp.app;
        authenticatedCookie = () =>
            testApp.authenticatedCookie({ id: USER_ID, email: "resident@example.com" });
    });

    it("requires authentication to list task exchange requests", async () => {
        await request(app.getHttpServer())
            .get(`/residences/${RESIDENCE_ID}/task-exchange-requests`)
            .expect(401);
    });

    it("lists requests for the authenticated user and residence", async () => {
        const cookie = await authenticatedCookie();

        await request(app.getHttpServer())
            .get(`/residences/${RESIDENCE_ID}/task-exchange-requests`)
            .set("Cookie", cookie)
            .expect(200)
            .expect([]);

        expect(exchangeService.list).toHaveBeenCalledWith(RESIDENCE_ID, USER_ID);
    });

    it("creates a request with validated task and recipient IDs", async () => {
        const cookie = await authenticatedCookie();

        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/task-exchange-requests`)
            .set("Cookie", cookie)
            .send({ taskId: TASK_ID, recipientMemberId: RECIPIENT_MEMBER_ID })
            .expect(201)
            .expect({ id: REQUEST_ID, status: "PENDENTE" });

        expect(exchangeService.create).toHaveBeenCalledWith(
            RESIDENCE_ID,
            { taskId: TASK_ID, recipientMemberId: RECIPIENT_MEMBER_ID },
            USER_ID
        );
    });

    it("rejects malformed residence, task, recipient, and request IDs", async () => {
        const cookie = await authenticatedCookie();

        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/task-exchange-requests`)
            .set("Cookie", cookie)
            .send({ taskId: "bad-id", recipientMemberId: RECIPIENT_MEMBER_ID })
            .expect(400);
        await request(app.getHttpServer())
            .post("/residences/not-a-uuid/task-exchange-requests")
            .set("Cookie", cookie)
            .send({ taskId: TASK_ID, recipientMemberId: RECIPIENT_MEMBER_ID })
            .expect(400);
        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/task-exchange-requests/not-a-uuid`)
            .set("Cookie", cookie)
            .send({ status: "ACEITA" })
            .expect(400);

        expect(exchangeService.create).not.toHaveBeenCalled();
        expect(exchangeService.respond).not.toHaveBeenCalled();
    });

    it.each([
        ["ACEITA", { status: "ACEITA", targetTaskId: TASK_ID }],
        ["RECUSADA", { status: "RECUSADA" }],
    ] as const)("responds to a request with status %s", async (status, payload) => {
        const cookie = await authenticatedCookie();

        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/task-exchange-requests/${REQUEST_ID}`)
            .set("Cookie", cookie)
            .send(payload)
            .expect(200);

        expect(exchangeService.respond).toHaveBeenCalledWith(
            RESIDENCE_ID,
            REQUEST_ID,
            status,
            status === "ACEITA" ? TASK_ID : undefined,
            USER_ID
        );
    });

    it("rejects unsupported response states", async () => {
        const cookie = await authenticatedCookie();

        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/task-exchange-requests/${REQUEST_ID}`)
            .set("Cookie", cookie)
            .send({ status: "PENDENTE" })
            .expect(400);

        expect(exchangeService.respond).not.toHaveBeenCalled();
    });

    afterEach(async () => {
        await app.close();
    });
});
