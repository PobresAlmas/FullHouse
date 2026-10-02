import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, refreshUser, post, onPhotoChange } = vi.hoisted(() => ({
    push: vi.fn(),
    refreshUser: vi.fn(),
    post: vi.fn(),
    onPhotoChange: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
    useAuth: () => ({ refreshUser }),
}));
vi.mock("@/services/api", () => ({ api: { post } }));
vi.mock("@/features/auth/components/AuthFormLayout", () => ({
    default: ({ children, onSubmit }: { children: React.ReactNode; onSubmit: () => void }) => (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            {children}
        </form>
    ),
}));
vi.mock("@/features/auth/components/PhotoUpload", () => ({
    default: ({ onChange }: { onChange: (file: File) => void }) => (
        <button
            type="button"
            onClick={() => {
                const file = new File(["photo"], "avatar.png", { type: "image/png" });
                onPhotoChange(file);
                onChange(file);
            }}
        >
            Select photo
        </button>
    ),
}));
vi.mock("@/features/auth/components/SubmitButton", () => ({
    default: ({ text }: { text: string }) => <button type="submit">{text}</button>,
}));
import UploadPhotoPage from "../page";

describe("UploadPhotoPage", () => {
    beforeEach(() => vi.clearAllMocks());

    it("uploads a selected photo, refreshes the user, and navigates", async () => {
        const user = userEvent.setup();
        post.mockResolvedValue({});
        render(<UploadPhotoPage />);
        await user.click(screen.getByRole("button", { name: "Select photo" }));
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await waitFor(() =>
            expect(post).toHaveBeenCalledWith("/users/me/avatar", expect.any(FormData))
        );
        expect(refreshUser).toHaveBeenCalledOnce();
        expect(push).toHaveBeenCalledWith("/test-private");
    });

    it("does not upload when no photo is selected", async () => {
        const user = userEvent.setup();
        const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
        render(<UploadPhotoPage />);
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        expect(log).toHaveBeenCalledWith("sem foto");
        expect(post).not.toHaveBeenCalled();
        log.mockRestore();
    });

    it("allows the user to skip photo upload", async () => {
        const user = userEvent.setup();
        render(<UploadPhotoPage />);
        await user.click(screen.getByRole("button", { name: "Pular por enquanto" }));
        expect(push).toHaveBeenCalledWith("/test-private");
        expect(post).not.toHaveBeenCalled();
    });
});
