import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PantryPage from "../page";
import {
    createPantryCategory,
    deletePantryCategory,
    getPantryCategories,
    getPantryItems,
    getPantryMembers,
    registerPantryMovement,
    updatePantryCategory,
} from "@/features/pantry/api/pantry.api";
import type { PantryCategory, PantryItem, PantryMember } from "@/features/pantry/api/pantry.api";
import { getPetResidences } from "@/features/pets/api/pets.api";
import type { PetResidence } from "@/features/pets/api/pets.api";
import { createResidenceFixture } from "@/test/fixtures/residence";

vi.mock("@/features/pantry/api/pantry.api", () => ({
    createPantryCategory: vi.fn(),
    deletePantryCategory: vi.fn(),
    getPantryCategories: vi.fn(),
    getPantryItems: vi.fn(),
    getPantryMembers: vi.fn(),
    registerPantryMovement: vi.fn(),
    updatePantryCategory: vi.fn(),
}));

vi.mock("@/features/pets/api/pets.api", () => ({ getPetResidences: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
    useAuth: () => ({
        user: { id: "user-1", email: "emilson@example.com", name: "Emilson Apelido Silva" },
        loading: false,
    }),
}));

const residence: PetResidence = createResidenceFixture();

const member: PantryMember = { id: "member-1", name: "Emilson" };
const category: PantryCategory = { id: "category-1", name: "Grãos" };
const item: PantryItem = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Arroz",
    category: "Grãos",
    categoryId: category.id,
    property: "COMUNITARIO",
    ownerMemberId: null,
    ownerName: "Casa",
    isMine: false,
    unit: "KG",
    quantity: 2,
    minimumQuantity: null,
    expirationDate: null,
};

describe("PantryPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getPetResidences).mockResolvedValue([residence]);
        vi.mocked(getPantryMembers).mockResolvedValue([member]);
        vi.mocked(getPantryCategories).mockResolvedValue([category]);
        vi.mocked(getPantryItems).mockResolvedValue([item]);
    });

    it("registers the exact decimal movement quantity entered by the user", async () => {
        const user = userEvent.setup();
        vi.mocked(registerPantryMovement).mockResolvedValue({ ...item, quantity: 1.25 });
        render(<PantryPage />);

        expect(await screen.findAllByText("Casa do Vale")).not.toHaveLength(0);
        expect(screen.getByRole("heading", { name: "Bom dia, Emilson" })).toBeInTheDocument();
        expect(
            screen.queryByRole("combobox", { name: "Trocar residência" })
        ).not.toBeInTheDocument();
        await user.click(await screen.findByRole("button", { name: "Registrar consumo de Arroz" }));
        const quantity = screen.getByPlaceholderText("Ex.: 0,5");
        await user.clear(quantity);
        await user.type(quantity, "0,75");
        await user.click(screen.getByRole("button", { name: "Confirmar" }));

        await waitFor(() =>
            expect(registerPantryMovement).toHaveBeenCalledWith(
                residence.id,
                item.id,
                "CONSUMO",
                0.75
            )
        );
        expect(
            await screen.findByText("Consumo de 0,75 kg registrado para Arroz.")
        ).toBeInTheDocument();
    }, 10_000);

    it("shows a residence selector only when the user has multiple residences", async () => {
        const user = userEvent.setup();
        const otherResidence = { ...residence, id: "residence-2", name: "Casa da Praia" };
        vi.mocked(getPetResidences).mockResolvedValue([residence, otherResidence]);
        render(<PantryPage />);

        const selector = await screen.findByRole("combobox", { name: "Trocar residência" });
        await user.selectOptions(selector, otherResidence.id);

        await waitFor(() => expect(getPantryItems).toHaveBeenCalledWith(otherResidence.id));
    });

    it("creates, renames, and deletes pantry categories with confirmation", async () => {
        const user = userEvent.setup();
        const addedCategory = { id: "category-2", name: "Temperos" };
        vi.mocked(getPantryCategories)
            .mockResolvedValueOnce([category])
            .mockResolvedValueOnce([category, addedCategory])
            .mockResolvedValueOnce([category, { ...addedCategory, name: "Ervas" }])
            .mockResolvedValueOnce([category]);
        vi.mocked(createPantryCategory).mockResolvedValueOnce(addedCategory);
        vi.mocked(updatePantryCategory).mockResolvedValueOnce({ ...addedCategory, name: "Ervas" });
        vi.mocked(deletePantryCategory).mockResolvedValueOnce();
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
        render(<PantryPage />);

        await user.click(await screen.findByRole("button", { name: "Gerenciar categorias" }));
        await user.type(screen.getByPlaceholderText("Ex.: Temperos"), "Temperos");
        await user.click(screen.getByRole("button", { name: "Adicionar categoria" }));
        await waitFor(() =>
            expect(createPantryCategory).toHaveBeenCalledWith(residence.id, "Temperos")
        );
        expect(await screen.findByText("Categoria criada.")).toBeInTheDocument();

        await user.click(await screen.findByRole("button", { name: "Renomear Temperos" }));
        const renameInput = screen.getByLabelText("Renomear categoria");
        await user.clear(renameInput);
        await user.type(renameInput, "Ervas");
        await user.click(screen.getByRole("button", { name: "Salvar nome" }));
        await waitFor(() =>
            expect(updatePantryCategory).toHaveBeenCalledWith(residence.id, "category-2", "Ervas")
        );
        expect(await screen.findByRole("button", { name: "Renomear Ervas" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Excluir Ervas" }));
        expect(confirm).toHaveBeenCalledWith("Excluir a categoria “Ervas”?");
        await waitFor(() =>
            expect(deletePantryCategory).toHaveBeenCalledWith(residence.id, "category-2")
        );
        expect(await screen.findByText("Categoria removida.")).toBeInTheDocument();
        confirm.mockRestore();
    });

    it("lets the user create the first category before adding pantry items", async () => {
        const user = userEvent.setup();
        const firstCategory = { id: "category-1", name: "Mercearia" };
        vi.mocked(getPantryCategories)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([firstCategory]);
        vi.mocked(getPantryItems).mockResolvedValue([]);
        vi.mocked(createPantryCategory).mockResolvedValueOnce(firstCategory);
        render(<PantryPage />);

        const addItemButton = await screen.findByRole("button", { name: "Adicionar item" });
        expect(addItemButton).toBeDisabled();

        await user.click(screen.getByRole("button", { name: "Gerenciar categorias" }));
        expect(
            await screen.findByRole("dialog", { name: "Categorias da despensa" })
        ).toBeInTheDocument();
        await user.type(screen.getByPlaceholderText("Ex.: Temperos"), "Mercearia");
        await user.click(screen.getByRole("button", { name: "Adicionar categoria" }));

        await waitFor(() =>
            expect(createPantryCategory).toHaveBeenCalledWith(residence.id, "Mercearia")
        );
        await waitFor(() => expect(addItemButton).toBeEnabled());
        expect(await screen.findByText("Categoria criada.")).toBeInTheDocument();
    });

    it("rejects movement quantities with more than two decimal places before sending", async () => {
        const user = userEvent.setup();
        render(<PantryPage />);

        await user.click(
            await screen.findByRole("button", { name: "Registrar entrada para Arroz" })
        );
        const quantity = screen.getByPlaceholderText("Ex.: 0,5");
        await user.clear(quantity);
        await user.type(quantity, "0,123");
        await user.click(screen.getByRole("button", { name: "Confirmar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Informe uma quantidade positiva com até duas casas decimais."
        );
        expect(registerPantryMovement).not.toHaveBeenCalled();
    });
});
