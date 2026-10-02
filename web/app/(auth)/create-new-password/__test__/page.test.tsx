import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const { CreateNewPasswordForm } = vi.hoisted(() => ({
    CreateNewPasswordForm: vi.fn(() => <div>Create password mock</div>),
}));
vi.mock("@/features/auth/components/CreateNewPasswordForm", () => ({
    default: CreateNewPasswordForm,
}));
import CreateNewPasswordPage from "../page";
describe("CreateNewPasswordPage", () => {
    it("renders the new password form", () => {
        render(<CreateNewPasswordPage />);
        expect(screen.getByText("Create password mock")).toBeInTheDocument();
        expect(CreateNewPasswordForm).toHaveBeenCalled();
    });
});
