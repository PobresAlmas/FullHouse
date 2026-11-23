import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HouseRulesPage from "../page";
import {
    createHouseRule,
    getHouseRules,
    updateHouseRule,
} from "@/features/house-collaboration/api/house-rules.api";
import { getResidences } from "@/features/residences/api/residences.api";
import { createResidenceFixture } from "@/test/fixtures/residence";

vi.mock("@/features/house-collaboration/api/house-rules.api", () => ({
    createHouseRule: vi.fn(),
    getHouseRules: vi.fn(),
    updateHouseRule: vi.fn(),
}));
vi.mock("@/features/residences/api/residences.api", () => ({ getResidences: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => ({ user: { name: "Ana" } }) }));
const residence = createResidenceFixture();
const rule = {
    id: "r1",
    title: "Silêncio",
    description: "Após 22h",
    createdAt: "2026-11-01T10:00:00Z",
    createdBy: "Ana",
    updatedBy: "Bia",
};

describe("HouseRulesPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getResidences).mockResolvedValue([residence]);
        vi.mocked(getHouseRules).mockResolvedValue([rule]);
        vi.mocked(createHouseRule).mockResolvedValue(rule);
        vi.mocked(updateHouseRule).mockResolvedValue({ ...rule, title: "Horário de silêncio" });
    });

    it("shows rule authorship and creates a rule with required fields", async () => {
        const user = userEvent.setup();
        render(<HouseRulesPage />);
        expect(await screen.findByText("Silêncio")).toBeInTheDocument();
        expect(screen.getByText(/Criada por Ana/)).toBeInTheDocument();
        await user.type(screen.getByRole("textbox", { name: "Título" }), "Nova regra");
        await user.type(screen.getByRole("textbox", { name: "Descrição" }), "Descrição válida");
        await user.click(screen.getByRole("button", { name: "Adicionar regra" }));
        await waitFor(() =>
            expect(createHouseRule).toHaveBeenCalledWith(residence.id, {
                title: "Nova regra",
                description: "Descrição válida",
            })
        );
    });

    it.each([true, false])(
        "lets members read the rules and reserves writing for managers (override %s)",
        async (canEditContent) => {
            vi.mocked(getResidences).mockResolvedValue([
                createResidenceFixture({
                    membership: { id: "ordinary-member", role: "MORADOR", canEditContent },
                }),
            ]);
            render(<HouseRulesPage />);
            expect(await screen.findByText("Silêncio")).toBeInTheDocument();
            expect(
                screen.queryByRole("button", { name: "Adicionar regra" })
            ).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
        }
    );

    it("shows validation errors and updates an existing rule", async () => {
        const user = userEvent.setup();
        render(<HouseRulesPage />);
        await screen.findByText("Silêncio");
        await user.click(screen.getByRole("button", { name: "Adicionar regra" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Preencha o título e a descrição"
        );
        await user.click(screen.getByRole("button", { name: "Editar" }));
        const title = screen.getByRole("textbox", { name: "Título" });
        await user.clear(title);
        await user.type(title, "Horário de silêncio");
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
        await waitFor(() =>
            expect(updateHouseRule).toHaveBeenCalledWith(residence.id, "r1", {
                title: "Horário de silêncio",
                description: "Após 22h",
            })
        );
    });
});
