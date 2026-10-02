import { beforeEach, describe, expect, it, vi } from "vitest";
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/services/api", () => ({ api: { get, post } }));
import {
    forgotPassword,
    getMe,
    login,
    logout,
    register,
    resetPassword,
    verifyResetCode,
} from "../auth.api";

describe("auth API", () => {
    beforeEach(() => vi.clearAllMocks());

    it("posts login credentials and returns response data", async () => {
        post.mockResolvedValue({ data: { access_token: "token" } });
        await expect(login({ email: "user@example.com", password: "password" })).resolves.toEqual({
            access_token: "token",
        });
        expect(post).toHaveBeenCalledWith("/auth/login", {
            email: "user@example.com",
            password: "password",
        });
    });

    it("gets the current user", async () => {
        get.mockResolvedValue({ data: { id: "1" } });
        await expect(getMe()).resolves.toEqual({ id: "1" });
        expect(get).toHaveBeenCalledWith("/auth/me");
    });

    it("posts logout", async () => {
        post.mockResolvedValue({});
        await expect(logout()).resolves.toBeUndefined();
        expect(post).toHaveBeenCalledWith("/auth/logout");
    });

    it("posts registration data and returns response data", async () => {
        const data = {
            name: "Maria",
            nickname: "Mari",
            email: "maria@example.com",
            password: "password",
        };
        post.mockResolvedValue({ data: { id: "1" } });
        await expect(register(data)).resolves.toEqual({ id: "1" });
        expect(post).toHaveBeenCalledWith("/auth/register", data);
    });

    it("requests a reset code", async () => {
        post.mockResolvedValue({ data: { ok: true } });
        await expect(forgotPassword("user@example.com")).resolves.toEqual({
            ok: true,
        });
        expect(post).toHaveBeenCalledWith("/auth/forgot-password", {
            email: "user@example.com",
        });
    });

    it("verifies a reset code", async () => {
        post.mockResolvedValue({ data: { valid: true } });
        await expect(verifyResetCode("user@example.com", "123456")).resolves.toEqual({
            valid: true,
        });
        expect(post).toHaveBeenCalledWith("/auth/verify-reset-code", {
            email: "user@example.com",
            code: "123456",
        });
    });

    it("resets a password", async () => {
        const data = {
            email: "user@example.com",
            code: "123456",
            password: "password",
        };
        post.mockResolvedValue({ data: { ok: true } });
        await expect(resetPassword(data)).resolves.toEqual({ ok: true });
        expect(post).toHaveBeenCalledWith("/auth/reset-password", data);
    });
});
