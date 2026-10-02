import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const { ForgotPasswordForm } = vi.hoisted(() => ({
    ForgotPasswordForm: vi.fn(() => <div>Forgot password mock</div>),
}));
vi.mock("@/features/auth/components/ForgotPasswordForm", () => ({
    default: ForgotPasswordForm,
}));
import ForgotPasswordPage from "../page";
describe("ForgotPasswordPage", () => {
    it("renders the password recovery form", () => {
        render(<ForgotPasswordPage />);
        expect(screen.getByText("Forgot password mock")).toBeInTheDocument();
        expect(ForgotPasswordForm).toHaveBeenCalled();
    });
});
