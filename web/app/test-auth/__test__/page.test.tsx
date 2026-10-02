import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
const { logout, useAuth } = vi.hoisted(() => ({
    logout: vi.fn(),
    useAuth: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth }));
import TestAuthPage from "../page";

describe("TestAuthPage", () => {
    it("shows email and invokes logout", async () => {
        const user = userEvent.setup();
        useAuth.mockReturnValue({ user: { email: "guest@example.com" }, logout });
        render(<TestAuthPage />);
        expect(screen.getByText("guest@example.com")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Sair" }));
        expect(logout).toHaveBeenCalledOnce();
    });
});
