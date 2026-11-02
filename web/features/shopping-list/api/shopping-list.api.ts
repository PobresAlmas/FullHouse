import { api } from "@/services/api";

export type ShoppingListUnit = "UNIDADE" | "KG" | "G" | "L" | "ML" | "PACOTE";
export type ShoppingListStatus = "PENDENTE" | "COMPRADO";

export interface ShoppingListItem {
    id: string;
    name: string;
    quantity: number | null;
    unit: ShoppingListUnit | null;
    notes: string | null;
    status: ShoppingListStatus;
    createdByName: string | null;
    createdAt: string;
    updatedAt: string;
    purchasedByName: string | null;
    purchasedAt: string | null;
    version: number;
}

export interface ShoppingListItemInput {
    name: string;
    quantity: number | null;
    unit: ShoppingListUnit | null;
    notes: string | null;
}

export async function getShoppingListItems(residenceId: string): Promise<ShoppingListItem[]> {
    const response = await api.get<ShoppingListItem[]>(
        `/residences/${residenceId}/shopping-list/items`
    );
    return response.data;
}

export async function createShoppingListItem(
    residenceId: string,
    data: ShoppingListItemInput
): Promise<ShoppingListItem> {
    const response = await api.post<ShoppingListItem>(
        `/residences/${residenceId}/shopping-list/items`,
        data
    );
    return response.data;
}

export async function updateShoppingListItem(
    residenceId: string,
    itemId: string,
    version: number,
    data: Omit<ShoppingListItemInput, "name"> & { name: string }
): Promise<ShoppingListItem> {
    const response = await api.patch<ShoppingListItem>(
        `/residences/${residenceId}/shopping-list/items/${itemId}`,
        { ...data, version }
    );
    return response.data;
}

export async function updateShoppingListStatus(
    residenceId: string,
    item: Pick<ShoppingListItem, "id" | "version">,
    status: ShoppingListStatus
): Promise<ShoppingListItem> {
    const response = await api.patch<ShoppingListItem>(
        `/residences/${residenceId}/shopping-list/items/${item.id}/status`,
        { version: item.version, status }
    );
    return response.data;
}

export async function deleteShoppingListItem(
    residenceId: string,
    item: Pick<ShoppingListItem, "id" | "version">
): Promise<void> {
    await api.delete(`/residences/${residenceId}/shopping-list/items/${item.id}`, {
        params: { version: item.version },
    });
}
