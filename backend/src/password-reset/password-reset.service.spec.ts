import { PasswordResetService } from "./password-reset.service.js";

describe("PasswordResetService", () => {
    const reset = { id: "r1" };
    let repository: {
        create: ReturnType<typeof vi.fn>;
        findValid: ReturnType<typeof vi.fn>;
        markUsed: ReturnType<typeof vi.fn>;
    };
    let email: { sendResetPasswordEmail: ReturnType<typeof vi.fn> };
    let service: PasswordResetService;

    beforeEach(() => {
        repository = {
            create: vi.fn().mockResolvedValue(reset),
            findValid: vi.fn().mockResolvedValue(reset),
            markUsed: vi.fn().mockResolvedValue(reset),
        };
        email = { sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined) };
        service = new PasswordResetService(repository as never, email as never);
    });

    it("creates a six-digit code expiring in fifteen minutes and emails it", async () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5);
        const before = Date.now();
        await expect(service.create("u1", "a@example.com")).resolves.toBe(reset);
        const [data] = repository.create.mock.calls[0];
        expect(data).toMatchObject({ usuario_id: "u1", codigo: "550000" });
        expect(data.expira_em.getTime()).toBeGreaterThanOrEqual(before + 15 * 60_000);
        expect(data.expira_em.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60_000);
        expect(email.sendResetPasswordEmail).toHaveBeenCalledWith("a@example.com", data.codigo);
        vi.restoreAllMocks();
    });

    it("does not send email if persistence fails", async () => {
        repository.create.mockRejectedValue(new Error("db error"));
        await expect(service.create("u1", "a@example.com")).rejects.toThrow("db error");
        expect(email.sendResetPasswordEmail).not.toHaveBeenCalled();
    });

    it("propagates email delivery failures after persisting reset", async () => {
        email.sendResetPasswordEmail.mockRejectedValue(new Error("email error"));
        await expect(service.create("u1", "a@example.com")).rejects.toThrow("email error");
        expect(repository.create).toHaveBeenCalledOnce();
    });

    it("delegates verification and consumption", async () => {
        await expect(service.verify("u1", "123456")).resolves.toBe(reset);
        expect(repository.findValid).toHaveBeenCalledWith("u1", "123456");
        await expect(service.consume("r1")).resolves.toBe(reset);
        expect(repository.markUsed).toHaveBeenCalledWith("r1");
    });
});
