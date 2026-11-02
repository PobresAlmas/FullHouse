import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import {
    createShoppingListItem,
    deleteShoppingListItem,
    getShoppingListItems,
    updateShoppingListItem,
    updateShoppingListStatus,
} from "../shopping-list.api";

vi.mock("@/services/api", () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

const residenceId = "residence-1";
const item = {
    id: "item-1",
    name: "Leite",
    quantity: 2,
    unit: "L" as const,
    notes: null,
    status: "PENDENTE" as const,
    createdByName: "Ana",
    createdAt: "2026-10-30T10:00:00.000Z",
    updatedAt: "2026-10-30T10:00:00.000Z",
    purchasedByName: null,
    purchasedAt: null,
    version: 1,
};

describe("shopping list API client", () => {
    beforeEach(() => vi.clearAllMocks());

    it("loads items for one residence", async () => {
        vi.mocked(api.get).mockResolvedValue({ data: [item] });
        await expect(getShoppingListItems(residenceId)).resolves.toEqual([item]);
        expect(api.get).toHaveBeenCalledWith(`/residences/${residenceId}/shopping-list/items`);
    });

    it("creates an item using the shared list payload", async () => {
        const input = { name: "Leite", quantity: 2, unit: "L" as const, notes: null };
        vi.mocked(api.post).mockResolvedValue({ data: item });
        await expect(createShoppingListItem(residenceId, input)).resolves.toEqual(item);
        expect(api.post).toHaveBeenCalledWith(
            `/residences/${residenceId}/shopping-list/items`,
            input
        );
    });

    it("updates with the expected version", async () => {
        vi.mocked(api.patch).mockResolvedValue({ data: { ...item, version: 2 } });
        await expect(
            updateShoppingListItem(residenceId, item.id, item.version, {
                name: "Leite integral",
                quantity: 1,
                unit: "L",
                notes: null,
            })
        ).resolves.toMatchObject({ version: 2 });
        expect(api.patch).toHaveBeenCalledWith(
            `/residences/${residenceId}/shopping-list/items/${item.id}`,
            { name: "Leite integral", quantity: 1, unit: "L", notes: null, version: 1 }
        );
    });

    it("changes status using the item version and target status", async () => {
        vi.mocked(api.patch).mockResolvedValue({
            data: { ...item, status: "COMPRADO", version: 2 },
        });
        await expect(
            updateShoppingListStatus(residenceId, item, "COMPRADO")
        ).resolves.toMatchObject({
            status: "COMPRADO",
        });
        expect(api.patch).toHaveBeenCalledWith(
            `/residences/${residenceId}/shopping-list/items/${item.id}/status`,
            { version: 1, status: "COMPRADO" }
        );
    });

    it("deletes with the expected version as a query parameter", async () => {
        vi.mocked(api.delete).mockResolvedValue({ data: undefined });
        await expect(deleteShoppingListItem(residenceId, item)).resolves.toBeUndefined();
        expect(api.delete).toHaveBeenCalledWith(
            `/residences/${residenceId}/shopping-list/items/${item.id}`,
            { params: { version: 1 } }
        );
    });
});
