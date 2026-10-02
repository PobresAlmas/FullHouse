import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service.js";

describe("AuthService", () => {
    type MockUser = {
        id: string;
        email: string;
        nome: string;
        apelido: string | null;
        codigo_pessoal: string;
        foto_url: string | null;
        status_moradia: string;
        senha_hash: string;
    };

    const user: MockUser = {
        id: "u1",
        email: "a@example.com",
        nome: "Ana",
        apelido: null,
        codigo_pessoal: "ABC123",
        foto_url: null,
        status_moradia: "PROCURANDO",
        senha_hash: "hashed",
    };
    let users: {
        create: ReturnType<typeof vi.fn>;
        findByEmail: ReturnType<typeof vi.fn>;
        updatePassword: ReturnType<typeof vi.fn>;
    };
    let passwords: { compare: ReturnType<typeof vi.fn>; hash: ReturnType<typeof vi.fn> };
    let resets: {
        create: ReturnType<typeof vi.fn>;
        verify: ReturnType<typeof vi.fn>;
        consume: ReturnType<typeof vi.fn>;
    };
    let jwt: { sign: ReturnType<typeof vi.fn> };
    let service: AuthService;

    beforeEach(() => {
        users = {
            create: vi.fn().mockResolvedValue(user),
            findByEmail: vi.fn().mockResolvedValue(user),
            updatePassword: vi.fn().mockResolvedValue(undefined),
        };
        passwords = {
            compare: vi.fn().mockResolvedValue(true),
            hash: vi.fn().mockResolvedValue("new-hash"),
        };
        resets = {
            create: vi.fn().mockResolvedValue({ id: "r1" }),
            verify: vi.fn().mockResolvedValue({ id: "r1" }),
            consume: vi.fn().mockResolvedValue(undefined),
        };
        jwt = { sign: vi.fn().mockReturnValue("token") };
        service = new AuthService(users as never, passwords as never, resets as never, jwt as never);
    });

    it("registers, signs a token and returns a public user shape", async () => {
        await expect(
            service.register({
                name: "Ana",
                nickname: "",
                email: user.email,
                password: "secret",
            } as Parameters<AuthService["register"]>[0])
        ).resolves.toEqual({
            access_token: "token",
            user: {
                id: "u1",
                code: "ABC123",
                name: "Ana",
                nickname: undefined,
                email: user.email,
                photo: undefined,
                housingStatus: "PROCURANDO",
            },
        });
        expect(users.create).toHaveBeenCalled();
        expect(jwt.sign).toHaveBeenCalledWith({ sub: user.id, email: user.email });
    });

    it("logs in with valid credentials", async () => {
        await expect(
            service.login(
                { email: user.email, password: "secret" } as Parameters<AuthService["login"]>[0],
                {} as Parameters<AuthService["login"]>[1]
            )
        ).resolves.toMatchObject({ access_token: "token", user: { id: "u1" } });
        expect(passwords.compare).toHaveBeenCalledWith("secret", "hashed");
    });

    it.each([
        ["unknown email", null],
        ["wrong password", user],
    ])("rejects login for %s", async (_reason, found) => {
        users.findByEmail.mockResolvedValue(found);
        passwords.compare.mockResolvedValue(false);
        await expect(
            service.login(
                { email: user.email, password: "bad" } as Parameters<AuthService["login"]>[0],
                {} as Parameters<AuthService["login"]>[1]
            )
        ).rejects.toBeInstanceOf(UnauthorizedException);
        if (!found) expect(passwords.compare).not.toHaveBeenCalled();
    });

    it("keeps forgot-password response identical for an unknown email", async () => {
        users.findByEmail.mockResolvedValue(null);
        await expect(service.forgotPassword("missing@example.com")).resolves.toEqual({
            message: "Se o email existir, enviaremos um código.",
        });
        expect(resets.create).not.toHaveBeenCalled();
    });

    it("creates a reset for an existing account while returning generic response", async () => {
        await expect(service.forgotPassword(user.email)).resolves.toEqual({
            message: "Se o email existir, enviaremos um código.",
        });
        expect(resets.create).toHaveBeenCalledWith(user.id, user.email);
    });

    it("returns invalid for missing users and passes through reset verification", async () => {
        users.findByEmail.mockResolvedValue(null);
        await expect(service.verifyResetCode("missing@example.com", "123456")).resolves.toEqual({
            valid: false,
        });
        expect(resets.verify).not.toHaveBeenCalled();
        users.findByEmail.mockResolvedValue(user);
        resets.verify.mockResolvedValue(null);
        await expect(service.verifyResetCode(user.email, "123456")).resolves.toEqual({
            valid: null,
        });
        expect(resets.verify).toHaveBeenCalledWith(user.id, "123456");
    });

    it("rejects password reset for missing users or invalid codes", async () => {
        users.findByEmail.mockResolvedValue(null);
        await expect(
            service.resetPassword({
                email: user.email,
                code: "bad",
                password: "new",
            } as Parameters<AuthService["resetPassword"]>[0])
        ).rejects.toThrow("Código inválido");
        users.findByEmail.mockResolvedValue(user);
        resets.verify.mockResolvedValue(null);
        await expect(
            service.resetPassword({
                email: user.email,
                code: "bad",
                password: "new",
            } as Parameters<AuthService["resetPassword"]>[0])
        ).rejects.toThrow("Código inválido ou expirado");
        expect(passwords.hash).not.toHaveBeenCalled();
    });

    it("hashes and updates the password before consuming a valid reset", async () => {
        await expect(
            service.resetPassword({
                email: user.email,
                code: "123456",
                password: "new",
            } as Parameters<AuthService["resetPassword"]>[0])
        ).resolves.toEqual({ message: "Senha alterada com sucesso." });
        expect(users.updatePassword).toHaveBeenCalledWith(user.id, "new-hash");
        expect(resets.consume).toHaveBeenCalledWith("r1");
    });

    it("does not consume the code if the password update fails", async () => {
        users.updatePassword.mockRejectedValue(new Error("db error"));
        await expect(
            service.resetPassword({
                email: user.email,
                code: "123456",
                password: "new",
            } as Parameters<AuthService["resetPassword"]>[0])
        ).rejects.toThrow("db error");
        expect(resets.consume).not.toHaveBeenCalled();
    });
});
