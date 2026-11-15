"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { House, Plus, Search, Tags } from "lucide-react";
import { getPetResidences } from "@/features/pets/api/pets.api";
import type { PetResidence } from "@/features/pets/api/pets.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    createPantryCategory,
    createPantryItem,
    deletePantryCategory,
    deletePantryItem,
    getPantryCategories,
    getPantryItems,
    getPantryMembers,
    registerPantryMovement,
    updatePantryCategory,
    updatePantryItem,
} from "@/features/pantry/api/pantry.api";
import type {
    PantryCategory,
    PantryItem,
    PantryItemInput,
    PantryMember,
    PantryMovementType,
} from "@/features/pantry/api/pantry.api";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { PantryItemsTable } from "@/features/pantry/components/PantryItemsTable";
import { SelectFilter, TabButton } from "@/features/pantry/components/PantryControls";
import { PantryCategoryModal } from "@/features/pantry/components/PantryCategoryModal";
import { PantryItemModal } from "@/features/pantry/components/PantryItemModal";
import { PantryMovementModal } from "@/features/pantry/components/PantryMovementModal";
import {
    formatQuantity,
    getErrorMessage,
    initialForm,
    isExpiringSoon,
    localDateString,
    type ItemFormState,
    type ItemModalState,
    type MovementModalState,
    type TabKey,
} from "@/features/pantry/lib/pantry.utils";

export default function PantryPage() {
    const { user } = useAuth();
    const [residences, setResidences] = useState<PetResidence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [members, setMembers] = useState<PantryMember[]>([]);
    const [categories, setCategories] = useState<PantryCategory[]>([]);
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
    const [formError, setFormError] = useState("");
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [categoryDraft, setCategoryDraft] = useState("");
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [categoryError, setCategoryError] = useState("");

    const residence = useMemo(
        () => residences.find((item) => item.id === residenceId) ?? null,
        [residences, residenceId]
    );
    const currentMemberId = residence?.membership?.id ?? "";
    const canManageHouse =
        residence?.membership?.role === "LIDER" || residence?.membership?.role === "ADMINISTRADOR";
    const canManageCategories = residence?.creationEditPolicy !== "LIDERES" || canManageHouse;

    const loadResidenceData = useCallback(async (id: string) => {
        const [nextMembers, nextItems, nextCategories] = await Promise.all([
            getPantryMembers(id),
            getPantryItems(id),
            getPantryCategories(id),
        ]);
        setMembers(nextMembers);
        setItems(nextItems);
        setCategories(nextCategories);
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
        if (!itemModal && !movementModal && !categoryModalOpen) return;
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setItemModal(null);
                setMovementModal(null);
                setCategoryModalOpen(false);
            }
        }
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [categoryModalOpen, itemModal, movementModal]);

    const filteredItems = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
        return items.filter((item) => {
            if (activeTab === "communal" && item.property !== "COMUNITARIO") return false;
            if (activeTab === "private" && item.property === "COMUNITARIO") return false;
            if (activeTab === "mine" && !item.isMine) return false;
            if (categoryFilter && item.categoryId !== categoryFilter) return false;
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
        setCategories([]);
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
        setForm({
            ...initialForm,
            categoryId: categories[0]?.id ?? "",
            ownerMemberId: currentMemberId,
        });
        setFormError("");
        setItemModal({ mode: "create" });
    }

    function openEditModal(item: PantryItem) {
        setForm({
            name: item.name,
            categoryId: item.categoryId ?? "",
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
        if (!form.name.trim() || !form.categoryId) {
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
                    categoryId: form.categoryId,
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
                    categoryId: form.categoryId,
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

    function openCategoryModal() {
        setCategoryDraft("");
        setEditingCategoryId(null);
        setCategoryError("");
        setCategoryModalOpen(true);
    }

    function editCategory(category: PantryCategory) {
        setEditingCategoryId(category.id);
        setCategoryDraft(category.name);
        setCategoryError("");
    }

    async function saveCategory(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!residenceId || !categoryDraft.trim()) return;
        setBusy(true);
        setCategoryError("");
        try {
            if (editingCategoryId) {
                await updatePantryCategory(residenceId, editingCategoryId, categoryDraft.trim());
                setNotice("Categoria atualizada.");
            } else {
                await createPantryCategory(residenceId, categoryDraft.trim());
                setNotice("Categoria criada.");
            }
            setCategoryDraft("");
            setEditingCategoryId(null);
            await loadResidenceData(residenceId);
        } catch (saveError: unknown) {
            setCategoryError(getErrorMessage(saveError));
        } finally {
            setBusy(false);
        }
    }

    async function removeCategory(category: PantryCategory) {
        if (!residenceId || !window.confirm(`Excluir a categoria “${category.name}”?`)) return;
        setBusy(true);
        setCategoryError("");
        try {
            await deletePantryCategory(residenceId, category.id);
            if (categoryFilter === category.id) setCategoryFilter("");
            setNotice("Categoria removida.");
            await loadResidenceData(residenceId);
        } catch (removeError: unknown) {
            setCategoryError(getErrorMessage(removeError));
        } finally {
            setBusy(false);
        }
    }

    const memberName =
        user?.name?.trim() ||
        members.find((member) => member.id === currentMemberId)?.name ||
        user?.email?.split("@")[0] ||
        "Morador";

    return (
        <div className="min-h-screen bg-[#f8f4fa] text-[#29252d] md:flex">
            <AppSidebar activeSection="pantry" residenceName={residence?.name} />
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
                            <div className="mb-5">
                                <h1 className="text-xl font-bold tracking-tight">Despensa</h1>
                                <p className="mt-1 text-sm text-[#77717c]">
                                    Organize os itens, categorias e validades da casa.
                                </p>
                            </div>
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
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={openCategoryModal}
                                        disabled={!residenceId || busy}
                                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d9d1de] bg-white px-4 text-sm font-medium text-[#514c56] hover:bg-[#f6f2f7] disabled:opacity-50"
                                    >
                                        <Tags size={16} />
                                        Gerenciar categorias
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openCreateModal}
                                        disabled={!residenceId || busy || categories.length === 0}
                                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4e812f] px-5 text-sm font-medium text-white hover:bg-[#3f6c26] disabled:opacity-50"
                                    >
                                        <Plus size={17} /> Adicionar item
                                    </button>
                                </div>
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
                                            <option key={category.id} value={category.id}>
                                                {category.name}
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

                                <PantryItemsTable
                                    items={filteredItems}
                                    totalItems={items.length}
                                    loading={loading}
                                    busy={busy}
                                    canManageHouse={canManageHouse}
                                    onMovement={openMovementModal}
                                    onEdit={openEditModal}
                                    onRemove={(item) => void removeItem(item)}
                                />
                            </section>
                        </>
                    )}
                </main>
            </div>
            <PantryCategoryModal
                categoryModalOpen={categoryModalOpen}
                categories={categories}
                canManageCategories={canManageCategories}
                busy={busy}
                categoryDraft={categoryDraft}
                setCategoryDraft={setCategoryDraft}
                editingCategoryId={editingCategoryId}
                categoryError={categoryError}
                onClose={() => setCategoryModalOpen(false)}
                onSave={(event) => void saveCategory(event)}
                onEdit={editCategory}
                onRemove={(category) => void removeCategory(category)}
                onCancelEdit={() => {
                    setEditingCategoryId(null);
                    setCategoryDraft("");
                    setCategoryError("");
                }}
            />{" "}
            <PantryItemModal
                itemModal={itemModal}
                form={form}
                setForm={setForm}
                categories={categories}
                members={members}
                busy={busy}
                formError={formError}
                onClose={() => setItemModal(null)}
                onSubmit={(event) => void handleSubmit(event)}
            />{" "}
            <PantryMovementModal
                movementModal={movementModal}
                busy={busy}
                movementQuantity={movementQuantity}
                setMovementQuantity={setMovementQuantity}
                movementError={movementError}
                setMovementError={setMovementError}
                onClose={() => setMovementModal(null)}
                onSubmit={(event) => void handleMovementSubmit(event)}
            />
        </div>
    );
}
