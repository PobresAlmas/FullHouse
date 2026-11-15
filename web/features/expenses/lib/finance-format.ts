import type { Expense } from "../api/expenses.api";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
});

export function amountToCents(amount: string) {
    const normalized = amount.replace(",", ".");
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) return 0;
    return Math.round(Number(normalized) * 100);
}

export function isValidDate(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return (
        date.getFullYear() === Number(year) &&
        date.getMonth() === Number(month) - 1 &&
        date.getDate() === Number(day)
    );
}

export function formatCurrency(amount: string | number) {
    return currency.format(Number(amount));
}

export function formatDate(date: string | null) {
    if (!date) return "—";
    return shortDate.format(new Date(`${date.slice(0, 10)}T00:00:00.000Z`));
}

export function getErrorMessage(error: unknown) {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { message?: unknown } } }).response;
        const message = response?.data?.message;
        if (typeof message === "string") return message;
        if (Array.isArray(message)) return message.join(" ");
    }
    if (typeof error === "object" && error !== null && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string") return message;
    }
    return "Não foi possível concluir a operação. Tente novamente.";
}

export function localIsoDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function sortExpenses(items: Expense[]) {
    return [...items].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
