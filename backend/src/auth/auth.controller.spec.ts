import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

describe("AuthController", () => {
    const result = { access_token: "token", user: { id: "u1" } };
    let auth: any;
    let controller: AuthController;
    let response: any;

    beforeEach(() => {
        auth = {
            register: vi.fn().mockResolvedValue(result),
            login: vi.fn().mockResolvedValue(result),
            forgotPassword: vi.fn().mockResolvedValue({ message: "ok" }),
            verifyResetCode: vi.fn().mockResolvedValue({ valid: true }),
            resetPassword: vi.fn().mockResolvedValue({ message: "ok" }),
        };
        controller = new AuthController(auth as AuthService);
        response = { cookie: vi.fn(), clearCookie: vi.fn() };
    });

    it("returns the authenticated user", () =>
        expect(controller.me({ id: "u1" })).toEqual({ id: "u1" }));

    it("registers and sets an http-only access cookie", async () => {
        await expect(
            controller.register({ email: "a@example.com" } as any, response)
        ).resolves.toEqual({ user: result.user });
        expect(auth.register).toHaveBeenCalled();
        expect(response.cookie).toHaveBeenCalledWith("access_token", "token", {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
        });
    });

    it("sets a one day login cookie by default", async () => {
        await expect(
            controller.login({ email: "a@example.com", rememberMe: false } as any, response)
        ).resolves.toEqual({ user: result.user });
        expect(response.cookie).toHaveBeenCalledWith("access_token", "token", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 86_400_000,
        });
    });

    it("sets a thirty day cookie when rememberMe is enabled", async () => {
        await controller.login({ email: "a@example.com", rememberMe: true } as any, response);
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
        await controller.forgotPassword({ email: "a@example.com" } as any);
        await controller.verifyResetCode({ email: "a@example.com", code: "123456" } as any);
        const dto = { email: "a@example.com", code: "123456", password: "new" };
        await controller.resetPassword(dto as any);
        expect(auth.forgotPassword).toHaveBeenCalledWith("a@example.com");
        expect(auth.verifyResetCode).toHaveBeenCalledWith("a@example.com", "123456");
        expect(auth.resetPassword).toHaveBeenCalledWith(dto);
    });

    it("does not set the cookie when authentication service rejects", async () => {
        auth.login.mockRejectedValue(new Error("unauthorized"));
        await expect(controller.login({ email: "a@example.com" } as any, response)).rejects.toThrow(
            "unauthorized"
        );
        expect(response.cookie).not.toHaveBeenCalled();
    });
});
