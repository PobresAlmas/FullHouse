export const DEFAULT_PANTRY_CATEGORIES = [
    "Bebidas",
    "Doces",
    "Grãos",
    "Higiene",
    "Laticínios",
    "Limpeza",
    "Massas",
    "Outros",
] as const;

export function normalizePantryCategoryName(value: string) {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()
        .replace(/\s+/gu, " ")
        .toLocaleLowerCase("pt-BR");
}

export function cleanPantryCategoryName(value: string) {
    return value.trim().replace(/\s+/gu, " ");
}
