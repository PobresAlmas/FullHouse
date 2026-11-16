import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types.js";
import { PersonalTasksController } from "../src/tasks/personal-tasks.controller.js";
import { TasksService } from "../src/tasks/tasks.service.js";
import { createAuthenticatedTestApp } from "./utils/authenticated-test-app.js";

const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";
const TASK_ID = "bc3c5c4b-3f52-4faf-9341-2370fcde6cee";
const TASK = { id: TASK_ID, title: "Ler um capítulo", scope: "INDIVIDUAL" };

describe("Personal tasks HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authenticatedCookie: () => Promise<string>;
    const tasksService = {
        findPersonal: vi.fn(),
        createPersonal: vi.fn(),
        findPersonalOne: vi.fn(),
        updatePersonal: vi.fn(),
        completePersonal: vi.fn(),
        removePersonal: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        tasksService.findPersonal.mockResolvedValue([TASK]);
        tasksService.createPersonal.mockResolvedValue(TASK);
        tasksService.findPersonalOne.mockResolvedValue(TASK);
        tasksService.updatePersonal.mockResolvedValue({ ...TASK, title: "Ler dois capítulos" });
        tasksService.completePersonal.mockResolvedValue({ ...TASK, status: "CONCLUIDA" });
        tasksService.removePersonal.mockResolvedValue({ id: TASK_ID, deleted: true });

        const testApp = await createAuthenticatedTestApp({
            controllers: [PersonalTasksController],
            providers: [{ provide: TasksService, useValue: tasksService }],
        });
        app = testApp.app;
        authenticatedCookie = () =>
            testApp.authenticatedCookie({
                id: USER_ID,
                email: "resident@example.com",
            });
    });

    it("requires authentication to access personal task routes", async () => {
        await request(app.getHttpServer()).get("/tasks/personal").expect(401);
        await request(app.getHttpServer())
            .post("/tasks/personal")
            .send({ title: "Ler", dueAt: "2026-12-01T19:00:00.000Z" })
            .expect(401);
        expect(tasksService.findPersonal).not.toHaveBeenCalled();
        expect(tasksService.createPersonal).not.toHaveBeenCalled();
    });

    it("lists, creates, updates, completes, and deletes tasks for the authenticated user", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .get("/tasks/personal")
            .set("Cookie", cookie)
            .expect(200)
            .expect([TASK]);
        await request(app.getHttpServer())
            .post("/tasks/personal")
            .set("Cookie", cookie)
            .send({ title: "  Ler um capítulo  ", dueAt: "2026-12-01T19:00:00.000Z" })
            .expect(201)
            .expect(TASK);
        await request(app.getHttpServer())
            .get(`/tasks/personal/${TASK_ID}`)
            .set("Cookie", cookie)
            .expect(200)
            .expect(TASK);
        await request(app.getHttpServer())
            .patch(`/tasks/personal/${TASK_ID}`)
            .set("Cookie", cookie)
            .send({ title: "Ler dois capítulos" })
            .expect(200)
            .expect({ ...TASK, title: "Ler dois capítulos" });
        await request(app.getHttpServer())
            .patch(`/tasks/personal/${TASK_ID}/complete`)
            .set("Cookie", cookie)
            .expect(200)
            .expect({ ...TASK, status: "CONCLUIDA" });
        await request(app.getHttpServer())
            .delete(`/tasks/personal/${TASK_ID}`)
            .set("Cookie", cookie)
            .expect(200)
            .expect({ id: TASK_ID, deleted: true });

        expect(tasksService.findPersonal).toHaveBeenCalledWith(USER_ID);
        expect(tasksService.createPersonal).toHaveBeenCalledWith(
            { title: "Ler um capítulo", dueAt: "2026-12-01T19:00:00.000Z" },
            USER_ID
        );
        expect(tasksService.findPersonalOne).toHaveBeenCalledWith(TASK_ID, USER_ID);
        expect(tasksService.updatePersonal).toHaveBeenCalledWith(
            TASK_ID,
            { title: "Ler dois capítulos" },
            USER_ID
        );
        expect(tasksService.completePersonal).toHaveBeenCalledWith(TASK_ID, USER_ID);
        expect(tasksService.removePersonal).toHaveBeenCalledWith(TASK_ID, USER_ID);
    });

    it("rejects invalid task payloads and task identifiers", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post("/tasks/personal")
            .set("Cookie", cookie)
            .send({ title: "  ", dueAt: "not-a-date" })
            .expect(400);
        await request(app.getHttpServer())
            .get("/tasks/personal/not-a-uuid")
            .set("Cookie", cookie)
            .expect(400);
        expect(tasksService.createPersonal).not.toHaveBeenCalled();
        expect(tasksService.findPersonalOne).not.toHaveBeenCalled();
    });

    afterEach(async () => {
        await app.close();
    });
});
