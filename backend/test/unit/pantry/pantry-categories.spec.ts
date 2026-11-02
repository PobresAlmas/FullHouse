import {
    DEFAULT_PANTRY_CATEGORIES,
    cleanPantryCategoryName,
    normalizePantryCategoryName,
} from "../../../src/pantry/pantry-categories.js";

describe("pantry categories", () => {
    it("provides eight default categories with unique normalized names", () => {
        expect(DEFAULT_PANTRY_CATEGORIES).toEqual([
            "Bebidas",
            "Doces",
            "Grãos",
            "Higiene",
            "Laticínios",
            "Limpeza",
            "Massas",
            "Outros",
        ]);
        const normalized = DEFAULT_PANTRY_CATEGORIES.map(normalizePantryCategoryName);
        expect(new Set(normalized).size).toBe(DEFAULT_PANTRY_CATEGORIES.length);
    });

    it("normalizes spaces, accents, and case for uniqueness checks", () => {
        expect(cleanPantryCategoryName("  Laticínios   e  frios ")).toBe("Laticínios e frios");
        expect(normalizePantryCategoryName("  LATICÍNIOS   E frios ")).toBe("laticinios e frios");
        expect(normalizePantryCategoryName("Grãos")).toBe(normalizePantryCategoryName("graos"));
    });
});
