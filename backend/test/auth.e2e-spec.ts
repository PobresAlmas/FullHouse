import { INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import request from "supertest";
import { App } from "supertest/types.js";
import { AuthController } from "../src/auth/auth.controller.js";
import { AuthService } from "../src/auth/auth.service.js";

describe("Authentication HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authService: { login: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
        authService = {
            login: vi.fn().mockResolvedValue({
                access_token: "test-token",
                user: { id: "user-id" },
            }),
        };

        const moduleFixture = await Test.createTestingModule({
            imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: APP_GUARD, useClass: ThrottlerGuard },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it("blocks login requests after the configured per-minute limit", async () => {
        for (let attempt = 0; attempt < 20; attempt += 1) {
            await request(app.getHttpServer())
                .post("/auth/login")
                .send({ email: "resident@example.com", password: "password" })
                .expect(201);
        }

        await request(app.getHttpServer())
            .post("/auth/login")
            .send({ email: "resident@example.com", password: "password" })
            .expect(429);

        expect(authService.login).toHaveBeenCalledTimes(20);
    });

    afterEach(async () => {
        await app.close();
    });
});
