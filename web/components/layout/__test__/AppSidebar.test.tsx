import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "../AppSidebar";

const authState = vi.hoisted(() => ({
    user: null as { id: string } | null,
    loading: false,
}));
const getResidences = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => authState }));
vi.mock("@/features/residences/api/residences.api", () => ({
    getResidences,
    RESIDENCE_MEMBERSHIP_CHANGED_EVENT: "fullhouse:residence-membership-changed",
}));

describe("AppSidebar", () => {
    beforeEach(() => {
        authState.user = null;
        authState.loading = false;
        getResidences.mockReset();
    });

    it("links the implemented home and module sections", () => {
        render(<AppSidebar activeSection="finance" noResidence={false} />);

        const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
        expect(navigation.querySelectorAll("a")).toHaveLength(10);
        expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
        expect(screen.getByRole("link", { name: "Tarefas" })).toHaveAttribute("href", "/tasks");
        expect(screen.queryByRole("link", { name: "Configurações" })).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Financeiro" })).toHaveAttribute(
            "aria-current",
            "page"
        );
        expect(screen.getByRole("link", { name: "Despensa" })).toHaveAttribute("href", "/pantry");
        expect(screen.getByRole("link", { name: "Lista de compras" })).toHaveAttribute(
            "href",
            "/shopping-list"
        );
        expect(screen.getByRole("link", { name: "Pets" })).toHaveAttribute("href", "/pets");
        expect(screen.getByRole("link", { name: "Chat da casa" })).toHaveAttribute("href", "/chat");
        expect(screen.getByRole("link", { name: "Regras" })).toHaveAttribute("href", "/rules");
        expect(screen.getByRole("link", { name: "Reuniões" })).toHaveAttribute("href", "/meetings");
        expect(screen.queryByRole("link", { name: "Quartos" })).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute("href", "/profile");
        expect(screen.getByText("Nenhuma casa associada")).toBeInTheDocument();
    });

    it("shows home, room search, and profile navigation when no residence is linked", () => {
        render(<AppSidebar activeSection="profile" noResidence />);

        expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
        expect(screen.getByRole("link", { name: "Quartos" })).toHaveAttribute("href", "/rooms");
        expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute(
            "aria-current",
            "page"
        );
        expect(screen.queryByRole("link", { name: "Financeiro" })).not.toBeInTheDocument();
    });

    it("shows the selected residence name", () => {
        render(
            <AppSidebar activeSection="pantry" residenceName="Casa do Vale" noResidence={false} />
        );

        expect(screen.getByText("Casa do Vale")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Despensa" })).toHaveAttribute(
            "aria-current",
            "page"
        );
    });

    it("hides residence sections when the signed-in user has no residence", async () => {
        authState.user = { id: "user-1" };
        getResidences.mockResolvedValue([]);
        render(<AppSidebar activeSection="home" />);

        await waitFor(() => {
            expect(screen.getByRole("link", { name: "Quartos" })).toHaveAttribute("href", "/rooms");
            expect(screen.queryByRole("link", { name: "Financeiro" })).not.toBeInTheDocument();
        });
        expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute("href", "/profile");
    });

    it("shows residence sections after confirming an active membership", async () => {
        authState.user = { id: "user-1" };
        getResidences.mockResolvedValue([{ id: "residence-1" }]);
        render(<AppSidebar activeSection="home" />);

        await waitFor(() =>
            expect(screen.getByRole("link", { name: "Financeiro" })).toHaveAttribute(
                "href",
                "/finance"
            )
        );
        expect(screen.queryByRole("link", { name: "Quartos" })).not.toBeInTheDocument();
    });

    it("refreshes residence navigation after an invitation is accepted", async () => {
        authState.user = { id: "user-1" };
        getResidences
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ id: "residence-1", name: "Casa Nova" }]);
        render(<AppSidebar activeSection="home" />);

        await waitFor(() =>
            expect(screen.queryByRole("link", { name: "Financeiro" })).not.toBeInTheDocument()
        );
        expect(screen.getByRole("link", { name: "Quartos" })).toHaveAttribute("href", "/rooms");
        window.dispatchEvent(new Event("fullhouse:residence-membership-changed"));

        expect(await screen.findByRole("link", { name: "Financeiro" })).toHaveAttribute(
            "href",
            "/finance"
        );
        expect(screen.queryByRole("link", { name: "Quartos" })).not.toBeInTheDocument();
        expect(screen.getByText("Casa Nova")).toBeInTheDocument();
    });
});
