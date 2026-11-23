"use client";
import { SystemSelect } from "@/components/ui/system-select";

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

const emptyDraft: ItemDraft = { name: "", quantity: "1", unit: "UNIDADE", notes: "" };
const unitLabels: Record<ShoppingListUnit, string> = {
    UNIDADE: "un",
    KG: "kg",
    G: "g",
    L: "L",
    ML: "ml",
    PACOTE: "pacote(s)",
};

function isIntegerUnit(unit: ShoppingListUnit | "") {
    return unit === "UNIDADE" || unit === "PACOTE" || unit === "G" || unit === "ML";
}

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
    const validQuantity = isIntegerUnit(draft.unit)
        ? /^\d+$/.test(quantityText)
        : /^\d+(?:\.\d)?$/.test(quantityText);
    if (quantityText && (!validQuantity || Number(quantityText) <= 0)) {
        return isIntegerUnit(draft.unit)
            ? "Informe uma quantidade inteira para esta unidade."
            : "Use no máximo uma casa decimal para esta unidade.";
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
        unit: quantity === null ? null : draft.unit || null,
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
    const [scope, setScope] = useState<"HOME" | "PERSONAL">("HOME");
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
    const [itemToDelete, setItemToDelete] = useState<ShoppingListItem | null>(null);
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
            const personal = id === "personal";
            const nextItems = await getShoppingListItems(personal ? "" : id, personal);
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
                const initialScope = first ? "HOME" : "PERSONAL";
                setScope(initialScope);
                currentResidence.current = first?.id ?? "personal";
                if (first) setResidenceId(first.id);
                await loadItems(first?.id ?? "personal");
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
        setScope("HOME");
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

    async function changeScope(nextScope: "HOME" | "PERSONAL", homeId = residenceId) {
        if (nextScope === "HOME") {
            const id = homeId || residences[0]?.id;
            if (id) await changeResidence(id);
            return;
        }
        setScope("PERSONAL");
        currentResidence.current = "personal";
        setItems([]);
        setError("");
        setNotice("");
        setDraft(emptyDraft);
        setDuplicateWarning(false);
        setEditingItem(null);
        setEditError("");
        await loadItems("personal");
    }

    async function submitNewItem(addDuplicateAnyway = false) {
        if (busy || createInFlight.current) return;
        setDraftError("");
        const isPersonal = scope === "PERSONAL";
        const activeContextId = isPersonal ? "personal" : residenceId;
        if (!isPersonal && !residenceId) return;
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
            const created = await createShoppingListItem(residenceId, input, isPersonal);
            if (currentResidence.current === activeContextId) {
                setItems((current) => sortItems([created, ...current]));
                setDraft(emptyDraft);
                setDuplicateWarning(false);
                setNotice("Item adicionado à lista.");
            }
        } catch (saveError: unknown) {
            if (currentResidence.current === activeContextId) {
                setDraftError(getErrorMessage(saveError));
            }
        } finally {
            createInFlight.current = false;
            setBusy(false);
        }
    }

    async function changeStatus(item: ShoppingListItem, status: ShoppingListStatus) {
        const isPersonal = scope === "PERSONAL";
        const activeContextId = isPersonal ? "personal" : residenceId;
        if ((!isPersonal && !residenceId) || busy) return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const updated = await updateShoppingListStatus(residenceId, item, status, isPersonal);
            if (currentResidence.current === activeContextId) {
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
                currentResidence.current === activeContextId &&
                message.includes("alterado por outro morador")
            ) {
                await loadItems(activeContextId, false);
            }
            if (currentResidence.current === activeContextId) setError(message);
        } finally {
            setBusy(false);
        }
    }

    function beginEdit(item: ShoppingListItem) {
        setEditingItem(item);
        setEditDraft({
            name: item.name,
            quantity: item.quantity === null ? "" : String(item.quantity),
            unit: item.unit ?? "",
            notes: item.notes ?? "",
        });
        setEditError("");
    }

    async function saveEdit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const isPersonal = scope === "PERSONAL";
        const activeContextId = isPersonal ? "personal" : residenceId;
        if ((!isPersonal && !residenceId) || !editingItem || busy) return;
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
                input,
                isPersonal
            );
            if (currentResidence.current === activeContextId) {
                setItems((current) =>
                    sortItems(current.map((item) => (item.id === updated.id ? updated : item)))
                );
                setEditingItem(null);
                setNotice("Item atualizado.");
            }
        } catch (saveError: unknown) {
            const message = getErrorMessage(saveError);
            if (
                currentResidence.current === activeContextId &&
                message.includes("alterado por outro morador")
            ) {
                await loadItems(activeContextId, false);
            }
            if (currentResidence.current === activeContextId) setEditError(message);
        } finally {
            setBusy(false);
        }
    }

    function removeItem(item: ShoppingListItem) {
        setError("");
        setItemToDelete(item);
    }

    async function confirmRemoveItem() {
        const isPersonal = scope === "PERSONAL";
        const activeContextId = isPersonal ? "personal" : residenceId;
        if (busy || !itemToDelete || (!isPersonal && !residenceId)) return;
        setBusy(true);
        setError("");
        try {
            await deleteShoppingListItem(residenceId, itemToDelete, isPersonal);
            if (currentResidence.current === activeContextId) {
                setItems((current) =>
                    current.filter((candidate) => candidate.id !== itemToDelete.id)
                );
                setNotice("Item removido da lista.");
            }
            setItemToDelete(null);
        } catch (removeError: unknown) {
            const message = getErrorMessage(removeError);
            if (
                currentResidence.current === activeContextId &&
                message.includes("alterado por outro morador")
            ) {
                await loadItems(activeContextId, false);
            }
            if (currentResidence.current === activeContextId) setError(message);
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
                    residenceName={
                        scope === "HOME" ? (residence?.name ?? "Nenhuma casa ativa") : undefined
                    }
                    subtitle={scope === "PERSONAL" ? "Lista de compras pessoal" : undefined}
                    settingsHref="/settings"
                    residenceControl={
                        <div
                            className="grid grid-cols-2 gap-1 rounded-xl bg-[#e8e5e9] p-1 text-xs"
                            role="group"
                            aria-label="Tipo de lista de compras"
                        >
                            <button
                                type="button"
                                aria-pressed={scope === "PERSONAL"}
                                onClick={() => void changeScope("PERSONAL")}
                                className={`h-9 min-w-24 rounded-lg px-4 font-semibold ${scope === "PERSONAL" ? "bg-[#4e812f] text-white" : "text-[#514c56]"}`}
                            >
                                Pessoal
                            </button>
                            {residences.length > 1 ? (
                                <SystemSelect
                                    aria-label="Lista da casa"
                                    value={residenceId}
                                    onChange={(event) =>
                                        void changeScope("HOME", event.target.value)
                                    }
                                    className={`h-9 min-h-0! max-w-56 border-0! text-xs! font-semibold ${scope === "HOME" ? "bg-[#3e6b25]! text-white! [&_svg]:text-white!" : "bg-transparent! text-[#514c56]!"}`}
                                >
                                    {residences.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </SystemSelect>
                            ) : (
                                <button
                                    type="button"
                                    aria-pressed={scope === "HOME"}
                                    disabled={!residences.length}
                                    onClick={() => void changeScope("HOME")}
                                    title={residence?.name ?? "Nenhuma casa ativa"}
                                    className={`h-9 min-w-24 truncate rounded-lg px-4 font-semibold disabled:opacity-40 ${scope === "HOME" ? "bg-[#4e812f] text-white" : "text-[#514c56]"}`}
                                >
                                    {residence?.name ?? "Casa"}
                                </button>
                            )}
                        </div>
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
                            {loadFailed && (scope === "PERSONAL" || residenceId) && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        void loadItems(
                                            scope === "PERSONAL" ? "personal" : residenceId
                                        )
                                    }
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

                    {!loading && scope === "HOME" && residences.length === 0 ? (
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
                                <h1 className="mb-1 text-xl font-bold">
                                    {scope === "PERSONAL"
                                        ? "Lista pessoal"
                                        : "Lista de compras da casa"}
                                </h1>
                                <p className="mb-4 text-sm text-[#77717c]">
                                    {scope === "PERSONAL"
                                        ? "Organize os itens que você quer comprar para si."
                                        : "Compartilhe os itens que faltam com os moradores da casa."}
                                </p>
                                <form
                                    noValidate
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void submitNewItem();
                                    }}
                                    className="grid gap-3"
                                >
                                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_150px_150px]">
                                        <label className="grid min-w-0 gap-1.5 text-xs font-medium text-[#514c56]">
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
                                                className="h-10 w-full min-w-0 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                            />
                                        </label>
                                        <label className="grid min-w-0 gap-1.5 text-xs font-medium text-[#514c56]">
                                            Unidade
                                            <SystemSelect
                                                value={draft.unit || "UNIDADE"}
                                                onChange={(event) =>
                                                    setDraft((current) => ({
                                                        ...current,
                                                        unit: event.target
                                                            .value as ShoppingListUnit,
                                                    }))
                                                }
                                                className="h-10 w-full min-w-0 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                            >
                                                {Object.entries(unitLabels).map(([unit, label]) => (
                                                    <option key={unit} value={unit}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </SystemSelect>
                                        </label>
                                        <label className="grid min-w-0 gap-1.5 text-xs font-medium text-[#514c56]">
                                            Quantidade
                                            <input
                                                type="number"
                                                min={isIntegerUnit(draft.unit) ? "1" : "0.1"}
                                                step={isIntegerUnit(draft.unit) ? "1" : "0.1"}
                                                value={draft.quantity}
                                                onChange={(event) =>
                                                    setDraft({
                                                        ...draft,
                                                        quantity: event.target.value,
                                                    })
                                                }
                                                placeholder={
                                                    draft.unit === "UNIDADE" ||
                                                    draft.unit === "PACOTE"
                                                        ? "Ex.: 2 un"
                                                        : "Ex.: 1,5"
                                                }
                                                className="h-10 w-full min-w-0 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                            />
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
                                            disabled={
                                                busy ||
                                                loading ||
                                                (scope === "HOME" && !residenceId)
                                            }
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
                                                canEdit={
                                                    scope === "PERSONAL" || item.canEdit === true
                                                }
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
                                                    canEdit={
                                                        scope === "PERSONAL" ||
                                                        item.canEdit === true
                                                    }
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
                        <form
                            noValidate
                            onSubmit={(event) => void saveEdit(event)}
                            className="grid gap-4"
                        >
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
                                    Unidade
                                    <SystemSelect
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
                                    </SystemSelect>
                                </label>
                                <label className="grid gap-1.5 text-xs font-medium text-[#514c56]">
                                    Quantidade
                                    <input
                                        type="number"
                                        min={isIntegerUnit(editDraft.unit) ? "1" : "0.1"}
                                        step={isIntegerUnit(editDraft.unit) ? "1" : "0.1"}
                                        value={editDraft.quantity}
                                        onChange={(event) =>
                                            setEditDraft({
                                                ...editDraft,
                                                quantity: event.target.value,
                                            })
                                        }
                                        placeholder={
                                            editDraft.unit === "UNIDADE" ||
                                            editDraft.unit === "PACOTE"
                                                ? "Ex.: 2 un"
                                                : "Ex.: 1,5"
                                        }
                                        className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                    />
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
            {itemToDelete && (
                <div
                    className="fixed inset-0 z-[60] grid place-items-center bg-[#17131a]/50 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !busy) setItemToDelete(null);
                    }}
                >
                    <section
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-shopping-item-title"
                        aria-describedby="delete-shopping-item-description"
                        className="w-full max-w-[400px] rounded-2xl bg-[#fffaff] p-6 shadow-2xl"
                    >
                        <div className="mb-4 flex items-start justify-between">
                            <div className="grid size-10 place-items-center rounded-full bg-red-100 text-red-700">
                                <Trash2 size={19} aria-hidden="true" />
                            </div>
                            <button
                                type="button"
                                aria-label="Fechar confirmação"
                                disabled={busy}
                                onClick={() => setItemToDelete(null)}
                                className="grid size-8 place-items-center rounded text-[#514c56] hover:bg-[#f1edf3] disabled:opacity-50"
                            >
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>
                        <h2 id="delete-shopping-item-title" className="text-lg font-semibold">
                            Remover item da lista?
                        </h2>
                        <p
                            id="delete-shopping-item-description"
                            className="mt-2 text-sm text-[#716b74]"
                        >
                            “{itemToDelete.name}” será removido permanentemente da lista de compras.
                        </p>
                        {error && (
                            <p role="alert" className="mt-3 text-sm text-red-700">
                                {error}
                            </p>
                        )}
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setItemToDelete(null)}
                                disabled={busy}
                                className="h-9 rounded-md border border-[#cfc6d1] px-4 text-xs font-medium hover:bg-[#f3eff5] disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmRemoveItem()}
                                disabled={busy}
                                className="h-9 rounded-md bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {busy ? "Removendo…" : "Remover item"}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

function ShoppingItemRow({
    item,
    busy,
    canEdit,
    onStatus,
    onEdit,
    onDelete,
}: {
    item: ShoppingListItem;
    busy: boolean;
    canEdit: boolean;
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
            {canEdit && (
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
            )}
        </li>
    );
}
