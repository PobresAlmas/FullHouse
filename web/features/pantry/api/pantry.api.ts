import { api } from "@/services/api";

export type PantryProperty = "COMUNITARIO" | "PRIVADO" | "DONO_ESPECIFICO";
export type PantryUnit = "UNIDADE" | "KG" | "G" | "L" | "ML" | "PACOTE";
export type PantryMovementType = "ENTRADA" | "CONSUMO" | "DESCARTE";

export interface PantryMember {
    id: string;
    name: string;
}

export interface PantryCategory {
    id: string;
    name: string;
}

export interface PantryItem {
    id: string;
    name: string;
    categoryId?: string;
    category: string;
    property: PantryProperty;
    ownerMemberId: string | null;
    ownerName: string;
    isMine: boolean;
    unit: PantryUnit;
    quantity: number;
    minimumQuantity: number | null;
    expirationDate: string | null;
}

export interface PantryItemInput {
    name: string;
    categoryId: string;
    property: PantryProperty;
    ownerMemberId?: string | null;
    unit: PantryUnit;
    initialQuantity: number;
    minimumQuantity?: number | null;
    expirationDate?: string | null;
}

export interface PantryItemUpdateInput {
    name?: string;
    categoryId?: string;
    property?: PantryProperty;
    ownerMemberId?: string | null;
    unit?: PantryUnit;
    minimumQuantity?: number | null;
    expirationDate?: string | null;
}

export async function getPantryMembers(residenceId: string): Promise<PantryMember[]> {
    const response = await api.get<PantryMember[]>(`/residences/${residenceId}/pantry/members`);
    return response.data;
}

export async function getPantryCategories(residenceId: string): Promise<PantryCategory[]> {
    const response = await api.get<PantryCategory[]>(
        `/residences/${residenceId}/pantry/categories`
    );
    return response.data;
}

export async function createPantryCategory(
    residenceId: string,
    name: string
): Promise<PantryCategory> {
    const response = await api.post<PantryCategory>(
        `/residences/${residenceId}/pantry/categories`,
        {
            name,
        }
    );
    return response.data;
}

export async function updatePantryCategory(
    residenceId: string,
    categoryId: string,
    name: string
): Promise<PantryCategory> {
    const response = await api.patch<PantryCategory>(
        `/residences/${residenceId}/pantry/categories/${categoryId}`,
        { name }
    );
    return response.data;
}

export async function deletePantryCategory(residenceId: string, categoryId: string): Promise<void> {
    await api.delete(`/residences/${residenceId}/pantry/categories/${categoryId}`);
}

export async function getPantryItems(residenceId: string, search?: string): Promise<PantryItem[]> {
    const response = await api.get<PantryItem[]>(`/residences/${residenceId}/pantry/items`, {
        params: search ? { search } : undefined,
    });
    return response.data;
}

export async function createPantryItem(
    residenceId: string,
    data: PantryItemInput
): Promise<PantryItem> {
    const response = await api.post<PantryItem>(`/residences/${residenceId}/pantry/items`, data);
    return response.data;
}

export async function updatePantryItem(
    residenceId: string,
    itemId: string,
    data: PantryItemUpdateInput
): Promise<PantryItem> {
    const response = await api.patch<PantryItem>(
        `/residences/${residenceId}/pantry/items/${itemId}`,
        data
    );
    return response.data;
}

export async function registerPantryMovement(
    residenceId: string,
    itemId: string,
    type: PantryMovementType,
    quantity: number
): Promise<PantryItem> {
    const response = await api.post<PantryItem>(
        `/residences/${residenceId}/pantry/items/${itemId}/movements`,
        { type, quantity }
    );
    return response.data;
}

export async function deletePantryItem(residenceId: string, itemId: string): Promise<void> {
    await api.delete(`/residences/${residenceId}/pantry/items/${itemId}`);
}
