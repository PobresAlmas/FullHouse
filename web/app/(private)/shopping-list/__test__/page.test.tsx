import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ShoppingListPage from "../page";
import {
    createShoppingListItem,
    deleteShoppingListItem,
    getShoppingListItems,
    updateShoppingListItem,
    updateShoppingListStatus,
} from "@/features/shopping-list/api/shopping-list.api";
import type { ShoppingListItem } from "@/features/shopping-list/api/shopping-list.api";
import { getPetResidences } from "@/features/pets/api/pets.api";
import { createResidenceFixture } from "@/test/fixtures/residence";

vi.mock("@/features/shopping-list/api/shopping-list.api", () => ({
    createShoppingListItem: vi.fn(),
    deleteShoppingListItem: vi.fn(),
    getShoppingListItems: vi.fn(),
    updateShoppingListItem: vi.fn(),
    updateShoppingListStatus: vi.fn(),
}));
vi.mock("@/features/pets/api/pets.api", () => ({ getPetResidences: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({
    useAuth: () => ({
        user: { id: "user-1", email: "ana@example.com", name: "Ana Silva" },
        loading: false,
    }),
}));

const residence = createResidenceFixture();
const item: ShoppingListItem = {
    id: "item-1",
    name: "Leite",
    quantity: 2,
    unit: "L",
    notes: "Integral",
    status: "PENDENTE",
    createdByName: "Ana",
    createdAt: "2026-10-30T10:00:00.000Z",
    updatedAt: "2026-10-30T10:00:00.000Z",
    purchasedByName: null,
    purchasedAt: null,
    version: 1,
};

describe("ShoppingListPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getPetResidences).mockResolvedValue([residence]);
        vi.mocked(getShoppingListItems).mockResolvedValue([item]);
    });

    it("loads the active residence and shows shared pending items", async () => {
        render(<ShoppingListPage />);
        expect(
            await screen.findByRole("heading", { name: "Lista de compras" })
        ).toBeInTheDocument();
        expect(await screen.findByText("2 L")).toBeInTheDocument();
        expect(screen.getByText("Integral")).toBeInTheDocument();
        expect(screen.getByText("Adicionado por Ana")).toBeInTheDocument();
        expect(getShoppingListItems).toHaveBeenCalledWith(residence.id);
    });

    it("requires quantity and unit together and accepts a comma decimal on create", async () => {
        const user = userEvent.setup();
        render(<ShoppingListPage />);
        await screen.findByText("Leite");
        await user.type(screen.getByPlaceholderText("Ex.: Café"), "Farinha");
        await user.type(screen.getByPlaceholderText("Ex.: 1,5"), "0,75");
        await user.click(screen.getByRole("button", { name: "Adicionar à lista" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Selecione a unidade da quantidade informada."
        );
        expect(createShoppingListItem).not.toHaveBeenCalled();

        await user.selectOptions(screen.getByLabelText("Unidade (opcional)"), "KG");
        const created = {
            ...item,
            id: "item-2",
            name: "Farinha",
            quantity: 0.75,
            unit: "KG" as const,
        };
        vi.mocked(createShoppingListItem).mockResolvedValueOnce(created);
        await user.click(screen.getByRole("button", { name: "Adicionar à lista" }));
        await waitFor(() =>
            expect(createShoppingListItem).toHaveBeenCalledWith(residence.id, {
                name: "Farinha",
                quantity: 0.75,
                unit: "KG",
                notes: null,
            })
        );
        expect(await screen.findByRole("status")).toHaveTextContent("Item adicionado à lista.");
        expect(screen.getByText("Farinha")).toBeInTheDocument();
    });

    it("warns about accent-insensitive pending duplicates and lets the user override", async () => {
        const user = userEvent.setup();
        render(<ShoppingListPage />);
        await screen.findByText("Leite");
        await user.type(screen.getByPlaceholderText("Ex.: Café"), "leité");
        await user.click(screen.getByRole("button", { name: "Adicionar à lista" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Já existe um item pendente");
        expect(createShoppingListItem).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", { name: "Cancelar" }));
        expect(createShoppingListItem).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", { name: "Adicionar à lista" }));
        expect(
            await screen.findByRole("button", { name: "Adicionar mesmo assim" })
        ).toBeInTheDocument();

        vi.mocked(createShoppingListItem).mockResolvedValueOnce({ ...item, id: "item-2" });
        await user.click(screen.getByRole("button", { name: "Adicionar mesmo assim" }));
        await waitFor(() => expect(createShoppingListItem).toHaveBeenCalledOnce());
    });

    it("marks an item bought and supports reopening it", async () => {
        const user = userEvent.setup();
        const bought: ShoppingListItem = {
            ...item,
            status: "COMPRADO",
            purchasedByName: "Ana",
            purchasedAt: "2026-10-30T12:00:00.000Z",
            version: 2,
        };
        vi.mocked(updateShoppingListStatus)
            .mockResolvedValueOnce(bought)
            .mockResolvedValueOnce({ ...item, version: 3 });
        render(<ShoppingListPage />);
        await user.click(await screen.findByRole("button", { name: "Marcar Leite como comprado" }));
        expect(await screen.findByText(/Comprado por Ana/)).toBeInTheDocument();
        expect(screen.getByText("Nenhum item pendente.")).toBeInTheDocument();
        expect(updateShoppingListStatus).toHaveBeenNthCalledWith(1, residence.id, item, "COMPRADO");
        await user.click(screen.getByRole("button", { name: "Reabrir Leite" }));
        await waitFor(() =>
            expect(updateShoppingListStatus).toHaveBeenNthCalledWith(
                2,
                residence.id,
                bought,
                "PENDENTE"
            )
        );
        expect(await screen.findByText("Adicionado por Ana")).toBeInTheDocument();
    });

    it("does not warn about a duplicate that is already purchased", async () => {
        const user = userEvent.setup();
        vi.mocked(getShoppingListItems).mockResolvedValueOnce([
            { ...item, status: "COMPRADO", purchasedByName: "Ana", purchasedAt: item.createdAt },
        ]);
        render(<ShoppingListPage />);
        await screen.findByRole("button", { name: "Reabrir Leite" });
        await user.type(screen.getByPlaceholderText("Ex.: Café"), "leite");
        vi.mocked(createShoppingListItem).mockResolvedValueOnce({ ...item, id: "item-2" });
        await user.click(screen.getByRole("button", { name: "Adicionar à lista" }));
        await waitFor(() => expect(createShoppingListItem).toHaveBeenCalledOnce());
        expect(screen.queryByText(/Já existe um item pendente/)).not.toBeInTheDocument();
    });

    it("edits an item using its current version", async () => {
        const user = userEvent.setup();
        vi.mocked(updateShoppingListItem).mockResolvedValueOnce({
            ...item,
            name: "Leite sem lactose",
            version: 2,
        });
        render(<ShoppingListPage />);
        await user.click(await screen.findByRole("button", { name: "Editar Leite" }));
        const dialog = screen.getByRole("dialog");
        const name = within(dialog).getByLabelText("Nome do item");
        await user.clear(name);
        await user.type(name, "Leite sem lactose");
        await user.click(within(dialog).getByRole("button", { name: "Salvar" }));
        await waitFor(() =>
            expect(updateShoppingListItem).toHaveBeenCalledWith(residence.id, item.id, 1, {
                name: "Leite sem lactose",
                quantity: 2,
                unit: "L",
                notes: "Integral",
            })
        );
        expect(await screen.findByText("Item atualizado.")).toBeInTheDocument();
        expect(await screen.findByText("Leite sem lactose")).toBeInTheDocument();
    });

    it("deletes an item only after browser confirmation", async () => {
        const user = userEvent.setup();
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
        vi.mocked(deleteShoppingListItem).mockResolvedValueOnce();
        render(<ShoppingListPage />);
        await user.click(await screen.findByRole("button", { name: "Excluir Leite" }));
        expect(deleteShoppingListItem).not.toHaveBeenCalled();
        expect(screen.getByText("Leite")).toBeInTheDocument();
        confirm.mockReturnValue(true);
        await user.click(screen.getByRole("button", { name: "Excluir Leite" }));
        expect(confirm).toHaveBeenCalledWith(
            "Remover este item da lista? Esta ação não pode ser desfeita."
        );
        await waitFor(() =>
            expect(deleteShoppingListItem).toHaveBeenCalledWith(residence.id, item)
        );
        expect(await screen.findByRole("status")).toHaveTextContent("Item removido da lista.");
        expect(screen.queryByText("Leite")).not.toBeInTheDocument();
        confirm.mockRestore();
    });

    it("reloads the current list after a stale status conflict", async () => {
        const user = userEvent.setup();
        const latest = { ...item, name: "Leite atualizado", version: 2 };
        vi.mocked(getShoppingListItems)
            .mockResolvedValueOnce([item])
            .mockResolvedValueOnce([latest]);
        vi.mocked(updateShoppingListStatus).mockRejectedValueOnce({
            message: "Request failed",
            response: { data: { message: "Este item foi alterado por outro morador." } },
        });
        render(<ShoppingListPage />);
        await user.click(await screen.findByRole("button", { name: "Marcar Leite como comprado" }));
        expect(await screen.findByText("Leite atualizado")).toBeInTheDocument();
        expect(getShoppingListItems).toHaveBeenCalledTimes(2);
        expect(await screen.findByRole("alert")).toHaveTextContent("alterado por outro morador");
    });

    it("switches residence and reloads only that household's items", async () => {
        const user = userEvent.setup();
        const secondResidence = createResidenceFixture({
            id: "residence-2",
            name: "Casa da Praia",
        });
        vi.mocked(getPetResidences).mockResolvedValue([residence, secondResidence]);
        vi.mocked(getShoppingListItems).mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
        render(<ShoppingListPage />);
        await user.selectOptions(
            await screen.findByRole("combobox", { name: "Trocar residência" }),
            "residence-2"
        );
        await waitFor(() => expect(getShoppingListItems).toHaveBeenLastCalledWith("residence-2"));
        expect(await screen.findByText("Sua lista de compras está vazia.")).toBeInTheDocument();
    });

    it("shows an empty state when no residence is associated", async () => {
        vi.mocked(getPetResidences).mockResolvedValue([]);
        render(<ShoppingListPage />);
        expect(await screen.findByText("Nenhuma casa ativa")).toBeInTheDocument();
        expect(getShoppingListItems).not.toHaveBeenCalled();
    });

    it("shows a query failure separately from empty state and lets the user retry", async () => {
        const user = userEvent.setup();
        vi.mocked(getShoppingListItems)
            .mockRejectedValueOnce(new Error("Network Error"))
            .mockResolvedValueOnce([item]);
        render(<ShoppingListPage />);
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível carregar a lista de compras."
        );
        expect(screen.queryByText("Sua lista de compras está vazia.")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
        expect(await screen.findByText("Leite")).toBeInTheDocument();
        expect(getShoppingListItems).toHaveBeenCalledTimes(2);
    });
});
