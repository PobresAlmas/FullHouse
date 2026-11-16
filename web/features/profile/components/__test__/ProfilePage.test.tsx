import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "../ProfilePage";
import { updateProfile, uploadProfilePhoto } from "../../api/profile.api";

const authState = vi.hoisted(() => ({
    user: {
        id: "user-1",
        name: "Ana Silva",
        nickname: "Nina",
        email: "ana@example.com",
        photo: undefined as string | undefined,
    },
    loading: false,
    refreshUser: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => authState }));
vi.mock("@/features/residences/api/residences.api", () => ({
    getResidences: vi.fn().mockResolvedValue([]),
    RESIDENCE_MEMBERSHIP_CHANGED_EVENT: "fullhouse:residence-membership-changed",
}));
vi.mock("@/services/api", () => ({
    api: { patch: vi.fn(), post: vi.fn() },
}));
vi.mock("next/image", () => ({
    default: (props: { alt?: string }) => (
        <div data-testid="profile-image" aria-label={props.alt} />
    ),
}));
vi.mock("@/features/profile/api/profile.api", () => ({
    updateProfile: vi.fn(),
    uploadProfilePhoto: vi.fn(),
}));

describe("ProfilePage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("URL", {
            createObjectURL: vi.fn().mockReturnValue("blob:profile-preview"),
            revokeObjectURL: vi.fn(),
        });
        authState.user = {
            id: "user-1",
            name: "Ana Silva",
            nickname: "Nina",
            email: "ana@example.com",
            photo: undefined,
        };
        authState.loading = false;
        vi.mocked(updateProfile).mockResolvedValue({});
        vi.mocked(uploadProfilePhoto).mockResolvedValue({});
    });

    it("links from navigation and renders editable user information", () => {
        render(<ProfilePage />);

        expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute(
            "aria-current",
            "page"
        );
        expect(screen.getByLabelText("Nome")).toHaveValue("Ana Silva");
        expect(screen.getByLabelText("Apelido")).toHaveValue("Nina");
        expect(screen.getByLabelText("E-mail")).toHaveValue("ana@example.com");
        expect(screen.queryByLabelText("Nova senha (mínimo 8 caracteres)")).not.toBeInTheDocument();
    });

    it("requires the current password and saves email and password changes", async () => {
        const user = userEvent.setup();
        render(<ProfilePage />);
        fireEvent.change(screen.getByLabelText("E-mail"), {
            target: { value: "new@example.com" },
        });
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Informe sua senha atual");
        expect(updateProfile).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText("Senha atual"), {
            target: { value: "old-password" },
        });
        await user.click(screen.getByRole("button", { name: "Alterar senha" }));
        fireEvent.change(screen.getByLabelText("Nova senha (mínimo 8 caracteres)"), {
            target: { value: "new-password" },
        });
        fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
            target: { value: "new-password" },
        });
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

        await waitFor(() =>
            expect(updateProfile).toHaveBeenCalledWith({
                email: "new@example.com",
                currentPassword: "old-password",
                newPassword: "new-password",
            })
        );
        expect(authState.refreshUser).toHaveBeenCalled();
        expect(await screen.findByRole("status")).toHaveTextContent("Perfil atualizado.");
    });

    it("rejects mismatched password confirmation", async () => {
        const user = userEvent.setup();
        render(<ProfilePage />);
        await user.click(screen.getByRole("button", { name: "Alterar senha" }));
        fireEvent.change(screen.getByLabelText("Senha atual"), {
            target: { value: "old-password" },
        });
        fireEvent.change(screen.getByLabelText("Nova senha (mínimo 8 caracteres)"), {
            target: { value: "new-password" },
        });
        fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
            target: { value: "different-password" },
        });
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "A confirmação da nova senha não corresponde."
        );
        expect(updateProfile).not.toHaveBeenCalled();
    });

    it("uploads a selected profile photo", async () => {
        render(<ProfilePage />);
        const file = new File(["photo"], "profile.png", { type: "image/png" });
        fireEvent.change(screen.getByLabelText("Escolher foto de perfil"), {
            target: { files: [file] },
        });
        fireEvent.click(screen.getByRole("button", { name: "Salvar foto" }));

        await waitFor(() => expect(uploadProfilePhoto).toHaveBeenCalledWith(file));
        expect(authState.refreshUser).toHaveBeenCalled();
    });
});
