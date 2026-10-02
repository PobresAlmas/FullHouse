import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const { RegisterForm } = vi.hoisted(() => ({
    RegisterForm: vi.fn(() => <div>Register form mock</div>),
}));
vi.mock("@/features/auth/components/RegisterForm", () => ({
    default: RegisterForm,
}));
import RegisterPage from "../page";
describe("RegisterPage", () => {
    it("renders the registration form", () => {
        render(<RegisterPage />);
        expect(screen.getByText("Register form mock")).toBeInTheDocument();
        expect(RegisterForm).toHaveBeenCalled();
    });
});
