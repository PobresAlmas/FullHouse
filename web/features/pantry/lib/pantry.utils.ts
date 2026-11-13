import type { PantryItem, PantryMovementType, PantryProperty, PantryUnit } from "../api/pantry.api";

export type TabKey = "all" | "communal" | "private" | "mine";
export type ItemFormState = {
    name: string;
    categoryId: string;
    property: PantryProperty;
    ownerMemberId: string;
    unit: PantryUnit;
    quantity: string;
    minimumQuantity: string;
    expirationDate: string;
};
export type ItemModalState = { mode: "create" } | { mode: "edit"; item: PantryItem } | null;
export type MovementModalState = { item: PantryItem; type: PantryMovementType } | null;

export const initialForm: ItemFormState = {
    name: "",
    categoryId: "",
    property: "COMUNITARIO",
    ownerMemberId: "",
    unit: "UNIDADE",
    quantity: "",
    minimumQuantity: "",
    expirationDate: "",
};

export const unitLabels: Record<PantryUnit, string> = {
    UNIDADE: "un",
    KG: "kg",
    G: "g",
    L: "L",
    ML: "ml",
    PACOTE: "pacote(s)",
};

export function getErrorMessage(error: unknown) {
    if (typeof error === "object" && error !== null && "message" in error) {
        const responseData =
            "response" in error &&
            typeof error.response === "object" &&
            error.response !== null &&
            "data" in error.response &&
            typeof error.response.data === "object" &&
            error.response.data !== null
                ? error.response.data
                : null;
        const responseMessage =
            responseData && "message" in responseData ? responseData.message : undefined;
        const message = responseMessage ?? (error as { message?: unknown }).message;
        if (typeof message === "string") return message;
        if (Array.isArray(message) && message.every((part) => typeof part === "string")) {
            return message.join(" ");
        }
    }
    return "Não foi possível concluir a operação. Tente novamente.";
}

export function dateToString(value: string | null) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function isExpiringSoon(value: string | null) {
    if (!value) return false;
    const dayNumber = (date: string) => {
        const [year, month, day] = date.split("-").map(Number);
        return Date.UTC(year, month - 1, day) / 86400000;
    };
    const days = dayNumber(value.slice(0, 10)) - dayNumber(localDateString());
    return days >= 0 && days <= 7;
}

export function formatQuantity(quantity: number, unit: PantryUnit) {
    const amount = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(quantity);
    return `${amount} ${unitLabels[unit]}`;
}

export function itemIsLow(item: PantryItem) {
    return item.minimumQuantity !== null && item.quantity <= item.minimumQuantity;
}
