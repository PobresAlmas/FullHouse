import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { AuthController } from "../src/auth/auth.controller.js";
import { AuthService } from "../src/auth/auth.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

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

        const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(AuthService)
            .useValue(authService)
            .overrideProvider(PrismaService)
            .useValue({ $connect: vi.fn(), $disconnect: vi.fn() })
            .compile();

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

describe("Authentication account lockout HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    const account = {
        id: "821f394d-6215-48b4-89a9-0af953ba8a76",
        email: "resident@example.com",
        nome: "Resident",
        apelido: null,
        codigo_pessoal: "ABC123",
        foto_url: null,
        status_moradia: "PROCURANDO",
        senha_hash: "password-hash",
        falhas_login: 0,
        login_bloqueado_ate: null as Date | null,
    };
    const usersService = {
        findByEmail: vi.fn(),
        recordFailedLogin: vi.fn(),
        clearLoginFailures: vi.fn(),
        clearExpiredLoginLock: vi.fn(),
    };
    const passwordService = { compare: vi.fn() };
    const passwordResetService = {
        create: vi.fn(),
        verify: vi.fn(),
        consumeAndUpdatePassword: vi.fn(),
    };
    const jwtService = { sign: vi.fn().mockReturnValue("test-token") };

    beforeEach(async () => {
        vi.resetAllMocks();
        account.falhas_login = 0;
        account.login_bloqueado_ate = null;
        usersService.findByEmail.mockImplementation(async () => account);
        usersService.recordFailedLogin.mockImplementation(async () => {
            account.falhas_login += 1;
            if (account.falhas_login >= 5) {
                account.login_bloqueado_ate = new Date(Date.now() + 15 * 60 * 1000);
            }
        });
        usersService.clearLoginFailures.mockImplementation(async () => {
            account.falhas_login = 0;
            account.login_bloqueado_ate = null;
        });
        usersService.clearExpiredLoginLock.mockImplementation(async () => {
            account.falhas_login = 0;
            account.login_bloqueado_ate = null;
            return { count: 1 };
        });
        passwordService.compare.mockResolvedValue(false);

        const authService = new AuthService(
            usersService as never,
            passwordService as never,
            passwordResetService as never,
            jwtService as never
        );
        const moduleFixture = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [{ provide: AuthService, useValue: authService }],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true }));
        await app.init();
    });

    it("locks the account for 15 minutes after five consecutive wrong passwords", async () => {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            await request(app.getHttpServer())
                .post("/auth/login")
                .send({ email: account.email, password: "wrong-password" })
                .expect(401)
                .expect({
                    message: "E-mail ou senha inválidos.",
                    error: "Unauthorized",
                    statusCode: 401,
                });
        }

        passwordService.compare.mockResolvedValue(true);
        await request(app.getHttpServer())
            .post("/auth/login")
            .send({ email: account.email, password: "correct-password" })
            .expect(401)
            .expect({
                message: "E-mail ou senha inválidos.",
                error: "Unauthorized",
                statusCode: 401,
            });

        expect(usersService.recordFailedLogin).toHaveBeenCalledTimes(5);
        expect(passwordService.compare).toHaveBeenCalledTimes(5);
        expect(usersService.clearLoginFailures).not.toHaveBeenCalled();
        expect(account.login_bloqueado_ate!.getTime()).toBeGreaterThan(Date.now());
    });

    afterEach(async () => {
        await app.close();
    });
});

describe("Authentication account routes HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    const user = {
        id: "821f394d-6215-48b4-89a9-0af953ba8a76",
        email: "resident@example.com",
        name: "Resident",
    };
    const authService = {
        register: vi.fn(),
        forgotPassword: vi.fn(),
        verifyResetCode: vi.fn(),
        resetPassword: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        authService.register.mockResolvedValue({ access_token: "register-token", user });
        authService.forgotPassword.mockResolvedValue({
            message: "Se o email existir, enviaremos um código.",
        });
        authService.verifyResetCode.mockResolvedValue({ valid: true });
        authService.resetPassword.mockResolvedValue({ message: "Senha alterada com sucesso." });

        const moduleFixture = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [{ provide: AuthService, useValue: authService }],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();
    });

    it("registers an account, returns the public user, and sets an HTTP-only cookie", async () => {
        const response = await request(app.getHttpServer())
            .post("/auth/register")
            .send({
                name: "  Resident  ",
                nickname: "  R  ",
                email: " resident@example.com ",
                password: "strong-pass-123",
            })
            .expect(201)
            .expect({ user });

        expect(authService.register).toHaveBeenCalledWith({
            name: "Resident",
            nickname: "R",
            email: "resident@example.com",
            password: "strong-pass-123",
        });
        expect(response.headers["set-cookie"]).toEqual(
            expect.arrayContaining([
                expect.stringContaining("access_token=register-token"),
                expect.stringContaining("HttpOnly"),
            ])
        );
    });

    it("clears the authentication cookie on logout", async () => {
        const response = await request(app.getHttpServer()).post("/auth/logout").expect(201);

        expect(response.body).toEqual({ message: "Logout realizado" });
        expect(response.headers["set-cookie"]).toEqual(
            expect.arrayContaining([expect.stringMatching(/^access_token=;/)])
        );
    });

    it("routes forgot-password, code verification, and password reset requests", async () => {
        await request(app.getHttpServer())
            .post("/auth/forgot-password")
            .send({ email: "resident@example.com" })
            .expect(201)
            .expect({ message: "Se o email existir, enviaremos um código." });
        await request(app.getHttpServer())
            .post("/auth/verify-reset-code")
            .send({ email: "resident@example.com", code: "123456" })
            .expect(201)
            .expect({ valid: true });
        await request(app.getHttpServer())
            .post("/auth/reset-password")
            .send({ email: "resident@example.com", code: "123456", password: "new-pass-123" })
            .expect(201)
            .expect({ message: "Senha alterada com sucesso." });

        expect(authService.forgotPassword).toHaveBeenCalledWith("resident@example.com");
        expect(authService.verifyResetCode).toHaveBeenCalledWith("resident@example.com", "123456");
        expect(authService.resetPassword).toHaveBeenCalledWith({
            email: "resident@example.com",
            code: "123456",
            password: "new-pass-123",
        });
    });

    it("rejects invalid recovery payloads before calling the service", async () => {
        await request(app.getHttpServer())
            .post("/auth/forgot-password")
            .send({ email: "not-an-email" })
            .expect(400);
        await request(app.getHttpServer())
            .post("/auth/verify-reset-code")
            .send({ email: "resident@example.com", code: "123" })
            .expect(400);
        await request(app.getHttpServer())
            .post("/auth/reset-password")
            .send({ email: "resident@example.com", code: "123456", password: "short" })
            .expect(400);

        expect(authService.forgotPassword).not.toHaveBeenCalled();
        expect(authService.verifyResetCode).not.toHaveBeenCalled();
        expect(authService.resetPassword).not.toHaveBeenCalled();
    });

    afterEach(async () => {
        await app.close();
    });
});
