import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import cookieParser from "cookie-parser";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types.js";
import { JwtStrategy } from "../src/auth/jwt.strategy.js";
import { ExpensesController } from "../src/expenses/expenses.controller.js";
import { ExpensesService } from "../src/expenses/expenses.service.js";

const JWT_SECRET = "expenses-e2e-secret";
const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";
const EXPENSE_ID = "bc3c5c4b-3f52-4faf-9341-2370fcde6cee";
const payload = {
    description: "Conta de energia",
    amount: "119.87",
    date: "2026-10-11",
    subgroupId: null,
    paymentStatus: "PENDING",
};
const expense = {
    id: EXPENSE_ID,
    description: "Conta de energia",
    amount: "119.87",
    date: "2026-10-11",
    subgroup: null,
    paymentStatus: "PENDING",
    paidBy: null,
    paidAt: null,
};

describe("Expenses HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let jwt: JwtService;
    const expensesService = {
        findAvailableHomes: vi.fn(),
        findAvailableSubgroups: vi.fn(),
        findAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        expensesService.findAvailableHomes.mockResolvedValue([{ id: "home-id", name: "Grifinória" }]);
        expensesService.findAvailableSubgroups.mockResolvedValue([]);
        expensesService.findAll.mockResolvedValue([expense]);
        expensesService.create.mockResolvedValue(expense);
        expensesService.update.mockResolvedValue({ ...expense, paymentStatus: "PAID" });
        expensesService.remove.mockResolvedValue({ id: EXPENSE_ID, deleted: true });

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                PassportModule,
                JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: "5m" } }),
            ],
            controllers: [ExpensesController],
            providers: [
                JwtStrategy,
                { provide: ConfigService, useValue: { getOrThrow: () => JWT_SECRET } },
                { provide: ExpensesService, useValue: expensesService },
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

    it("requires authentication", async () => {
        await request(app.getHttpServer()).get("/expenses").expect(401);
        await request(app.getHttpServer()).post("/expenses").send(payload).expect(401);
        await request(app.getHttpServer()).put(`/expenses/${EXPENSE_ID}`).send(payload).expect(401);
        await request(app.getHttpServer()).delete(`/expenses/${EXPENSE_ID}`).expect(401);
    });

    it("lists expenses and applies the paid or pending filter", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .get("/expenses?paymentStatus=PENDING")
            .set("Cookie", cookie)
            .expect(200)
            .expect([expense]);
        expect(expensesService.findAll).toHaveBeenCalledWith(USER_ID, "PENDING");

        await request(app.getHttpServer())
            .get("/expenses?paymentStatus=INVALID")
            .set("Cookie", cookie)
            .expect(400);
    });

    it("creates, updates, and deletes an expense through authenticated routes", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post("/expenses")
            .set("Cookie", cookie)
            .send(payload)
            .expect(201)
            .expect(expense);
        expect(expensesService.create).toHaveBeenCalledWith(payload, USER_ID);

        await request(app.getHttpServer())
            .put(`/expenses/${EXPENSE_ID}`)
            .set("Cookie", cookie)
            .send({ ...payload, paymentStatus: "PAID" })
            .expect(200)
            .expect({ ...expense, paymentStatus: "PAID" });
        expect(expensesService.update).toHaveBeenCalledWith(
            EXPENSE_ID,
            { ...payload, paymentStatus: "PAID" },
            USER_ID,
        );

        await request(app.getHttpServer())
            .delete(`/expenses/${EXPENSE_ID}`)
            .set("Cookie", cookie)
            .expect(200)
            .expect({ id: EXPENSE_ID, deleted: true });
        expect(expensesService.remove).toHaveBeenCalledWith(EXPENSE_ID, USER_ID);
    });

    it.each(["0", "-1"])("rejects the non-positive amount %s with HTTP 400", async (amount) => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post("/expenses")
            .set("Cookie", cookie)
            .send({ ...payload, amount })
            .expect(400);
        expect(expensesService.create).not.toHaveBeenCalled();
    });

    it("returns HTTP 400 for missing required fields", async () => {
        const cookie = await authenticatedCookie();
        for (const invalidPayload of [
            { ...payload, description: "" },
            { ...payload, amount: undefined },
            { ...payload, date: undefined },
            { ...payload, paymentStatus: undefined },
        ]) {
            await request(app.getHttpServer())
                .post("/expenses")
                .set("Cookie", cookie)
                .send(invalidPayload)
                .expect(400);
        }
    });

    it("rejects a calendar date that does not exist", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post("/expenses")
            .set("Cookie", cookie)
            .send({ ...payload, date: "2026-02-31" })
            .expect(400);
        expect(expensesService.create).not.toHaveBeenCalled();
    });

    it("preserves HTTP 403 and 404 responses from the service", async () => {
        const cookie = await authenticatedCookie();
        expensesService.create.mockRejectedValueOnce(new ForbiddenException());
        await request(app.getHttpServer())
            .post("/expenses")
            .set("Cookie", cookie)
            .send(payload)
            .expect(403);

        expensesService.update.mockRejectedValueOnce(new NotFoundException());
        await request(app.getHttpServer())
            .put(`/expenses/${EXPENSE_ID}`)
            .set("Cookie", cookie)
            .send(payload)
            .expect(404);
    });

    afterEach(async () => {
        await app.close();
    });
});
