"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BedDouble, ChevronDown, Filter, MapPin, PawPrint, Plus, Search, X } from "lucide-react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getResidences, type Residence } from "@/features/residences/api/residences.api";
import {
    createRoomListing,
    deleteRoomListing,
    expressRoomInterest,
    getMyRoomListings,
    getRoomInterests,
    searchRoomListings,
    updateRoomListing,
    updateRoomInterest,
    uploadRoomPhoto,
} from "../api/rooms.api";
import type {
    RoomInterest,
    RoomListing,
    RoomListingFilters,
    RoomListingInput,
    RoomType,
} from "../api/rooms.api";

const typeLabels: Record<RoomType, string> = {
    QUARTO_INDIVIDUAL: "Quarto individual",
    VAGA_COMPARTILHADA: "Vaga compartilhada",
    REPUBLICA: "República",
};
const greenButton =
    "rounded-lg bg-[#2f6034] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244d29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f]";
const inputClass =
    "min-h-11 w-full rounded-lg border border-[#d8d5dc] bg-white px-3 text-sm outline-none focus:border-[#4e812f] focus:ring-2 focus:ring-[#4e812f]/20";

function errorText(error: unknown) {
    if (typeof error === "object" && error && "message" in error) return String(error.message);
    return "Não foi possível concluir a solicitação. Tente novamente.";
}

export function RoomsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [residences, setResidences] = useState<Residence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [listings, setListings] = useState<RoomListing[]>([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
    const [filters, setFilters] = useState<RoomListingFilters>({ page: 1, limit: 10 });
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<"all" | "republic" | "pets" | "mine">("all");
    const [urlReady, setUrlReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState<RoomListing | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<RoomListing | null>(null);
    const [interests, setInterests] = useState<RoomInterest[]>([]);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const [interestMessage, setInterestMessage] = useState("");
    const closeDialogRef = useRef<HTMLButtonElement>(null);
    const residence = residences.find((item) => item.id === residenceId) ?? null;
    const memberName = user?.name?.trim() || user?.email?.split("@")[0] || "Visitante";

    useEffect(() => {
        if (!user) return;
        getResidences()
            .then((items) => {
                setResidences(items);
                const saved = window.localStorage.getItem("fullhouse.home.residence");
                setResidenceId(
                    items.some((item) => item.id === saved) ? saved! : (items[0]?.id ?? "")
                );
            })
            .catch((cause: unknown) => setError(errorText(cause)));
    }, [user]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const parsed: RoomListingFilters = {
            cidade: params.get("cidade") || undefined,
            bairro: params.get("bairro") || undefined,
            precoMin: params.has("precoMin") ? Number(params.get("precoMin")) : undefined,
            precoMax: params.has("precoMax") ? Number(params.get("precoMax")) : undefined,
            tipoMoradia: (params.get("tipoMoradia") as RoomType | null) ?? undefined,
            aceitaPets: params.get("aceitaPets") === "true" ? true : undefined,
            page: params.has("page") ? Number(params.get("page")) : 1,
            limit: params.has("limit") ? Number(params.get("limit")) : 10,
        };
        // Initialize controlled filters from the shareable URL state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFilters((current) => ({ ...current, ...parsed }));
        setSearch([parsed.cidade, parsed.bairro].filter(Boolean).join(", "));
        const category = params.get("aba");
        if (category === "republic" || category === "pets") {
            setTab(category);
        }
        setUrlReady(true);
    }, []);

    useEffect(() => {
        if (!urlReady) return;
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== "") params.set(key, String(value));
        }
        if (tab === "republic" || tab === "pets") params.set("aba", tab);
        const query = params.toString();
        window.history.replaceState(null, "", query ? `/rooms?${query}` : "/rooms");
    }, [filters, tab, urlReady]);

    const load = useCallback(async () => {
        if (!urlReady) return;
        setLoading(true);
        setError("");
        try {
            if (tab === "mine") {
                const own = await getMyRoomListings(residenceId || undefined);
                setListings(own);
                setMeta({ total: own.length, page: 1, limit: 10, totalPages: 1 });
                return;
            }
            const nextFilters = { ...filters, page: filters.page ?? 1 };
            if (tab === "republic") nextFilters.tipoMoradia = "REPUBLICA";
            if (tab === "pets") nextFilters.aceitaPets = true;
            const result = await searchRoomListings(nextFilters);
            setListings(result.data);
            setMeta(result.meta);
        } catch (cause: unknown) {
            setError(errorText(cause));
        } finally {
            setLoading(false);
        }
    }, [filters, residenceId, tab, urlReady]);

    useEffect(() => {
        // Synchronize the visible results with the external API request.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const applied = useMemo(
        () =>
            [
                filters.cidade ? `Cidade: ${filters.cidade}` : "",
                filters.bairro ? `Bairro: ${filters.bairro}` : "",
                filters.precoMin !== undefined || filters.precoMax !== undefined
                    ? `Faixa: R$ ${filters.precoMin ?? 0}–R$ ${filters.precoMax ?? "∞"}`
                    : "",
                filters.aceitaPets || tab === "pets" ? "Aceita Pets" : "",
                filters.tipoMoradia === "REPUBLICA" || tab === "republic" ? "Repúblicas" : "",
            ].filter(Boolean),
        [filters, tab]
    );
    const tabs: { key: "all" | "republic" | "pets" | "mine"; label: string }[] = [
        { key: "all", label: "Todos os Quartos" },
        { key: "republic", label: "Repúblicas" },
        { key: "pets", label: "Aceita Pets" },
        ...(user ? [{ key: "mine" as const, label: "Meus anúncios" }] : []),
    ];

    function applySearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const [city, neighborhood] = search.split(",").map((part) => part.trim());
        setTab("all");
        setFilters((current) => ({
            ...current,
            cidade: city || undefined,
            bairro: neighborhood || undefined,
            page: 1,
        }));
    }

    function removeFilter(label: string) {
        if (label === "Aceita Pets" || label === "Repúblicas") setTab("all");
        setFilters((current) => ({
            ...current,
            ...(label.startsWith("Cidade:") ? { cidade: undefined } : {}),
            ...(label.startsWith("Bairro:") ? { bairro: undefined } : {}),
            ...(label.startsWith("Faixa:") ? { precoMin: undefined, precoMax: undefined } : {}),
            ...(label === "Aceita Pets" ? { aceitaPets: undefined } : {}),
            ...(label === "Repúblicas" ? { tipoMoradia: undefined } : {}),
            page: 1,
        }));
    }

    function chooseTab(next: "all" | "republic" | "pets" | "mine") {
        setTab(next);
        if (next !== "mine") {
            setFilters((current) => ({
                ...current,
                tipoMoradia: undefined,
                aceitaPets: undefined,
                page: 1,
            }));
        }
    }

    async function submitListing(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!residenceId) {
            setError("Selecione uma casa para publicar o anúncio.");
            return;
        }
        const form = new FormData(event.currentTarget);
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const files = form
                .getAll("fotos")
                .filter((value): value is File => value instanceof File && value.size > 0);
            const fotos = [
                ...(editing?.fotos ?? []),
                ...(await Promise.all(
                    files.slice(0, 8).map((file) => uploadRoomPhoto(residenceId, file))
                )),
            ].slice(0, 8);
            const payload: RoomListingInput = {
                casaId: residenceId,
                titulo: String(form.get("titulo") ?? "").trim(),
                descricao: String(form.get("descricao") ?? "").trim(),
                preco: Number(form.get("preco")),
                cidade: String(form.get("cidade") ?? "").trim(),
                bairro: String(form.get("bairro") ?? "").trim(),
                enderecoCompleto: String(form.get("enderecoCompleto") ?? "").trim(),
                exibeEnderecoCompleto: form.get("exibeEnderecoCompleto") === "on",
                contato: String(form.get("contato") ?? "").trim(),
                exibeContato: form.get("exibeContato") === "on",
                perfilConvivencia: String(form.get("perfilConvivencia") ?? "").trim(),
                tipoMoradia: String(form.get("tipoMoradia") ?? "QUARTO_INDIVIDUAL") as RoomType,
                aceitaPets: form.get("aceitaPets") === "on",
                fotos,
            };
            if (editing) {
                const update = Object.fromEntries(
                    Object.entries(payload).filter(([key]) => key !== "casaId")
                ) as Partial<Omit<RoomListingInput, "casaId">>;
                await updateRoomListing(editing.id, update);
                setNotice("Anúncio atualizado.");
            } else {
                await createRoomListing(payload);
                setNotice("Anúncio publicado.");
                setTab("mine");
            }
            setShowForm(false);
            setEditing(null);
            await load();
        } catch (cause: unknown) {
            setError(errorText(cause));
        } finally {
            setSaving(false);
        }
    }

    async function expressInterest(listing: RoomListing) {
        if (!user) {
            router.push(`/login?returnTo=${encodeURIComponent("/rooms")}`);
            return;
        }
        try {
            await expressRoomInterest(listing.id, interestMessage);
            setNotice("Seu interesse foi enviado ao anunciante.");
            setInterestMessage("");
        } catch (cause: unknown) {
            setError(errorText(cause));
        }
    }

    async function toggleStatus(listing: RoomListing) {
        try {
            await updateRoomListing(listing.id, {
                status: listing.status === "ABERTO" ? "FECHADO" : "ABERTO",
            });
            await load();
            setNotice(listing.status === "ABERTO" ? "Anúncio pausado." : "Anúncio reaberto.");
        } catch (cause: unknown) {
            setError(errorText(cause));
        }
    }

    async function removeListing(listing: RoomListing) {
        if (!window.confirm("Fechar este anúncio? O histórico de interessados será preservado."))
            return;
        try {
            await deleteRoomListing(listing.id);
            await load();
            setNotice("Anúncio fechado.");
        } catch (cause: unknown) {
            setError(errorText(cause));
        }
    }

    async function openManagement(listing: RoomListing) {
        setSelected(listing);
        setInterests([]);
        try {
            setInterests(await getRoomInterests(listing.id));
        } catch (cause: unknown) {
            setError(errorText(cause));
        }
    }

    useEffect(() => {
        if (!selected) return;
        closeDialogRef.current?.focus();
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setSelected(null);
        }
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [selected]);

    async function decideInterest(interest: RoomInterest, status: "ACEITO" | "RECUSADO") {
        if (!selected) return;
        try {
            await updateRoomInterest(selected.id, interest.id, status);
            setInterests((current) =>
                current.map((item) => (item.id === interest.id ? { ...item, status } : item))
            );
        } catch (cause: unknown) {
            setError(errorText(cause));
        }
    }

    return (
        <div className="min-h-screen bg-[#f7f8fa] text-[#24232a] md:flex">
            <AppSidebar activeSection="rooms" residenceName={residence?.name} />
            <div className="min-w-0 flex-1">
                <AppPageHeader
                    greetingName={memberName}
                    residenceName={residence?.name ?? "Busca pública de quartos"}
                    settingsHref={user ? "/settings" : undefined}
                    residenceControl={
                        residences.length ? (
                            <label className="flex items-center gap-2 rounded-xl bg-[#e8e5e9] p-1 text-xs">
                                <span className="sr-only">Residência ativa</span>
                                <select
                                    aria-label="Residência ativa"
                                    value={residenceId}
                                    onChange={(event) => setResidenceId(event.target.value)}
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
                        ) : undefined
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
                <main className="mx-auto max-w-[1480px] p-5 md:p-10">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#dedee4]">
                        <div
                            className="flex gap-7 overflow-x-auto"
                            role="tablist"
                            aria-label="Categorias de quartos"
                        >
                            {tabs.map(({ key, label }) => (
                                <button
                                    key={key}
                                    role="tab"
                                    aria-selected={tab === key}
                                    className={`border-b-2 px-1 py-3 text-sm ${tab === key ? "border-[#356739] font-semibold text-[#20242d]" : "border-transparent text-[#74737b]"}`}
                                    onClick={() => chooseTab(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {user && (
                            <button
                                className={greenButton}
                                onClick={() => {
                                    setEditing(null);
                                    setShowForm((value) => !value);
                                    setError("");
                                }}
                            >
                                <Plus size={16} className="mr-1 inline" /> Anunciar quarto
                            </button>
                        )}
                    </div>

                    <form onSubmit={applySearch} className="mb-3 flex flex-wrap gap-3">
                        <label className="relative min-w-[260px] flex-1">
                            <span className="sr-only">Buscar por cidade ou bairro</span>
                            <Search size={17} className="absolute left-3 top-3 text-[#9aa2b0]" />
                            <input
                                className={`${inputClass} pl-9`}
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar por cidade ou bairro..."
                            />
                        </label>
                        <details className="relative">
                            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-[#d8d5dc] bg-white px-3 text-sm">
                                Faixa de Preço <ChevronDown size={15} />
                            </summary>
                            <div className="absolute right-0 z-10 mt-2 grid w-64 gap-3 rounded-xl border bg-white p-4 shadow-lg">
                                <label className="text-xs">
                                    Mínimo
                                    <input
                                        className={inputClass}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={filters.precoMin ?? ""}
                                        onChange={(event) =>
                                            setFilters((current) => ({
                                                ...current,
                                                precoMin: event.target.value
                                                    ? Number(event.target.value)
                                                    : undefined,
                                                page: 1,
                                            }))
                                        }
                                    />
                                </label>
                                <label className="text-xs">
                                    Máximo
                                    <input
                                        className={inputClass}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={filters.precoMax ?? ""}
                                        onChange={(event) =>
                                            setFilters((current) => ({
                                                ...current,
                                                precoMax: event.target.value
                                                    ? Number(event.target.value)
                                                    : undefined,
                                                page: 1,
                                            }))
                                        }
                                    />
                                </label>
                            </div>
                        </details>
                        <details className="relative">
                            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-[#d8d5dc] bg-white px-3 text-sm">
                                Regras da Casa <ChevronDown size={15} />
                            </summary>
                            <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border bg-white p-4 shadow-lg">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={filters.aceitaPets ?? false}
                                        onChange={(event) =>
                                            setFilters((current) => ({
                                                ...current,
                                                aceitaPets: event.target.checked || undefined,
                                                page: 1,
                                            }))
                                        }
                                    />{" "}
                                    Aceita pets
                                </label>
                                <p className="mt-2 text-xs text-[#77717c]">
                                    Outras regras aparecem no detalhe do anúncio.
                                </p>
                            </div>
                        </details>
                        <button
                            type="button"
                            className="flex min-h-11 items-center gap-2 rounded-lg bg-[#f0f1f3] px-4 text-sm"
                            onClick={() =>
                                document
                                    .getElementById("advanced-filters")
                                    ?.classList.toggle("hidden")
                            }
                        >
                            <Filter size={15} /> Filtros Avançados
                        </button>
                        <div
                            id="advanced-filters"
                            className="hidden w-full rounded-xl border bg-white p-4"
                        >
                            <label className="max-w-sm text-sm">
                                Tipo de moradia
                                <select
                                    className={`${inputClass} mt-1`}
                                    value={filters.tipoMoradia ?? ""}
                                    onChange={(event) =>
                                        setFilters((current) => ({
                                            ...current,
                                            tipoMoradia: (event.target.value || undefined) as
                                                RoomType | undefined,
                                            page: 1,
                                        }))
                                    }
                                >
                                    <option value="">Todos os tipos</option>
                                    {Object.entries(typeLabels).map(([key, value]) => (
                                        <option key={key} value={key}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <button type="submit" className="sr-only">
                            Buscar
                        </button>
                    </form>

                    {applied.length > 0 && (
                        <div className="mb-5">
                            <p className="mb-2 text-xs font-semibold text-[#77717c]">
                                Filtros aplicados
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {applied.map((label) => (
                                    <button
                                        key={label}
                                        onClick={() => removeFilter(label)}
                                        className="flex items-center gap-2 rounded-full bg-[#eef0f3] px-3 py-1.5 text-xs text-[#465164]"
                                    >
                                        {label}
                                        <X size={13} aria-hidden="true" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {notice && (
                        <p
                            role="status"
                            className="mb-4 rounded-lg bg-[#e8f3e8] p-3 text-sm text-[#285a2e]"
                        >
                            {notice}
                        </p>
                    )}
                    {error && (
                        <div
                            role="alert"
                            className="mb-4 flex justify-between rounded-lg bg-red-50 p-3 text-sm text-red-800"
                        >
                            {error}
                            <button aria-label="Fechar erro" onClick={() => setError("")}>
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {showForm && (
                        <form
                            key={editing?.id ?? "create"}
                            onSubmit={(event) => void submitListing(event)}
                            className="mb-8 grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-2"
                            aria-label="Formulário de anúncio"
                        >
                            <h2 className="text-lg font-bold md:col-span-2">
                                {editing ? "Editar anúncio" : "Novo anúncio"}
                            </h2>
                            <label className="text-sm">
                                Título
                                <input
                                    name="titulo"
                                    required
                                    maxLength={150}
                                    defaultValue={editing?.titulo ?? ""}
                                    className={`${inputClass} mt-1`}
                                />
                            </label>
                            <label className="text-sm">
                                Preço mensal (R$)
                                <input
                                    name="preco"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required
                                    defaultValue={editing?.preco ?? ""}
                                    className={`${inputClass} mt-1`}
                                />
                            </label>
                            <label className="text-sm">
                                Cidade
                                <input
                                    name="cidade"
                                    required
                                    maxLength={100}
                                    defaultValue={editing?.cidade ?? residence?.city ?? ""}
                                    className={`${inputClass} mt-1`}
                                />
                            </label>
                            <label className="text-sm">
                                Bairro
                                <input
                                    name="bairro"
                                    maxLength={100}
                                    defaultValue={editing?.bairro ?? residence?.neighborhood ?? ""}
                                    className={`${inputClass} mt-1`}
                                />
                            </label>
                            <label className="text-sm md:col-span-2">
                                Descrição
                                <textarea
                                    name="descricao"
                                    maxLength={5000}
                                    rows={3}
                                    defaultValue={editing?.descricao ?? ""}
                                    className={`${inputClass} mt-1 h-auto py-2`}
                                />
                            </label>
                            <label className="text-sm">
                                Tipo
                                <select
                                    name="tipoMoradia"
                                    defaultValue={editing?.tipoMoradia ?? "QUARTO_INDIVIDUAL"}
                                    className={`${inputClass} mt-1`}
                                >
                                    {Object.entries(typeLabels).map(([key, value]) => (
                                        <option key={key} value={key}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-sm">
                                Contato
                                <input
                                    name="contato"
                                    required
                                    maxLength={100}
                                    defaultValue={editing?.contato ?? ""}
                                    className={`${inputClass} mt-1`}
                                />
                            </label>
                            <label className="text-sm md:col-span-2">
                                Endereço completo
                                <input
                                    name="enderecoCompleto"
                                    maxLength={255}
                                    defaultValue={editing?.enderecoCompleto ?? ""}
                                    className={`${inputClass} mt-1`}
                                />
                            </label>
                            <label className="flex items-start gap-2 text-sm">
                                <input
                                    name="exibeEnderecoCompleto"
                                    type="checkbox"
                                    defaultChecked={editing?.exibeEnderecoCompleto ?? false}
                                    className="mt-1"
                                />{" "}
                                Exibir endereço completo publicamente
                            </label>
                            <label className="flex items-start gap-2 text-sm">
                                <input
                                    name="exibeContato"
                                    type="checkbox"
                                    defaultChecked={editing?.exibeContato ?? false}
                                    className="mt-1"
                                />{" "}
                                Exibir contato publicamente
                            </label>
                            <label className="text-sm md:col-span-2">
                                Regras e perfil de convivência
                                <textarea
                                    name="perfilConvivencia"
                                    rows={2}
                                    maxLength={5000}
                                    defaultValue={editing?.perfilConvivencia ?? ""}
                                    className={`${inputClass} mt-1 h-auto py-2`}
                                />
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    name="aceitaPets"
                                    type="checkbox"
                                    defaultChecked={editing?.aceitaPets ?? false}
                                />{" "}
                                Aceita pets
                            </label>
                            <label className="text-sm">
                                Fotos (até 8)
                                <input
                                    name="fotos"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    className={`${inputClass} mt-1 h-auto py-2`}
                                />
                            </label>
                            <p className="text-xs text-[#77717c] md:col-span-2">
                                Endereço e contato permanecem ocultos enquanto suas opções de
                                exibição estiverem desmarcadas.
                            </p>
                            <div className="flex gap-2 md:col-span-2">
                                <Button type="submit" disabled={saving || !residenceId}>
                                    {saving
                                        ? "Salvando..."
                                        : editing
                                          ? "Salvar alterações"
                                          : "Publicar anúncio"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditing(null);
                                    }}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    )}

                    <div className="mb-4 flex items-end justify-between">
                        <div>
                            <h2 className="font-bold">
                                {meta.total} {meta.total === 1 ? "resultado" : "resultados"}
                                {filters.cidade ? ` para ${filters.cidade}` : ""}
                            </h2>
                            <p className="text-xs text-[#77717c]">
                                Endereço completo e contato aparecem apenas quando autorizados pelo
                                anunciante.
                            </p>
                        </div>
                        <span className="rounded-full bg-[#e7f3e9] px-3 py-1.5 text-xs font-semibold text-[#2b6330]">
                            {meta.total} anúncios encontrados
                        </span>
                    </div>
                    {loading ? (
                        <p role="status" className="py-16 text-center text-sm text-[#77717c]">
                            Carregando anúncios...
                        </p>
                    ) : error && !listings.length ? null : listings.length === 0 ? (
                        <div className="rounded-2xl border border-dashed bg-white px-5 py-16 text-center">
                            <BedDouble className="mx-auto mb-3 text-[#879080]" />
                            <h3 className="font-semibold">Nenhum anúncio encontrado</h3>
                            <p className="mt-1 text-sm text-[#77717c]">
                                Ajuste os filtros ou tente outra localização.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            {listings.map((listing) => (
                                <article
                                    key={listing.id}
                                    className="overflow-hidden rounded-xl border border-[#d7d8de] bg-white shadow-sm"
                                >
                                    <div className="relative h-48 bg-gradient-to-br from-[#e4e2dc] to-[#c7ccc6]">
                                        {listing.fotos[0] ? (
                                            <Image
                                                src={listing.fotos[0]}
                                                alt={`Foto do anúncio ${listing.titulo}`}
                                                fill
                                                unoptimized
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="grid h-full place-items-center text-[#788076]">
                                                <BedDouble size={48} aria-hidden="true" />
                                                <span className="sr-only">Anúncio sem foto</span>
                                            </div>
                                        )}
                                        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-sm font-semibold">
                                            {listing.status === "ABERTO" ? "Disponível" : "Fechado"}
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold">{listing.titulo}</h3>
                                        <p className="mt-2 flex items-center gap-1 text-xs text-[#77717c]">
                                            <MapPin size={13} className="text-red-500" />
                                            {[listing.bairro, listing.cidade]
                                                .filter(Boolean)
                                                .join(", ")}
                                        </p>
                                        <p className="mt-3 text-xl font-bold text-[#315f35]">
                                            R${" "}
                                            {listing.preco.toLocaleString("pt-BR", {
                                                minimumFractionDigits: 2,
                                            })}
                                            <span className="ml-1 text-xs font-normal text-[#77717c]">
                                                /mês
                                            </span>
                                        </p>
                                        <div className="my-3 flex flex-wrap gap-2">
                                            {listing.aceitaPets && (
                                                <span className="rounded bg-[#f0f1f3] px-2 py-1 text-xs">
                                                    <PawPrint size={12} className="mr-1 inline" />
                                                    Aceita Pets
                                                </span>
                                            )}
                                            <span className="rounded bg-[#f0f1f3] px-2 py-1 text-xs">
                                                {typeLabels[listing.tipoMoradia]}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() =>
                                                tab === "mine"
                                                    ? void openManagement(listing)
                                                    : setSelected(listing)
                                            }
                                            className={`${greenButton} w-full`}
                                        >
                                            {tab === "mine"
                                                ? "Detalhes e interessados"
                                                : "Ver Detalhes do Anúncio"}
                                        </button>
                                        {tab === "mine" && (
                                            <div className="mt-2 flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditing(listing);
                                                        setShowForm(true);
                                                        window.scrollTo({
                                                            top: 0,
                                                            behavior: "smooth",
                                                        });
                                                    }}
                                                    className="flex-1 rounded border px-3 py-2 text-xs"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => void toggleStatus(listing)}
                                                    className="flex-1 rounded border px-3 py-2 text-xs"
                                                >
                                                    {listing.status === "ABERTO"
                                                        ? "Pausar anúncio"
                                                        : "Reabrir anúncio"}
                                                </button>
                                                <button
                                                    onClick={() => void removeListing(listing)}
                                                    className="rounded border border-red-200 px-3 py-2 text-xs text-red-700"
                                                >
                                                    Fechar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {tab !== "mine" && meta.totalPages > 1 && (
                        <nav
                            aria-label="Paginação dos anúncios"
                            className="mt-6 flex items-center justify-center gap-3"
                        >
                            <button
                                disabled={meta.page <= 1}
                                onClick={() =>
                                    setFilters((current) => ({ ...current, page: meta.page - 1 }))
                                }
                                className="rounded border bg-white px-3 py-2 disabled:opacity-40"
                            >
                                Anterior
                            </button>
                            <span className="text-sm">
                                Página {meta.page} de {meta.totalPages}
                            </span>
                            <button
                                disabled={meta.page >= meta.totalPages}
                                onClick={() =>
                                    setFilters((current) => ({ ...current, page: meta.page + 1 }))
                                }
                                className="rounded border bg-white px-3 py-2 disabled:opacity-40"
                            >
                                Próxima
                            </button>
                        </nav>
                    )}
                </main>
            </div>

            {selected && (
                <div
                    role="presentation"
                    className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setSelected(null);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="room-detail-title"
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h2 id="room-detail-title" className="text-xl font-bold">
                                {selected.titulo}
                            </h2>
                            <button
                                ref={closeDialogRef}
                                aria-label="Fechar detalhes"
                                onClick={() => setSelected(null)}
                            >
                                <X />
                            </button>
                        </div>
                        {selected.fotos.length > 0 && (
                            <div className="mb-4 grid grid-cols-2 gap-2">
                                {selected.fotos.map((url) => (
                                    <Image
                                        key={url}
                                        src={url}
                                        alt={`Foto do anúncio ${selected.titulo}`}
                                        width={640}
                                        height={400}
                                        unoptimized
                                        className="h-40 w-full rounded-lg object-cover"
                                    />
                                ))}
                            </div>
                        )}
                        <p className="text-sm">{selected.descricao}</p>
                        <p className="mt-3 text-sm text-[#55515a]">{selected.perfilConvivencia}</p>
                        <p className="mt-3 text-sm">
                            Endereço:{" "}
                            {selected.enderecoCompleto ??
                                "Compartilhado após autorização do anunciante"}
                        </p>
                        <p className="mt-1 text-sm">
                            Contato: {selected.contato ?? "Oculto pelo anunciante"}
                        </p>
                        <p className="mt-3 font-bold text-[#315f35]">
                            R${" "}
                            {selected.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            /mês
                        </p>
                        {tab === "mine" ? (
                            <div className="mt-6">
                                <h3 className="mb-3 font-semibold">Pessoas interessadas</h3>
                                {interests.length === 0 ? (
                                    <p className="text-sm text-[#77717c]">
                                        Ainda não há interessados.
                                    </p>
                                ) : (
                                    <ul className="grid gap-3">
                                        {interests.map((interest) => (
                                            <li key={interest.id} className="rounded-lg border p-3">
                                                <p className="font-semibold">
                                                    {interest.usuario.nome}
                                                </p>
                                                <p className="text-xs text-[#77717c]">
                                                    {interest.usuario.email}
                                                </p>
                                                {interest.mensagem && (
                                                    <p className="my-2 text-sm">
                                                        {interest.mensagem}
                                                    </p>
                                                )}
                                                <p className="text-xs">Estado: {interest.status}</p>
                                                {interest.status === "PENDENTE" && (
                                                    <div className="mt-2 flex gap-2">
                                                        <button
                                                            className="rounded bg-[#e7f3e9] px-3 py-1.5 text-xs text-[#285a2e]"
                                                            onClick={() =>
                                                                void decideInterest(
                                                                    interest,
                                                                    "ACEITO"
                                                                )
                                                            }
                                                        >
                                                            Aceitar
                                                        </button>
                                                        <button
                                                            className="rounded bg-[#fcebec] px-3 py-1.5 text-xs text-[#8e282d]"
                                                            onClick={() =>
                                                                void decideInterest(
                                                                    interest,
                                                                    "RECUSADO"
                                                                )
                                                            }
                                                        >
                                                            Recusar
                                                        </button>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            selected.status === "ABERTO" && (
                                <div className="mt-5 grid gap-3">
                                    <label className="text-sm">
                                        Mensagem ao anunciante (opcional)
                                        <textarea
                                            className={`${inputClass} mt-1 h-24 py-2`}
                                            value={interestMessage}
                                            onChange={(event) =>
                                                setInterestMessage(event.target.value)
                                            }
                                            maxLength={1000}
                                        />
                                    </label>
                                    <button
                                        className={greenButton}
                                        onClick={() => void expressInterest(selected)}
                                    >
                                        Tenho interesse
                                    </button>
                                </div>
                            )
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
