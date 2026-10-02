import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { push, forgotPassword } = vi.hoisted(() => ({
    push: vi.fn(),
    forgotPassword: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/auth/api/auth.api", () => ({ forgotPassword }));
import ForgotPasswordForm from "../ForgotPasswordForm";

describe("ForgotPasswordForm", () => {
    beforeEach(() => vi.clearAllMocks());

    it("renders instructions and login link", () => {
        render(<ForgotPasswordForm />);
        expect(screen.getByText("Esqueceu sua senha?")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Voltar para o login/ })).toHaveAttribute(
            "href",
            "/login"
        );
    });

    it("requests a code and routes to email verification", async () => {
        const user = userEvent.setup();
        forgotPassword.mockResolvedValue({});
        render(<ForgotPasswordForm />);
        await user.type(screen.getByLabelText("E-mail"), "user@example.com");
        await user.click(screen.getByRole("button", { name: "Enviar código" }));
        await waitFor(() => expect(forgotPassword).toHaveBeenCalledWith("user@example.com"));
        expect(push).toHaveBeenCalledWith("/verify-email?email=user@example.com");
    });

    it("does not submit an invalid email", async () => {
        const user = userEvent.setup();
        render(<ForgotPasswordForm />);
        await user.type(screen.getByLabelText("E-mail"), "not-an-email");
        await user.click(screen.getByRole("button", { name: "Enviar código" }));
        expect(forgotPassword).not.toHaveBeenCalled();
        expect(push).not.toHaveBeenCalled();
    });
});
