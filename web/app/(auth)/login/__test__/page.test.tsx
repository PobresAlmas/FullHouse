import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const { LoginForm } = vi.hoisted(() => ({
    LoginForm: vi.fn(() => <div>Login form mock</div>),
}));
vi.mock("@/features/auth/components/LoginForm", () => ({ default: LoginForm }));
import LoginPage from "../page";
describe("LoginPage", () => {
    it("renders the login form", () => {
        render(<LoginPage />);
        expect(screen.getByText("Login form mock")).toBeInTheDocument();
        expect(LoginForm).toHaveBeenCalled();
    });
});
