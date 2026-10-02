import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const { VerifyEmailForm } = vi.hoisted(() => ({
    VerifyEmailForm: vi.fn(() => <div>Verify email mock</div>),
}));
vi.mock("@/features/auth/components/VerifyEmailForm", () => ({
    default: VerifyEmailForm,
}));
import VerifyEmailPage from "../page";
describe("VerifyEmailPage", () => {
    it("renders the verification form", () => {
        render(<VerifyEmailPage />);
        expect(screen.getByText("Verify email mock")).toBeInTheDocument();
        expect(VerifyEmailForm).toHaveBeenCalled();
    });
});
