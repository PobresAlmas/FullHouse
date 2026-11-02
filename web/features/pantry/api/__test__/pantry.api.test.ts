import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import {
    createPantryCategory,
    deletePantryCategory,
    getPantryCategories,
    updatePantryCategory,
} from "../pantry.api";

vi.mock("@/services/api", () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

describe("pantry categories API client", () => {
    const residenceId = "residence-1";
    const category = { id: "category-1", name: "Grãos" };

    beforeEach(() => vi.clearAllMocks());

    it("loads categories from their residence-scoped endpoint", async () => {
        vi.mocked(api.get).mockResolvedValue({ data: [category] });
        await expect(getPantryCategories(residenceId)).resolves.toEqual([category]);
        expect(api.get).toHaveBeenCalledWith(`/residences/${residenceId}/pantry/categories`);
    });

    it("creates and renames a category with a name payload", async () => {
        vi.mocked(api.post).mockResolvedValue({ data: category });
        await expect(createPantryCategory(residenceId, "Grãos")).resolves.toEqual(category);
        expect(api.post).toHaveBeenCalledWith(`/residences/${residenceId}/pantry/categories`, {
            name: "Grãos",
        });

        vi.mocked(api.patch).mockResolvedValue({ data: { ...category, name: "Mercearia" } });
        await expect(updatePantryCategory(residenceId, category.id, "Mercearia")).resolves.toEqual({
            ...category,
            name: "Mercearia",
        });
        expect(api.patch).toHaveBeenCalledWith(
            `/residences/${residenceId}/pantry/categories/${category.id}`,
            { name: "Mercearia" }
        );
    });

    it("deletes the selected category", async () => {
        vi.mocked(api.delete).mockResolvedValue({ data: undefined });
        await expect(deletePantryCategory(residenceId, category.id)).resolves.toBeUndefined();
        expect(api.delete).toHaveBeenCalledWith(
            `/residences/${residenceId}/pantry/categories/${category.id}`
        );
    });
});
