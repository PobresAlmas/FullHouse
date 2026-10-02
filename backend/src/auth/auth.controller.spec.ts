import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

describe("AuthController", () => {
    const result = { access_token: "token", user: { id: "u1" } };
    type MockAuthService = {
        register: ReturnType<typeof vi.fn>;
        login: ReturnType<typeof vi.fn>;
        forgotPassword: ReturnType<typeof vi.fn>;
        verifyResetCode: ReturnType<typeof vi.fn>;
        resetPassword: ReturnType<typeof vi.fn>;
    };

    let auth: MockAuthService;
    let controller: AuthController;
    let response: { cookie: ReturnType<typeof vi.fn>; clearCookie: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        auth = {
            register: vi.fn().mockResolvedValue(result),
            login: vi.fn().mockResolvedValue(result),
            forgotPassword: vi.fn().mockResolvedValue({ message: "ok" }),
            verifyResetCode: vi.fn().mockResolvedValue({ valid: true }),
            resetPassword: vi.fn().mockResolvedValue({ message: "ok" }),
        };
        controller = new AuthController(auth as unknown as AuthService);
        response = { cookie: vi.fn(), clearCookie: vi.fn() };
    });

    it("returns the authenticated user", () =>
        expect(controller.me({ id: "u1" })).toEqual({ id: "u1" }));

    it("registers and sets an http-only access cookie", async () => {
        const registerDto = { email: "a@example.com" } as Parameters<AuthService["register"]>[0];
        await expect(controller.register(registerDto, response)).resolves.toEqual({ user: result.user });
        expect(auth.register).toHaveBeenCalled();
        expect(response.cookie).toHaveBeenCalledWith("access_token", "token", {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
        });
    });

    it("sets a one day login cookie by default", async () => {
        const loginDto = { email: "a@example.com", rememberMe: false } as Parameters<
            AuthService["login"]
        >[0];
        await expect(controller.login(loginDto, response)).resolves.toEqual({ user: result.user });
        expect(response.cookie).toHaveBeenCalledWith("access_token", "token", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 86_400_000,
        });
    });

    it("sets a thirty day cookie when rememberMe is enabled", async () => {
        const loginDto = { email: "a@example.com", rememberMe: true } as Parameters<
            AuthService["login"]
        >[0];
        await controller.login(loginDto, response);
        expect(response.cookie).toHaveBeenCalledWith(
            "access_token",
            "token",
            expect.objectContaining({ maxAge: 2_592_000_000 })
        );
    });

    it("accepts string booleans when deciding rememberMe duration", async () => {
        const falseLoginDto = { email: "a@example.com", rememberMe: "false" } as Parameters<
            AuthService["login"]
        >[0];
        await controller.login(falseLoginDto, response);
        expect(response.cookie).toHaveBeenCalledWith(
            "access_token",
            "token",
            expect.objectContaining({ maxAge: 86_400_000 })
        );

        response.cookie.mockClear();

        const trueLoginDto = { email: "a@example.com", rememberMe: "true" } as Parameters<
            AuthService["login"]
        >[0];
        await controller.login(trueLoginDto, response);
        expect(response.cookie).toHaveBeenCalledWith(
            "access_token",
            "token",
            expect.objectContaining({ maxAge: 2_592_000_000 })
        );
    });

    it("clears the cookie on logout", async () => {
        await expect(controller.logout(response)).resolves.toEqual({ message: "Logout realizado" });
        expect(response.clearCookie).toHaveBeenCalledWith("access_token");
    });

    it("delegates password recovery routes with the supplied fields", async () => {
        await controller.forgotPassword({ email: "a@example.com" } as Parameters<
            AuthService["forgotPassword"]
        >[0]);
        await controller.verifyResetCode({ email: "a@example.com", code: "123456" } as Parameters<
            AuthService["verifyResetCode"]
        >[0]);
        const dto = { email: "a@example.com", code: "123456", password: "new" } as Parameters<
            AuthService["resetPassword"]
        >[0];
        await controller.resetPassword(dto);
        expect(auth.forgotPassword).toHaveBeenCalledWith("a@example.com");
        expect(auth.verifyResetCode).toHaveBeenCalledWith("a@example.com", "123456");
        expect(auth.resetPassword).toHaveBeenCalledWith(dto);
    });

    it("does not set the cookie when authentication service rejects", async () => {
        auth.login.mockRejectedValue(new Error("unauthorized"));
        const loginDto = { email: "a@example.com" } as Parameters<AuthService["login"]>[0];
        await expect(controller.login(loginDto, response)).rejects.toThrow("unauthorized");
        expect(response.cookie).not.toHaveBeenCalled();
    });
});
