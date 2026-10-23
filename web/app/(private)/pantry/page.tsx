"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import {
    Bell,
    ChevronDown,
    House,
    Minus,
    Package,
    Pencil,
    Plus,
    Search,
    Settings,
    Trash2,
    UsersRound,
    X,
} from "lucide-react";
import { getPetResidences } from "@/features/pets/api/pets.api";
import type { PetResidence } from "@/features/pets/api/pets.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    createPantryItem,
    deletePantryItem,
    getPantryItems,
    getPantryMembers,
    registerPantryMovement,
    updatePantryItem,
} from "@/features/pantry/api/pantry.api";
import type {
    PantryItem,
    PantryItemInput,
    PantryMember,
    PantryMovementType,
    PantryProperty,
    PantryUnit,
} from "@/features/pantry/api/pantry.api";
import { AppSidebar } from "@/components/layout/AppSidebar";

type TabKey = "all" | "communal" | "private" | "mine";
type ItemFormState = {
    name: string;
    category: string;
    property: PantryProperty;
    ownerMemberId: string;
    unit: PantryUnit;
    quantity: string;
    minimumQuantity: string;
    expirationDate: string;
};
type ItemModalState = { mode: "create" } | { mode: "edit"; item: PantryItem } | null;
type MovementModalState = { item: PantryItem; type: PantryMovementType } | null;

const initialForm: ItemFormState = {
    name: "",
    category: "",
    property: "COMUNITARIO",
    ownerMemberId: "",
    unit: "UNIDADE",
    quantity: "",
    minimumQuantity: "",
    expirationDate: "",
};

const unitLabels: Record<PantryUnit, string> = {
    UNIDADE: "un",
    KG: "kg",
    G: "g",
    L: "L",
    ML: "ml",
    PACOTE: "pacote(s)",
};

const standardCategories = [
    "Bebidas",
    "Doces",
    "Grãos",
    "Higiene",
    "Laticínios",
    "Limpeza",
    "Massas",
    "Outros",
];

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

function dateToString(value: string | null) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isExpiringSoon(value: string | null) {
    if (!value) return false;
    const dayNumber = (date: string) => {
        const [year, month, day] = date.split("-").map(Number);
        return Date.UTC(year, month - 1, day) / 86400000;
    };
    const days = dayNumber(value.slice(0, 10)) - dayNumber(localDateString());
    return days >= 0 && days <= 7;
}

function formatQuantity(quantity: number, unit: PantryUnit) {
    const amount = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(quantity);
    return `${amount} ${unitLabels[unit]}`;
}

function itemIsLow(item: PantryItem) {
    return item.minimumQuantity !== null && item.quantity <= item.minimumQuantity;
}

export default function PantryPage() {
    const { user } = useAuth();
    const [residences, setResidences] = useState<PetResidence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [members, setMembers] = useState<PantryMember[]>([]);
    const [items, setItems] = useState<PantryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [activeTab, setActiveTab] = useState<TabKey>("all");
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [expirationFilter, setExpirationFilter] = useState("all");
    const [responsibleFilter, setResponsibleFilter] = useState("");
    const [itemModal, setItemModal] = useState<ItemModalState>(null);
    const [movementModal, setMovementModal] = useState<MovementModalState>(null);
    const [movementQuantity, setMovementQuantity] = useState("1");
    const [movementError, setMovementError] = useState("");
    const [form, setForm] = useState<ItemFormState>(initialForm);
    const [customCategoryMode, setCustomCategoryMode] = useState(false);
    const [formError, setFormError] = useState("");

    const residence = useMemo(
        () => residences.find((item) => item.id === residenceId) ?? null,
        [residences, residenceId]
    );
    const currentMemberId = residence?.membership?.id ?? "";
    const canManageHouse =
        residence?.membership?.role === "LIDER" || residence?.membership?.role === "ADMINISTRADOR";

    const loadResidenceData = useCallback(async (id: string) => {
        const [nextMembers, nextItems] = await Promise.all([
            getPantryMembers(id),
            getPantryItems(id),
        ]);
        setMembers(nextMembers);
        setItems(nextItems);
    }, []);

    useEffect(() => {
        let active = true;
        getPetResidences()
            .then(async (available) => {
                if (!active) return;
                setResidences(available);
                if (available.length > 0) {
                    setResidenceId(available[0].id);
                    await loadResidenceData(available[0].id);
                }
            })
            .catch((loadError: unknown) => {
                if (active) setError(getErrorMessage(loadError));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [loadResidenceData]);

    useEffect(() => {
        if (!itemModal && !movementModal) return;
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setItemModal(null);
                setMovementModal(null);
            }
        }
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [itemModal, movementModal]);

    const categories = useMemo(
        () =>
            [...new Set(items.map((item) => item.category))].sort((a, b) =>
                a.localeCompare(b, "pt-BR")
            ),
        [items]
    );
    const categoryChoices = useMemo(
        () => [...new Set([...standardCategories, ...categories])],
        [categories]
    );

    const filteredItems = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
        return items.filter((item) => {
            if (activeTab === "communal" && item.property !== "COMUNITARIO") return false;
            if (activeTab === "private" && item.property === "COMUNITARIO") return false;
            if (activeTab === "mine" && !item.isMine) return false;
            if (categoryFilter && item.category !== categoryFilter) return false;
            if (responsibleFilter === "__house__" && item.property !== "COMUNITARIO") return false;
            if (
                responsibleFilter &&
                responsibleFilter !== "__house__" &&
                item.ownerMemberId !== responsibleFilter
            )
                return false;
            if (
                normalizedSearch &&
                !`${item.name} ${item.category} ${item.ownerName}`
                    .toLocaleLowerCase("pt-BR")
                    .includes(normalizedSearch)
            )
                return false;
            if (
                expirationFilter === "expired" &&
                (!item.expirationDate || item.expirationDate >= localDateString())
            )
                return false;
            if (expirationFilter === "soon" && !isExpiringSoon(item.expirationDate)) return false;
            if (
                expirationFilter === "valid" &&
                (!item.expirationDate || item.expirationDate < localDateString())
            )
                return false;
            return true;
        });
    }, [activeTab, categoryFilter, expirationFilter, items, responsibleFilter, search]);

    const tabCounts = useMemo(
        () => ({
            all: items.length,
            communal: items.filter((item) => item.property === "COMUNITARIO").length,
            private: items.filter((item) => item.property !== "COMUNITARIO").length,
            mine: items.filter((item) => item.isMine).length,
        }),
        [items]
    );

    async function changeResidence(id: string) {
        setResidenceId(id);
        setMembers([]);
        setItems([]);
        setLoading(true);
        setError("");
        setNotice("");
        try {
            await loadResidenceData(id);
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setForm({ ...initialForm, ownerMemberId: currentMemberId });
        setCustomCategoryMode(false);
        setFormError("");
        setItemModal({ mode: "create" });
    }

    function openEditModal(item: PantryItem) {
        setCustomCategoryMode(![...standardCategories, ...categories].includes(item.category));
        setForm({
            name: item.name,
            category: item.category,
            property: item.property,
            ownerMemberId: item.ownerMemberId ?? currentMemberId,
            unit: item.unit,
            quantity: String(item.quantity),
            minimumQuantity: item.minimumQuantity === null ? "" : String(item.minimumQuantity),
            expirationDate: item.expirationDate ?? "",
        });
        setFormError("");
        setItemModal({ mode: "edit", item });
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError("");
        if (!residenceId) {
            setFormError("Selecione uma residência ativa para usar a despensa.");
            return;
        }
        const quantity = Number(form.quantity.replace(",", "."));
        const minimumQuantity = form.minimumQuantity.trim()
            ? Number(form.minimumQuantity.replace(",", "."))
            : null;
        if (!form.name.trim() || !form.category.trim()) {
            setFormError("Informe o nome e a categoria do item.");
            return;
        }
        if (itemModal?.mode === "create" && (!Number.isFinite(quantity) || quantity < 0)) {
            setFormError("Informe uma quantidade inicial válida.");
            return;
        }
        if (
            minimumQuantity !== null &&
            (!Number.isFinite(minimumQuantity) || minimumQuantity < 0)
        ) {
            setFormError("Informe uma quantidade mínima válida.");
            return;
        }
        setBusy(true);
        try {
            if (itemModal?.mode === "edit") {
                await updatePantryItem(residenceId, itemModal.item.id, {
                    name: form.name.trim(),
                    category: form.category.trim(),
                    property: form.property,
                    ownerMemberId: form.property === "DONO_ESPECIFICO" ? form.ownerMemberId : null,
                    unit: form.unit,
                    minimumQuantity,
                    expirationDate: form.expirationDate || null,
                });
                setNotice("Item atualizado.");
            } else {
                const payload: PantryItemInput = {
                    name: form.name.trim(),
                    category: form.category.trim(),
                    property: form.property,
                    ownerMemberId: form.property === "DONO_ESPECIFICO" ? form.ownerMemberId : null,
                    unit: form.unit,
                    initialQuantity: quantity,
                    minimumQuantity,
                    expirationDate: form.expirationDate || null,
                };
                await createPantryItem(residenceId, payload);
                setNotice("Item adicionado à despensa.");
            }
            await loadResidenceData(residenceId);
            setItemModal(null);
        } catch (saveError: unknown) {
            setFormError(getErrorMessage(saveError));
        } finally {
            setBusy(false);
        }
    }

    function openMovementModal(item: PantryItem, type: PantryMovementType) {
        setMovementQuantity("1");
        setMovementError("");
        setMovementModal({ item, type });
    }

    async function adjustQuantity(item: PantryItem, type: PantryMovementType, quantity: number) {
        if (!residenceId) return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await registerPantryMovement(residenceId, item.id, type, quantity);
            setMovementModal(null);
            setNotice(
                type === "ENTRADA"
                    ? `Entrada de ${formatQuantity(quantity, item.unit)} registrada para ${item.name}.`
                    : `${type === "DESCARTE" ? "Descarte" : "Consumo"} de ${formatQuantity(quantity, item.unit)} registrado para ${item.name}.`
            );
            try {
                await loadResidenceData(residenceId);
            } catch (refreshError: unknown) {
                setError(getErrorMessage(refreshError));
            }
        } catch (movementError: unknown) {
            setMovementError(getErrorMessage(movementError));
        } finally {
            setBusy(false);
        }
    }

    async function handleMovementSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!movementModal) return;
        const normalizedQuantity = movementQuantity.trim().replace(",", ".");
        const quantity = Number(normalizedQuantity);
        if (
            !normalizedQuantity ||
            !Number.isFinite(quantity) ||
            quantity < 0.01 ||
            quantity > 99999999 ||
            !/^\d+(\.\d{1,2})?$/.test(normalizedQuantity)
        ) {
            setMovementError("Informe uma quantidade positiva com até duas casas decimais.");
            return;
        }
        await adjustQuantity(movementModal.item, movementModal.type, quantity);
    }

    async function removeItem(item: PantryItem) {
        if (!residenceId || !window.confirm(`Remover ${item.name} da despensa?`)) return;
        setBusy(true);
        setError("");
        try {
            await deletePantryItem(residenceId, item.id);
            setItems((current) => current.filter((candidate) => candidate.id !== item.id));
            setNotice("Item removido da despensa.");
        } catch (deleteError: unknown) {
            setError(getErrorMessage(deleteError));
        } finally {
            setBusy(false);
        }
    }

    const memberName =
        members.find((member) => member.id === currentMemberId)?.name ??
        user?.email?.split("@")[0] ??
        "Morador";

    return (
        <div className="min-h-screen bg-[#f8f4fa] text-[#29252d] md:flex">
            <AppSidebar activeSection="pantry" residenceName={residence?.name} />

            <div className="min-w-0 flex-1">
                <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#d9d0dc] bg-[#fffaff] px-5 py-3 md:px-7">
                    <div>
                        <h1 className="text-xl font-bold">
                            Bom dia{memberName ? `, ${memberName.split(" ")[0]}` : ""}
                        </h1>
                        <p className="flex items-center gap-1 text-xs text-[#77717c]">
                            <House size={12} /> {residence?.name ?? "Nenhuma casa ativa"}
                        </p>
                    </div>
                    {residences.length > 0 && (
                        <label className="flex items-center gap-2 rounded-xl bg-[#e8e5e9] p-1 text-xs">
                            <span className="sr-only">Casa selecionada</span>
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
                    )}
                    <div className="flex items-center gap-3 text-[#514c56]">
                        <button
                            type="button"
                            aria-label="Notificações"
                            className="grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"
                        >
                            <Bell size={19} />
                        </button>
                        <Link
                            href="/settings"
                            aria-label="Configurações"
                            className="grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"
                        >
                            <Settings size={19} />
                        </Link>
                        <span
                            className="grid size-10 place-items-center rounded-full bg-[#4f7f63] font-semibold text-white"
                            aria-label="Perfil"
                        >
                            {memberName.slice(0, 1).toUpperCase()}
                        </span>
                    </div>
                </header>

                <main className="mx-auto max-w-[1500px] p-4 md:p-6">
                    {error && (
                        <div
                            role="alert"
                            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                        >
                            {error}
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
                            <House className="mx-auto mb-3 text-[#4e812f]" size={32} />
                            <h2 className="font-semibold">Nenhuma casa ativa</h2>
                            <p className="mt-2 text-sm text-[#77717c]">
                                Entre ou crie uma residência para acessar a despensa.
                            </p>
                        </section>
                    ) : (
                        <>
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                <div
                                    className="flex flex-wrap gap-1 rounded-xl bg-[#f1edf3] p-1"
                                    role="tablist"
                                    aria-label="Tipo de item"
                                >
                                    <TabButton
                                        label="Todos"
                                        count={tabCounts.all}
                                        active={activeTab === "all"}
                                        onClick={() => setActiveTab("all")}
                                    />
                                    <TabButton
                                        label="Comunitários"
                                        count={tabCounts.communal}
                                        active={activeTab === "communal"}
                                        onClick={() => setActiveTab("communal")}
                                    />
                                    <TabButton
                                        label="Privados"
                                        count={tabCounts.private}
                                        active={activeTab === "private"}
                                        onClick={() => setActiveTab("private")}
                                    />
                                    <TabButton
                                        label="Meus itens"
                                        count={tabCounts.mine}
                                        active={activeTab === "mine"}
                                        onClick={() => setActiveTab("mine")}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={openCreateModal}
                                    disabled={!residenceId || busy}
                                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4e812f] px-5 text-sm font-medium text-white hover:bg-[#3f6c26] disabled:opacity-50"
                                >
                                    <Plus size={17} /> Adicionar item
                                </button>
                            </div>

                            <section className="overflow-hidden rounded-xl border border-[#d6cdd9] bg-[#fffaff]">
                                <div className="grid gap-2 border-b border-[#e2dbe5] p-3 md:grid-cols-[minmax(200px,1fr)_150px_150px_175px]">
                                    <label className="relative">
                                        <Search
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89828d]"
                                            size={16}
                                        />
                                        <input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Buscar item..."
                                            className="h-10 w-full rounded-lg border border-[#d9d1de] bg-[#fffaff] pl-9 pr-3 text-sm outline-none focus:border-[#4e812f]"
                                        />
                                    </label>
                                    <SelectFilter
                                        label="Categoria"
                                        value={categoryFilter}
                                        onChange={setCategoryFilter}
                                    >
                                        <option value="">Todas</option>
                                        {categories.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </SelectFilter>
                                    <SelectFilter
                                        label="Validade"
                                        value={expirationFilter}
                                        onChange={setExpirationFilter}
                                    >
                                        <option value="all">Todas</option>
                                        <option value="soon">Vence em 7 dias</option>
                                        <option value="expired">Vencidos</option>
                                        <option value="valid">Dentro da validade</option>
                                    </SelectFilter>
                                    <SelectFilter
                                        label="Responsável"
                                        value={responsibleFilter}
                                        onChange={setResponsibleFilter}
                                    >
                                        <option value="">Todos</option>
                                        <option value="__house__">Casa</option>
                                        {members.map((member) => (
                                            <option key={member.id} value={member.id}>
                                                {member.name}
                                            </option>
                                        ))}
                                    </SelectFilter>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[790px] border-collapse text-left text-sm">
                                        <thead className="bg-[#fcfaff] text-xs text-[#6e6872]">
                                            <tr className="border-b border-[#e2dbe5]">
                                                <th scope="col" className="px-2 py-3 font-medium">
                                                    Item
                                                </th>
                                                <th scope="col" className="px-2 py-3 font-medium">
                                                    Categoria
                                                </th>
                                                <th scope="col" className="px-2 py-3 font-medium">
                                                    Tipo
                                                </th>
                                                <th scope="col" className="px-2 py-3 font-medium">
                                                    Responsável
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-2 py-3 font-semibold text-[#29252d]"
                                                >
                                                    Quantidade
                                                </th>
                                                <th scope="col" className="px-2 py-3 font-medium">
                                                    Validade
                                                </th>
                                                <th scope="col" className="w-24 px-2 py-3">
                                                    <span className="sr-only">Gerenciar</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="px-5 py-12 text-center text-sm text-[#77717c]"
                                                    >
                                                        Carregando itens da despensa…
                                                    </td>
                                                </tr>
                                            ) : filteredItems.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="px-5 py-12 text-center"
                                                    >
                                                        <Package
                                                            className="mx-auto mb-2 text-[#8b858e]"
                                                            size={28}
                                                        />
                                                        <p className="font-medium">
                                                            {items.length
                                                                ? "Nenhum item corresponde aos filtros."
                                                                : "Sua despensa ainda está vazia."}
                                                        </p>
                                                        {!items.length && (
                                                            <p className="mt-1 text-sm text-[#77717c]">
                                                                Adicione o primeiro item para
                                                                começar a organizar o estoque.
                                                            </p>
                                                        )}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredItems.map((item) => (
                                                    <tr
                                                        key={item.id}
                                                        className="border-b border-[#e7e0e9] last:border-b-0 hover:bg-[#fdfbfe]"
                                                    >
                                                        <td className="px-2 py-3 font-semibold">
                                                            {item.name}
                                                        </td>
                                                        <td className="px-2 py-3 text-[#6e6872]">
                                                            {item.category}
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <span
                                                                className={`rounded-full px-2 py-1 text-[11px] ${item.property === "COMUNITARIO" ? "bg-[#e7f0e9] text-[#46754e]" : item.property === "PRIVADO" ? "bg-[#e2effb] text-[#3478ad]" : "bg-[#f3e9d5] text-[#8a6324]"}`}
                                                            >
                                                                {item.property === "COMUNITARIO"
                                                                    ? "Comunitário"
                                                                    : item.property === "PRIVADO"
                                                                      ? "Privado"
                                                                      : "Dono específico"}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-3 text-[#6e6872]">
                                                            <span className="inline-flex items-center gap-2">
                                                                {item.property === "COMUNITARIO" ? (
                                                                    <UsersRound
                                                                        size={17}
                                                                        className="text-[#514c56]"
                                                                    />
                                                                ) : (
                                                                    <span className="grid size-5 place-items-center rounded bg-[#86b89b] text-[10px] font-bold text-white">
                                                                        {item.ownerName
                                                                            .slice(0, 1)
                                                                            .toUpperCase()}
                                                                    </span>
                                                                )}
                                                                {item.ownerName}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <span
                                                                className={
                                                                    itemIsLow(item)
                                                                        ? "font-semibold text-amber-700"
                                                                        : "text-[#6e6872]"
                                                                }
                                                            >
                                                                {formatQuantity(
                                                                    item.quantity,
                                                                    item.unit
                                                                )}
                                                            </span>
                                                            {itemIsLow(item) && (
                                                                <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
                                                                    Estoque baixo
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-3 text-xs">
                                                            <span
                                                                className={
                                                                    item.expirationDate &&
                                                                    (item.expirationDate <
                                                                        localDateString() ||
                                                                        isExpiringSoon(
                                                                            item.expirationDate
                                                                        ))
                                                                        ? "font-medium text-amber-700"
                                                                        : "text-[#6e6872]"
                                                                }
                                                            >
                                                                {dateToString(item.expirationDate)}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {item.property === "COMUNITARIO" ||
                                                                item.isMine ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={busy}
                                                                        onClick={() =>
                                                                            openMovementModal(
                                                                                item,
                                                                                "CONSUMO"
                                                                            )
                                                                        }
                                                                        aria-label={`Registrar consumo de ${item.name}`}
                                                                        className="grid size-8 place-items-center rounded-md text-[#625c66] hover:bg-[#f1edf3] disabled:opacity-40"
                                                                    >
                                                                        <Minus size={15} />
                                                                    </button>
                                                                ) : null}
                                                                {item.property === "COMUNITARIO" ||
                                                                item.isMine ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={busy}
                                                                        onClick={() =>
                                                                            openMovementModal(
                                                                                item,
                                                                                "ENTRADA"
                                                                            )
                                                                        }
                                                                        aria-label={`Registrar entrada para ${item.name}`}
                                                                        className="grid size-8 place-items-center rounded-md text-[#4e812f] hover:bg-[#e7f0e9] disabled:opacity-40"
                                                                    >
                                                                        <Plus size={15} />
                                                                    </button>
                                                                ) : null}
                                                                {item.property === "COMUNITARIO" ||
                                                                item.isMine ||
                                                                canManageHouse ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={busy}
                                                                        onClick={() =>
                                                                            openEditModal(item)
                                                                        }
                                                                        aria-label={`Editar ${item.name}`}
                                                                        className="grid size-8 place-items-center rounded-md text-[#625c66] hover:bg-[#f1edf3] disabled:opacity-40"
                                                                    >
                                                                        <Pencil size={15} />
                                                                    </button>
                                                                ) : null}
                                                                {item.property === "COMUNITARIO" ||
                                                                item.isMine ||
                                                                canManageHouse ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={busy}
                                                                        onClick={() =>
                                                                            void removeItem(item)
                                                                        }
                                                                        aria-label={`Excluir ${item.name}`}
                                                                        className="grid size-8 place-items-center rounded-md text-[#9a5555] hover:bg-red-50 disabled:opacity-40"
                                                                    >
                                                                        <Trash2 size={15} />
                                                                    </button>
                                                                ) : null}
                                                                {item.property ===
                                                                    "DONO_ESPECIFICO" &&
                                                                    !item.isMine &&
                                                                    !canManageHouse && (
                                                                        <span className="px-1 text-[10px] text-[#77717c]">
                                                                            Somente responsável
                                                                        </span>
                                                                    )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <footer className="border-t border-[#e2dbe5] px-4 py-3 text-xs text-[#77717c]">
                                    {filteredItems.length}{" "}
                                    {filteredItems.length === 1 ? "item" : "itens"}
                                </footer>
                            </section>
                        </>
                    )}
                </main>
            </div>

            {itemModal && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setItemModal(null);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pantry-item-title"
                        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e1d9e5] bg-[#fffaff] p-5 shadow-xl"
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 id="pantry-item-title" className="text-lg font-bold">
                                    {itemModal.mode === "edit" ? "Editar item" : "Adicionar item"}
                                </h2>
                                <p className="mt-1 text-sm text-[#77717c]">
                                    Organize o estoque da sua casa.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setItemModal(null)}
                                aria-label="Fechar"
                                className="grid size-9 place-items-center rounded-lg hover:bg-[#f1edf3]"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4">
                            <FormField label="Nome do item">
                                <input
                                    autoFocus
                                    required
                                    maxLength={150}
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm({ ...form, name: event.target.value })
                                    }
                                    className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                    placeholder="Ex.: Arroz"
                                />
                            </FormField>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField label="Categoria">
                                    <select
                                        required={!customCategoryMode}
                                        value={customCategoryMode ? "__custom__" : form.category}
                                        onChange={(event) => {
                                            const isCustom = event.target.value === "__custom__";
                                            setCustomCategoryMode(isCustom);
                                            setForm({
                                                ...form,
                                                category: isCustom ? "" : event.target.value,
                                            });
                                        }}
                                        className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                    >
                                        <option value="">Selecione uma categoria</option>
                                        {categoryChoices.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                        <option value="__custom__">Outra categoria</option>
                                    </select>
                                    {customCategoryMode && (
                                        <input
                                            required
                                            autoFocus
                                            maxLength={80}
                                            value={form.category}
                                            onChange={(event) =>
                                                setForm({ ...form, category: event.target.value })
                                            }
                                            className="mt-2 h-10 w-full rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                            placeholder="Digite a categoria"
                                        />
                                    )}
                                </FormField>
                                <fieldset className="grid gap-2 sm:col-span-2">
                                    <legend className="mb-2 text-xs font-medium">
                                        Tipo de item
                                    </legend>
                                    {(
                                        [
                                            [
                                                "COMUNITARIO",
                                                "Comunitário",
                                                "Disponível para todos os moradores da casa",
                                            ],
                                            [
                                                "PRIVADO",
                                                "Privado",
                                                "Apenas você pode ver e utilizar",
                                            ],
                                            [
                                                "DONO_ESPECIFICO",
                                                "Dono específico",
                                                "Pertence a um morador da casa",
                                            ],
                                        ] as const
                                    ).map(([value, label, description]) => (
                                        <label
                                            key={value}
                                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${form.property === value ? "border-[#4e812f] bg-[#edf5e9]" : "border-[#e1d9e5] bg-white"}`}
                                        >
                                            <input
                                                type="radio"
                                                name="property"
                                                value={value}
                                                checked={form.property === value}
                                                onChange={() =>
                                                    setForm({ ...form, property: value })
                                                }
                                                className="mt-0.5 accent-[#4e812f]"
                                            />
                                            <span>
                                                <span className="block text-sm font-semibold">
                                                    {label}
                                                </span>
                                                <span className="block text-xs text-[#77717c]">
                                                    {description}
                                                </span>
                                            </span>
                                        </label>
                                    ))}
                                </fieldset>
                            </div>
                            {form.property === "DONO_ESPECIFICO" && (
                                <FormField label="Responsável">
                                    <select
                                        required
                                        value={form.ownerMemberId}
                                        onChange={(event) =>
                                            setForm({ ...form, ownerMemberId: event.target.value })
                                        }
                                        className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                    >
                                        {members.map((member) => (
                                            <option key={member.id} value={member.id}>
                                                {member.name}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                            )}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    label={
                                        itemModal.mode === "edit"
                                            ? "Quantidade atual"
                                            : "Quantidade inicial"
                                    }
                                >
                                    <div className="flex gap-2">
                                        <input
                                            required={itemModal.mode === "create"}
                                            disabled={itemModal.mode === "edit"}
                                            inputMode="decimal"
                                            value={
                                                itemModal.mode === "edit"
                                                    ? formatQuantity(
                                                          Number(form.quantity),
                                                          form.unit
                                                      )
                                                    : form.quantity
                                            }
                                            onChange={(event) =>
                                                setForm({ ...form, quantity: event.target.value })
                                            }
                                            className="h-10 min-w-0 flex-1 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f] disabled:bg-[#f5f2f6]"
                                            placeholder="0"
                                        />
                                        <select
                                            value={form.unit}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    unit: event.target.value as PantryUnit,
                                                })
                                            }
                                            className="h-10 rounded-lg border border-[#d9d1de] bg-white px-2 text-sm outline-none focus:border-[#4e812f]"
                                        >
                                            {Object.entries(unitLabels).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </FormField>
                                <FormField label="Quantidade mínima (opcional)">
                                    <input
                                        inputMode="decimal"
                                        value={form.minimumQuantity}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                minimumQuantity: event.target.value,
                                            })
                                        }
                                        className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                        placeholder="Sem alerta"
                                    />
                                </FormField>
                            </div>
                            <FormField label="Validade (opcional)">
                                <input
                                    type="date"
                                    value={form.expirationDate}
                                    onChange={(event) =>
                                        setForm({ ...form, expirationDate: event.target.value })
                                    }
                                    className="h-10 rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                />
                            </FormField>
                            {formError && (
                                <p
                                    role="alert"
                                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                                >
                                    {formError}
                                </p>
                            )}
                            <div className="mt-1 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setItemModal(null)}
                                    className="h-10 rounded-lg border border-[#d9d1de] px-4 text-sm hover:bg-[#f6f2f7]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="h-10 rounded-lg bg-[#4e812f] px-5 text-sm font-medium text-white hover:bg-[#3f6c26] disabled:opacity-60"
                                >
                                    {busy ? "Salvando…" : "Salvar"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
            {movementModal && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !busy) setMovementModal(null);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pantry-movement-title"
                        className="w-full max-w-md rounded-2xl border border-[#e1d9e5] bg-[#fffaff] p-5 shadow-xl"
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 id="pantry-movement-title" className="text-lg font-bold">
                                    {movementModal.type === "ENTRADA"
                                        ? "Adicionar ao estoque"
                                        : "Registrar consumo"}
                                </h2>
                                <p className="mt-1 text-sm text-[#77717c]">
                                    {movementModal.item.name} · estoque atual:{" "}
                                    {formatQuantity(
                                        movementModal.item.quantity,
                                        movementModal.item.unit
                                    )}
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => setMovementModal(null)}
                                aria-label="Fechar"
                                className="grid size-9 place-items-center rounded-lg hover:bg-[#f1edf3] disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form
                            onSubmit={(event) => void handleMovementSubmit(event)}
                            className="grid gap-4"
                        >
                            <FormField
                                label={`Quantidade (${unitLabels[movementModal.item.unit]})`}
                            >
                                <input
                                    autoFocus
                                    required
                                    inputMode="decimal"
                                    maxLength={12}
                                    value={movementQuantity}
                                    onChange={(event) => {
                                        setMovementQuantity(event.target.value);
                                        setMovementError("");
                                    }}
                                    aria-describedby="pantry-movement-help"
                                    className="h-10 w-full rounded-lg border border-[#d9d1de] bg-white px-3 text-sm outline-none focus:border-[#4e812f]"
                                    placeholder="Ex.: 0,5"
                                />
                                <span
                                    id="pantry-movement-help"
                                    className="mt-1 block text-xs text-[#77717c]"
                                >
                                    Use até duas casas decimais.
                                </span>
                            </FormField>
                            {movementError && (
                                <p
                                    role="alert"
                                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                                >
                                    {movementError}
                                </p>
                            )}
                            <div className="mt-1 flex justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setMovementModal(null)}
                                    className="h-10 rounded-lg border border-[#d9d1de] px-4 text-sm hover:bg-[#f6f2f7] disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="h-10 rounded-lg bg-[#4e812f] px-5 text-sm font-medium text-white hover:bg-[#3f6c26] disabled:opacity-60"
                                >
                                    {busy ? "Salvando…" : "Confirmar"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}

function TabButton({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`rounded-lg px-4 py-2 text-xs transition ${active ? "bg-white font-semibold text-[#356c43] shadow-[inset_0_-2px_0_#4e812f]" : "text-[#716b76] hover:bg-white/70"}`}
        >
            {label}
            <span className="ml-1 text-[10px] opacity-70">{count}</span>
        </button>
    );
}

function SelectFilter({
    label,
    value,
    onChange,
    children,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <label className="relative">
            <span className="sr-only">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-[#d9d1de] bg-[#fffaff] px-3 pr-8 text-sm text-[#625c66] outline-none focus:border-[#4e812f]"
            >
                {children}
            </select>
            <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#77717c]"
                size={15}
            />
        </label>
    );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="grid gap-1.5 text-xs font-medium text-[#514c56]">
            {label}
            {children}
        </label>
    );
}
