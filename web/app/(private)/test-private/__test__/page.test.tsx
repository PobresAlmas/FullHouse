import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
const { logout, useAuth } = vi.hoisted(() => ({
    logout: vi.fn(),
    useAuth: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth }));
import TestPrivatePage from "../page";

describe("TestPrivatePage", () => {
    it("shows the current user's email and calls logout", async () => {
        const user = userEvent.setup();
        useAuth.mockReturnValue({ user: { email: "user@example.com" }, logout });
        render(<TestPrivatePage />);
        expect(screen.getByRole("heading", { name: "Área privada" })).toBeInTheDocument();
        expect(screen.getByText("user@example.com")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Sair" }));
        expect(logout).toHaveBeenCalledOnce();
    });

    it("renders without an email while user data is missing", () => {
        useAuth.mockReturnValue({ user: null, logout });
        render(<TestPrivatePage />);
        expect(screen.getByRole("heading", { name: "Área privada" })).toBeInTheDocument();
        expect(screen.queryByText("user@example.com")).not.toBeInTheDocument();
    });
});
