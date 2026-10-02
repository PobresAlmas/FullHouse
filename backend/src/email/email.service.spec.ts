import { EmailService } from "./email.service.js";

describe("EmailService", () => {
    let service: EmailService;
    let send: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        process.env.RESEND_API_KEY ??= "re_test_key";
        service = new EmailService();
        send = vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null });
        (service as { resend: { emails: { send: typeof send } } }).resend.emails.send = send;
    });

    it("sends a password reset email containing the recipient and code", async () => {
        await service.sendResetPasswordEmail("a@example.com", "123456");
        expect(send).toHaveBeenCalledOnce();
        const payload = send.mock.calls[0][0];
        expect(payload).toMatchObject({
            from: "FullHouse <onboarding@resend.dev>",
            to: "a@example.com",
            subject: "Código para redefinir sua senha",
        });
        expect(payload.html).toContain("123456");
        expect(payload.html).toContain("15 minutos");
    });

    it("propagates provider errors", async () => {
        send.mockRejectedValue(new Error("resend unavailable"));
        await expect(service.sendResetPasswordEmail("a@example.com", "123456")).rejects.toThrow(
            "resend unavailable"
        );
    });
});
