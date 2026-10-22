import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import cookieParser from "cookie-parser";
import request from "supertest";
import { App } from "supertest/types.js";
import { JwtStrategy } from "../src/auth/jwt.strategy.js";
import { TasksController } from "../src/tasks/tasks.controller.js";
import { TasksService } from "../src/tasks/tasks.service.js";

const JWT_SECRET = "tasks-e2e-test-secret";
const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";
const RESIDENCE_ID = "4ca328bc-3d0c-4ce7-a26a-e827684cc634";
const TASK_ID = "bc3c5c4b-3f52-4faf-9341-2370fcde6cee";

describe("Tasks HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let jwt: JwtService;
    const tasksService = {
        findMembers: vi.fn(),
        findAll: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        complete: vi.fn(),
        remove: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        tasksService.findMembers.mockResolvedValue([
            { id: "member-id", name: "Morador", role: "MORADOR" },
        ]);
        tasksService.findAll.mockResolvedValue([]);
        tasksService.findOne.mockResolvedValue({ id: TASK_ID, title: "Limpar cozinha" });
        tasksService.create.mockResolvedValue({ id: TASK_ID, title: "Limpar cozinha" });
        tasksService.update.mockResolvedValue({ id: TASK_ID, title: "Limpar cozinha" });
        tasksService.complete.mockResolvedValue({ id: TASK_ID, status: "CONCLUIDA" });
        tasksService.remove.mockResolvedValue({ id: TASK_ID, deleted: true });

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                PassportModule,
                JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: "5m" } }),
            ],
            controllers: [TasksController],
            providers: [
                JwtStrategy,
                { provide: ConfigService, useValue: { getOrThrow: () => JWT_SECRET } },
                { provide: TasksService, useValue: tasksService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.listen(0, "127.0.0.1");
        jwt = app.get(JwtService);
    });

    async function authenticatedCookie() {
        const token = await jwt.signAsync({ sub: USER_ID, email: "resident@example.com" });
        return `access_token=${token}`;
    }

    it("requires authentication to access household tasks", async () => {
        await request(app.getHttpServer()).get(`/residences/${RESIDENCE_ID}/tasks`).expect(401);
    });

    it("lists tasks using validated filters", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .get(`/residences/${RESIDENCE_ID}/tasks?search=%20cozinha%20&status=PENDENTE`)
            .set("Cookie", cookie)
            .expect(200)
            .expect([]);
        expect(tasksService.findAll).toHaveBeenCalledWith(RESIDENCE_ID, USER_ID, {
            search: "cozinha",
            status: "PENDENTE",
        });
    });

    it("creates a task with recurrence, assignee, tags, and reminder data", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/tasks`)
            .set("Cookie", cookie)
            .send({
                title: "  Limpar cozinha  ",
                description: "Limpar bancada e pia",
                tags: ["cozinha"],
                dueAt: "2026-10-13T18:00:00.000Z",
                repeats: true,
                periodicity: "SEMANAL",
                reminderMinutesBefore: 30,
                unexpected: "ignored",
            })
            .expect(201)
            .expect({ id: TASK_ID, title: "Limpar cozinha" });
        expect(tasksService.create).toHaveBeenCalledWith(
            RESIDENCE_ID,
            {
                title: "Limpar cozinha",
                description: "Limpar bancada e pia",
                tags: ["cozinha"],
                dueAt: "2026-10-13T18:00:00.000Z",
                repeats: true,
                periodicity: "SEMANAL",
                reminderMinutesBefore: 30,
            },
            USER_ID
        );
    });

    it("updates, completes, and deletes a task using task scoped routes", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/tasks/${TASK_ID}`)
            .set("Cookie", cookie)
            .send({ title: "Varrer cozinha" })
            .expect(200);
        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/tasks/${TASK_ID}/complete`)
            .set("Cookie", cookie)
            .expect(200)
            .expect({ id: TASK_ID, status: "CONCLUIDA" });
        await request(app.getHttpServer())
            .delete(`/residences/${RESIDENCE_ID}/tasks/${TASK_ID}`)
            .set("Cookie", cookie)
            .expect(200)
            .expect({ id: TASK_ID, deleted: true });
        expect(tasksService.update).toHaveBeenCalledWith(
            RESIDENCE_ID,
            TASK_ID,
            { title: "Varrer cozinha" },
            USER_ID
        );
        expect(tasksService.complete).toHaveBeenCalledWith(RESIDENCE_ID, TASK_ID, USER_ID);
        expect(tasksService.remove).toHaveBeenCalledWith(RESIDENCE_ID, TASK_ID, USER_ID);
    });

    it("rejects invalid task data and UUIDs", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/tasks`)
            .set("Cookie", cookie)
            .send({ title: "", dueAt: "not-a-date" })
            .expect(400);
        await request(app.getHttpServer())
            .get("/residences/not-a-uuid/tasks")
            .set("Cookie", cookie)
            .expect(400);
        expect(tasksService.create).not.toHaveBeenCalled();
    });

    afterEach(async () => {
        await app.close();
    });
});
