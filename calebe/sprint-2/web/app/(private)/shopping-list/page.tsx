"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
    Check,
    ChevronDown,
    ChevronUp,
    Pencil,
    Plus,
    ShoppingBasket,
    Trash2,
    X,
} from "lucide-react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getPetResidences } from "@/features/pets/api/pets.api";
import type { PetResidence } from "@/features/pets/api/pets.api";
import {
    createShoppingListItem,
    deleteShoppingListItem,
    getShoppingListItems,
    updateShoppingListItem,
    updateShoppingListStatus,
} from "@/features/shopping-list/api/shopping-list.api";
import type {
    ShoppingListItem,
    ShoppingListItemInput,
    ShoppingListStatus,
    ShoppingListUnit,
} from "@/features/shopping-list/api/shopping-list.api";

type ItemDraft = { name: string; quantity: string; unit: ShoppingListUnit | ""; notes: string };
type EditingItem = ShoppingListItem | null;

const emptyDraft: ItemDraft = { name: "", quantity: "", unit: "", notes: "" };
const unitLabels: Record<ShoppingListUnit, string> = {
    UNIDADE: "un",
    KG: "kg",
    G: "g",
    L: "L",
    ML: "ml",
    PACOTE: "pacote(s)",
};

function getErrorMessage(error: unknown) {
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

function normalizeName(value: string) {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()
        .replace(/\s+/gu, " ")
        .toLocaleLowerCase("pt-BR");
}

function getDraftValidationError(draft: ItemDraft) {
    const name = draft.name.trim().replace(/\s+/gu, " ");
    const quantityText = draft.quantity.trim().replace(",", ".");
    const notes = draft.notes.trim();
    if (!name) return "Informe o nome do item.";
    if (name.length > 100) return "O nome deve ter no máximo 100 caracteres.";
    if (quantityText && (!/^\d+(?:\.\d{1,3})?$/.test(quantityText) || Number(quantityText) <= 0)) {
        return "Informe uma quantidade positiva com até três casas decimais.";
    }
    if (quantityText && !draft.unit) return "Selecione a unidade da quantidade informada.";
    if (!quantityText && draft.unit) return "Informe a quantidade para usar uma unidade.";
    if (quantityText && Number(quantityText) > 999999999.999) {
        return "A quantidade excede o limite permitido.";
    }
    if (notes.length > 500) return "A observação deve ter no máximo 500 caracteres.";
    return null;
}

function parseDraft(draft: ItemDraft): ShoppingListItemInput | null {
    if (getDraftValidationError(draft)) return null;
    const name = draft.name.trim().replace(/\s+/gu, " ");
    const quantityText = draft.quantity.trim().replace(",", ".");
    const quantity = quantityText ? Number(quantityText) : null;
    const notes = draft.notes.trim();
    return {
        name,
        quantity,
        unit: draft.unit || null,
        notes: notes || null,
    };
}

function sortItems(items: ShoppingListItem[]) {
    return [...items].sort((left, right) => {
        if (left.status !== right.status) return left.status === "PENDENTE" ? -1 : 1;
        const leftDate = left.status === "PENDENTE" ? left.createdAt : (left.purchasedAt ?? "");
        const rightDate = right.status === "PENDENTE" ? right.createdAt : (right.purchasedAt ?? "");
        return rightDate.localeCompare(leftDate) || left.id.localeCompare(right.id);
    });
}

function formatItemAmount(item: ShoppingListItem) {
    if (item.quantity === null || !item.unit) return "";
    return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(item.quantity)} ${unitLabels[item.unit]}`;
}

function formatDate(value: string | null) {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export default function ShoppingListPage() {
    const { user } = useAuth();
    const [residences, setResidences] = useState<PetResidence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [items, setItems] = useState<ShoppingListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [draft, setDraft] = useState<ItemDraft>(emptyDraft);
    const [draftError, setDraftError] = useState("");
    const [duplicateWarning, setDuplicateWarning] = useState(false);
    const [editingItem, setEditingItem] = useState<EditingItem>(null);
    const [editDraft, setEditDraft] = useState<ItemDraft>(emptyDraft);
    const [editError, setEditError] = useState("");
    const [showBought, setShowBought] = useState(true);
    const createInFlight = useRef(false);
    const requestSequence = useRef(0);
    const currentResidence = useRef("");

    const residence = useMemo(
        () => residences.find((item) => item.id === residenceId) ?? null,
        [residences, residenceId]
    );
    const memberName = user?.name?.trim() || user?.email?.split("@")[0] || "Morador";
    const pendingItems = useMemo(() => items.filter((item) => item.status === "PENDENTE"), [items]);
    const boughtItems = useMemo(() => items.filter((item) => item.status === "COMPRADO"), [items]);

    const loadItems = useCallback(async (id: string, showSpinner = true) => {
        const sequence = ++requestSequence.current;
        if (showSpinner) setLoading(true);
        setLoadFailed(false);
        try {
            const nextItems = await getShoppingListItems(id);
            if (sequence === requestSequence.current && currentResidence.current === id) {
                setItems(sortItems(nextItems));
                setError("");
            }
        } catch (loadError: unknown) {
            if (sequence === requestSequence.current && currentResidence.current === id) {
                setError(getErrorMessage(loadError));
                setLoadFailed(true);
            }
        } finally {
            if (
                sequence === requestSequence.current &&
                currentResidence.current === id &&
                showSpinner
            ) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        let active = true;
        getPetResidences()
            .then(async (available) => {
                if (!active) return;
                setResidences(available);
                const first = available[0];
                if (!first) {
                    setLoading(false);
                    return;
                }
                currentResidence.current = first.id;
                setResidenceId(first.id);
                await loadItems(first.id);
            })
            .catch((loadError: unknown) => {
                if (active) setError(getErrorMessage(loadError));
            })
            .finally(() => {
                if (active && !currentResidence.current) setLoading(false);
            });
        return () => {
            active = false;
            requestSequence.current += 1;
        };
    }, [loadItems]);

    async function changeResidence(id: string) {
        currentResidence.current = id;
        setResidenceId(id);
        setItems([]);
        setError("");
        setNotice("");
        setDraft(emptyDraft);
        setDuplicateWarning(false);
        setEditingItem(null);
        setEditError("");
        await loadItems(id);
    }

    async function submitNewItem(addDuplicateAnyway = false) {
        if (busy || createInFlight.current) return;
        setDraftError("");
        if (!residenceId) return;
        const input = parseDraft(draft);
        if (!input) {
            setDraftError(
                getDraftValidationError(draft) ?? "Confira os dados informados para o item."
            );
            return;
        }
        const duplicate = pendingItems.some(
            (item) => normalizeName(item.name) === normalizeName(input.name)
        );
        if (duplicate && !addDuplicateAnyway) {
            setDuplicateWarning(true);
            return;
        }
        createInFlight.current = true;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const created = await createShoppingListItem(residenceId, input);
            if (currentResidence.current === residenceId) {
                setItems((current) => sortItems([created, ...current]));
                setDraft(emptyDraft);
                setDuplicateWarning(false);
                setNotice("Item adicionado à lista.");
            }
        } catch (saveError: unknown) {
            if (currentResidence.current === residenceId) {
                setDraftError(getErrorMessage(saveError));
            }
        } finally {
            createInFlight.current = false;
            setBusy(false);
        }
    }

    async function changeStatus(item: ShoppingListItem, status: ShoppingListStatus) {
        if (!residenceId || busy) return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const updated = await updateShoppingListStatus(residenceId, item, status);
            if (currentResidence.current === residenceId) {
                setItems((current) =>
                    sortItems(
                        current.map((candidate) =>
                            candidate.id === updated.id ? updated : candidate
                        )
                    )
                );
            }
        } catch (statusError: unknown) {
            const message = getErrorMessage(statusError);
            if (
                currentResidence.current === residenceId &&
                message.includes("alterado por outro morador")
            ) {
                await loadItems(residenceId, false);
            }
            if (currentResidence.current === residenceId) setError(message);
        } finally {
            setBusy(false);
        }
    }

    function beginEdit(item: ShoppingListItem) {
        setEditingItem(item);
        setEditDraft({
            name: item.name,
            quantity: item.quantity === null ? "" : String(item.quantity).replace(".", ","),
            unit: item.unit ?? "",
            notes: item.notes ?? "",
        });
        setEditError("");
    }

    async function saveEdit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!residenceId || !editingItem || busy) return;
        const input = parseDraft(editDraft);
        if (!input) {
            setEditError(
                getDraftValidationError(editDraft) ?? "Confira os dados informados para o item."
            );
            return;
        }
        setBusy(true);
        setEditError("");
        try {
            const updated = await updateShoppingListItem(
                residenceId,
                editingItem.id,
                editingItem.version,
                input
            );
            if (currentResidence.current === residenceId) {
                setItems((current) =>
                    sortItems(current.map((item) => (item.id === updated.id ? updated : item)))
                );
                setEditingItem(null);
                setNotice("Item atualizado.");
            }
        } catch (saveError: unknown) {
            const message = getErrorMessage(saveError);
            if (
                currentResidence.current === residenceId &&
                message.includes("alterado por outro morador")
            ) {
                await loadItems(residenceId, false);
            }
            if (currentResidence.current === residenceId) setEditError(message);
        } finally {
            setBusy(false);
        }
    }

    async function removeItem(item: ShoppingListItem) {
        if (
            busy ||
            !residenceId ||
            !window.confirm("Remover este item da lista? Esta ação não pode ser desfeita.")
        )
            return;
        setBusy(true);
        setError("");
        try {
            await deleteShoppingListItem(residenceId, item);
            if (currentResidence.current === residenceId) {
                setItems((current) => current.filter((candidate) => candidate.id !== item.id));
                setNotice("Item removido da lista.");
            }
        } catch (removeError: unknown) {
            const message = getErrorMessage(removeError);
            if (
                currentResidence.current === residenceId &&
                message.includes("alterado por outro morador")
            ) {
                await loadItems(residenceId, false);
            }
            if (currentResidence.current === residenceId) setError(message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#f8f4fa] text-[#29252d] md:flex">
            <AppSidebar activeSection="shopping-list" residenceName={residence?.name} />
            <div className="min-w-0 flex-1">
                <AppPageHeader
                    greetingName={memberName}
                    residenceName={residence?.name ?? "Nenhuma casa ativa"}
                    settingsHref="/settings"
                    residenceControl={
                        residences.length > 1 ? (
                            <label className="flex items-center gap-2 rounded-xl bg-[#e8e5e9] p-1 text-xs">
                                <span className="sr-only">Trocar residência</span>
                                <select
                                    value={residenceId}
                                    onChange={(event) => void changeResidence(event.target.value)}
                                    className="max-w-56 rounded-lg border-0 bg-[#4e812f] px-4 py-2 text-white outline-none"
                                >
                                    {residences.map((item) => (
                                        <option
                                            key={item.id}
                                            value={item.id}
                                            className="bg-white text-[#29252d]"
                                        >
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null
                    }
                    profile={
                        <span
                            className="grid size-10 place-items-center rounded-full bg-[#4f7f63] font-semibold text-white"
                            aria-label="Perfil"
                        >
                            {memberName.slice(0, 1).toUpperCase()}
                        </span>
                    }
                />

                <main className="mx-auto max-w-4xl p-4 md:p-6">
                    {error && (
                        <div
                            role="alert"
                            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                        >
                            <span>
                                {loadFailed
                                    ? "Não foi possível carregar a lista de compras."
                                    : error}
                            </span>
                            {loadFailed && residenceId && (
                                <button
                                    type="button"
                                    onClick={() => void loadItems(residenceId)}
                                    className="rounded-md border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100"
                                >
                                    Tentar novamente
                                </button>
                            )}
                        </div>
                    )}
                    {notice && (
                        <div
                            role="status"
                            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                        >
                            {notice}
                        </div>
                    )}

                    {!loading && residences.length === 0 ? (
                        <section className="rounded-xl border border-[#d6cdd9] bg-[#fffaff] p-8 text-center">
                            <ShoppingBasket className="mx-auto mb-3 text-[#4e812f]" size={32} />
                            <h2 className="font-semibold">Nenhuma casa ativa</h2>
                            <p className="mt-2 text-sm text-[#77717c]">
                                Entre ou crie uma residência para usar a lista de compras.
                            </p>
                        </section>
                    ) : (
                        <>
                            <section className="mb-5 rounded-xl border border-[#d6cdd9] bg-[#fffaff] p-4 md:p-5">
                                <h1 className="mb-1 text-xl font-bold">Lista de compras</h1>
                                <p className="mb-4 text-sm text-[#77717c]">
                                    Compartilhe os itens que faltam com os moradores da casa.
                                </p>
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void submitNewItem();
                                    }}
                                    className="grid gap-3"
                                >
                                    <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_150px_150px]">
                                        <label className="grid gap-1.5 text-xs font-medium text-[#514c56]">
                                            Item
                                            <input
                                                required
                                                maxLength={100}
                                                value={draft.name}
                                                onChange={(event) => {
                                                    setDraft({
                                                        ...draft,
                                                        name: event.target.value,
                                                    });
                                                    setDuplicateWarning(false);
                                                }}
                                                placeholder="Ex.: Café"
                                                className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                            />
                                        </label>
                                        <label className="grid gap-1.5 text-xs font-medium text-[#514c56]">
                                            Quantidade (opcional)
                                            <input
                                                inputMode="decimal"
                                                value={draft.quantity}
                                                onChange={(event) =>
                                                    setDraft({
                                                        ...draft,
                                                        quantity: event.target.value,
                                                    })
                                                }
                                                placeholder="Ex.: 1,5"
                                                className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                            />
                                        </label>
                                        <label className="grid gap-1.5 text-xs font-medium text-[#514c56]">
                                            Unidade (opcional)
                                            <select
                                                value={draft.unit}
                                                onChange={(event) =>
                                                    setDraft({
                                                        ...draft,
                                                        unit: event.target.value as
                                                            ShoppingListUnit | "",
                                                    })
                                                }
                                                className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                            >
                                                <option value="">Sem quantidade</option>
                                                {Object.entries(unitLabels).map(([unit, label]) => (
                                                    <option key={unit} value={unit}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                    <label className="grid gap-1.5 text-xs font-medium text-[#514c56]">
                                        Observação (opcional)
                                        <input
                                            maxLength={500}
                                            value={draft.notes}
                                            onChange={(event) =>
                                                setDraft({ ...draft, notes: event.target.value })
                                            }
                                            placeholder="Marca, tamanho ou detalhe"
                                            className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                        />
                                    </label>
                                    {duplicateWarning && (
                                        <div
                                            role="alert"
                                            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                                        >
                                            <p>
                                                Já existe um item pendente com esse nome. Deseja
                                                adicionar outro?
                                            </p>
                                            <div className="mt-2 flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => void submitNewItem(true)}
                                                    className="rounded-md bg-[#4e812f] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                                                >
                                                    Adicionar mesmo assim
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDuplicateWarning(false)}
                                                    className="rounded-md border border-amber-300 px-3 py-1.5 text-xs"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {draftError && (
                                        <p
                                            role="alert"
                                            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                                        >
                                            {draftError}
                                        </p>
                                    )}
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={busy || loading || !residenceId}
                                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4e812f] px-5 text-sm font-medium text-white hover:bg-[#3f6c26] disabled:opacity-50"
                                        >
                                            <Plus size={17} />{" "}
                                            {busy ? "Salvando…" : "Adicionar à lista"}
                                        </button>
                                    </div>
                                </form>
                            </section>

                            <section className="overflow-hidden rounded-xl border border-[#d6cdd9] bg-[#fffaff]">
                                <div className="flex items-center justify-between border-b border-[#e2dbe5] px-4 py-3">
                                    <h2 className="font-semibold">
                                        Pendentes{" "}
                                        <span className="ml-1 text-xs font-normal text-[#77717c]">
                                            {pendingItems.length}
                                        </span>
                                    </h2>
                                </div>
                                {loading ? (
                                    <p className="px-5 py-12 text-center text-sm text-[#77717c]">
                                        Carregando lista de compras…
                                    </p>
                                ) : loadFailed && items.length === 0 ? (
                                    <p className="px-5 py-12 text-center text-sm text-[#77717c]">
                                        A lista ainda não foi carregada.
                                    </p>
                                ) : pendingItems.length ? (
                                    <ul className="divide-y divide-[#e7e0e9]">
                                        {pendingItems.map((item) => (
                                            <ShoppingItemRow
                                                key={item.id}
                                                item={item}
                                                busy={busy}
                                                onStatus={(status) =>
                                                    void changeStatus(item, status)
                                                }
                                                onEdit={() => beginEdit(item)}
                                                onDelete={() => void removeItem(item)}
                                            />
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="px-5 py-12 text-center">
                                        <ShoppingBasket
                                            className="mx-auto mb-2 text-[#8b858e]"
                                            size={28}
                                        />
                                        <p className="font-medium">
                                            {items.length
                                                ? "Nenhum item pendente."
                                                : "Sua lista de compras está vazia."}
                                        </p>
                                    </div>
                                )}
                            </section>

                            {boughtItems.length > 0 && (
                                <section className="mt-4 overflow-hidden rounded-xl border border-[#d6cdd9] bg-[#fffaff]">
                                    <button
                                        type="button"
                                        aria-expanded={showBought}
                                        onClick={() => setShowBought((value) => !value)}
                                        className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold"
                                    >
                                        <span>
                                            Comprados{" "}
                                            <span className="ml-1 text-xs font-normal text-[#77717c]">
                                                {boughtItems.length}
                                            </span>
                                        </span>
                                        {showBought ? (
                                            <ChevronUp size={18} />
                                        ) : (
                                            <ChevronDown size={18} />
                                        )}
                                    </button>
                                    {showBought && (
                                        <ul className="divide-y divide-[#e7e0e9] border-t border-[#e2dbe5]">
                                            {boughtItems.map((item) => (
                                                <ShoppingItemRow
                                                    key={item.id}
                                                    item={item}
                                                    busy={busy}
                                                    onStatus={(status) =>
                                                        void changeStatus(item, status)
                                                    }
                                                    onEdit={() => beginEdit(item)}
                                                    onDelete={() => void removeItem(item)}
                                                />
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            )}
                        </>
                    )}
                </main>
            </div>

            {editingItem && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !busy) setEditingItem(null);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="shopping-edit-title"
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e1d9e5] bg-[#fffaff] p-5 shadow-xl"
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 id="shopping-edit-title" className="text-lg font-bold">
                                    Editar item
                                </h2>
                                <p className="mt-1 text-sm text-[#77717c]">
                                    Atualize os dados do item compartilhado.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => setEditingItem(null)}
                                aria-label="Fechar"
                                className="grid size-9 place-items-center rounded-lg hover:bg-[#f1edf3]"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={(event) => void saveEdit(event)} className="grid gap-4">
                            <label className="grid gap-1.5 text-xs font-medium text-[#514c56]">
                                Nome do item
                                <input
                                    required
                                    maxLength={100}
                                    value={editDraft.name}
                                    onChange={(event) =>
                                        setEditDraft({ ...editDraft, name: event.target.value })
                                    }
                                    className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                />
                            </label>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="grid gap-1.5 text-xs font-medium text-[#514c56]">
                                    Quantidade
                                    <input
                                        inputMode="decimal"
                                        value={editDraft.quantity}
                                        onChange={(event) =>
                                            setEditDraft({
                                                ...editDraft,
                                                quantity: event.target.value,
                                            })
                                        }
                                        className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                    />
                                </label>
                                <label className="grid gap-1.5 text-xs font-medium text-[#514c56]">
                                    Unidade
                                    <select
                                        value={editDraft.unit}
                                        onChange={(event) =>
                                            setEditDraft({
                                                ...editDraft,
                                                unit: event.target.value as ShoppingListUnit | "",
                                            })
                                        }
                                        className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                    >
                                        <option value="">Sem quantidade</option>
                                        {Object.entries(unitLabels).map(([unit, label]) => (
                                            <option key={unit} value={unit}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <label className="grid gap-1.5 text-xs font-medium text-[#514c56]">
                                Observação (opcional)
                                <textarea
                                    maxLength={500}
                                    value={editDraft.notes}
                                    onChange={(event) =>
                                        setEditDraft({ ...editDraft, notes: event.target.value })
                                    }
                                    rows={3}
                                    className="rounded-lg border border-[#d9d1de] bg-white p-3 text-sm outline-none focus:border-[#4e812f]"
                                />
                            </label>
                            {editError && (
                                <p
                                    role="alert"
                                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                                >
                                    {editError}
                                </p>
                            )}
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setEditingItem(null)}
                                    className="h-10 rounded-lg border border-[#d9d1de] px-4 text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="h-10 rounded-lg bg-[#4e812f] px-5 text-sm font-medium text-white disabled:opacity-50"
                                >
                                    {busy ? "Salvando…" : "Salvar"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}

function ShoppingItemRow({
    item,
    busy,
    onStatus,
    onEdit,
    onDelete,
}: {
    item: ShoppingListItem;
    busy: boolean;
    onStatus: (status: ShoppingListStatus) => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const bought = item.status === "COMPRADO";
    return (
        <li className="flex items-start gap-3 px-4 py-3">
            <button
                type="button"
                disabled={busy}
                onClick={() => onStatus(bought ? "PENDENTE" : "COMPRADO")}
                aria-label={bought ? `Reabrir ${item.name}` : `Marcar ${item.name} como comprado`}
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border ${bought ? "border-[#4e812f] bg-[#4e812f] text-white" : "border-[#bdb5c1] bg-white text-transparent hover:border-[#4e812f]"} disabled:opacity-50`}
            >
                {bought && <Check size={15} />}
            </button>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className={`font-medium ${bought ? "text-[#77717c] line-through" : ""}`}>
                        {item.name}
                    </span>
                    {formatItemAmount(item) && (
                        <span className="text-sm text-[#625c66]">{formatItemAmount(item)}</span>
                    )}
                </div>
                {item.notes && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[#625c66]">{item.notes}</p>
                )}
                <p className="mt-1 text-xs text-[#89828d]">
                    {bought
                        ? `Comprado${item.purchasedByName ? ` por ${item.purchasedByName}` : ""}${item.purchasedAt ? ` · ${formatDate(item.purchasedAt)}` : ""}`
                        : item.createdByName
                          ? `Adicionado por ${item.createdByName}`
                          : "Na lista compartilhada"}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <button
                    type="button"
                    disabled={busy}
                    onClick={onEdit}
                    aria-label={`Editar ${item.name}`}
                    className="grid size-8 place-items-center rounded-md text-[#625c66] hover:bg-[#f1edf3] disabled:opacity-40"
                >
                    <Pencil size={15} />
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={onDelete}
                    aria-label={`Excluir ${item.name}`}
                    className="grid size-8 place-items-center rounded-md text-[#9a5555] hover:bg-red-50 disabled:opacity-40"
                >
                    <Trash2 size={15} />
                </button>
            </div>
        </li>
    );
}
