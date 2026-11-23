"use client";
import { SystemSelect } from "@/components/ui/system-select";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BedDouble, ChevronDown, Filter, Plus, Search, X } from "lucide-react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    getResidences,
    RESIDENCE_MEMBERSHIP_CHANGED_EVENT,
    type Residence,
} from "@/features/residences/api/residences.api";
import {
    createRoomListing,
    deleteRoomListing,
    expressRoomInterest,
    getMyRoomListings,
    getMyRoomInterests,
    getRoomInterests,
    searchRoomListings,
    updateRoomListing,
    updateRoomInterest,
    uploadRoomPhoto,
} from "../api/rooms.api";
import type {
    RoomInterest,
    MyRoomInterest,
    RoomListing,
    RoomListingFilters,
    RoomListingInput,
    RoomType,
} from "../api/rooms.api";
import { RoomListingCard } from "./RoomListingCard";
import { readRoomListingInput, RoomListingFields, typeLabels } from "./RoomListingForm";

const greenButton =
    "rounded-lg bg-[#2f6034] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244d29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f]";
const inputClass =
    "min-h-11 w-full rounded-lg border border-[#d8d5dc] bg-white px-3 text-sm outline-none focus:border-[#4e812f] focus:ring-2 focus:ring-[#4e812f]/20";

function errorText(error: unknown) {
    if (typeof error === "object" && error && "message" in error) return String(error.message);
    return "Não foi possível concluir a solicitação. Tente novamente.";
}

function getMyInterestForListing(interests: MyRoomInterest[], listingId: string) {
    const listingInterests = interests.filter((interest) => interest.anuncio.id === listingId);
    return (
        listingInterests.find((interest) => interest.status === "ACEITO") ??
        listingInterests.find((interest) => interest.status === "PENDENTE") ??
        listingInterests[0]
    );
}

export function RoomsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [residenceLookup, setResidenceLookup] = useState<{
        userId: string;
        residences: Residence[];
    } | null>(null);
    const [residenceLookupError, setResidenceLookupError] = useState<{
        userId: string;
        message: string;
    } | null>(null);
    const [residenceId, setResidenceId] = useState("");
    const [listings, setListings] = useState<RoomListing[]>([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
    const [filters, setFilters] = useState<RoomListingFilters>({ page: 1, limit: 10 });
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<"all" | "republic" | "pets" | "mine" | "interests">("all");
    const [urlReady, setUrlReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState<RoomListing | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<RoomListing | null>(null);
    const [interests, setInterests] = useState<RoomInterest[]>([]);
    const [myInterests, setMyInterests] = useState<MyRoomInterest[]>([]);
    const [interestStatusError, setInterestStatusError] = useState("");
    const [loadingInterestStatus, setLoadingInterestStatus] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const [interestMessage, setInterestMessage] = useState("");
    const closeDialogRef = useRef<HTMLButtonElement>(null);
    const refreshingMyInterestsRef = useRef(false);
    const residences =
        user && residenceLookup?.userId === user.id ? residenceLookup.residences : [];
    const residencesLoaded =
        !user || residenceLookup?.userId === user.id || residenceLookupError?.userId === user.id;
    const hasActiveResidence = Boolean(user && residences.length > 0);
    const canSearch =
        !authLoading &&
        (!user ||
            (residenceLookup?.userId === user.id &&
                residenceLookup.residences.length === 0 &&
                residenceLookupError?.userId !== user.id));
    const residence = residences.find((item) => item.id === residenceId) ?? null;
    const canManageListings =
        residence?.membership?.role === "LIDER" || residence?.membership?.role === "ADMINISTRADOR";
    const visibleTabs = [
        ...(canSearch
            ? [
                  { key: "all" as const, label: "Todos os Quartos" },
                  { key: "republic" as const, label: "Repúblicas" },
                  { key: "pets" as const, label: "Aceita Pets" },
              ]
            : hasActiveResidence && user
              ? [{ key: "mine" as const, label: "Meus anúncios" }]
              : []),
        ...(user ? [{ key: "interests" as const, label: "Meus interesses" }] : []),
    ];
    const memberName = user?.name?.trim() || user?.email?.split("@")[0] || "Visitante";
    const selectedInterest = selected
        ? getMyInterestForListing(myInterests, selected.id)
        : undefined;

    const refreshMyInterests = useCallback(async () => {
        if (!user) {
            setMyInterests([]);
            setInterestStatusError("");
            setLoadingInterestStatus(false);
            return;
        }
        if (refreshingMyInterestsRef.current) return;
        refreshingMyInterestsRef.current = true;
        setLoadingInterestStatus(true);
        try {
            setMyInterests(await getMyRoomInterests());
            setInterestStatusError("");
        } catch (cause: unknown) {
            setInterestStatusError(errorText(cause));
        } finally {
            refreshingMyInterestsRef.current = false;
            setLoadingInterestStatus(false);
        }
    }, [user]);

    useEffect(() => {
        if (authLoading || !user) return;
        let active = true;
        let latestRequest = 0;
        const refreshResidences = async () => {
            const request = ++latestRequest;
            try {
                const items = await getResidences();
                if (!active || request !== latestRequest) return;
                setResidenceLookup({ userId: user.id, residences: items });
                setResidenceLookupError(null);
                const saved = window.localStorage.getItem("fullhouse.home.residence");
                setResidenceId(
                    items.some((item) => item.id === saved) ? saved! : (items[0]?.id ?? "")
                );
                setTab(items.length > 0 ? "mine" : "all");
            } catch (cause: unknown) {
                if (!active || request !== latestRequest) return;
                const message = errorText(cause);
                setResidenceLookupError({ userId: user.id, message });
                setError(message);
            }
        };
        void refreshResidences();
        window.addEventListener(RESIDENCE_MEMBERSHIP_CHANGED_EVENT, refreshResidences);
        return () => {
            active = false;
            window.removeEventListener(RESIDENCE_MEMBERSHIP_CHANGED_EVENT, refreshResidences);
        };
    }, [authLoading, user]);

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
        if (authLoading || (user && !residencesLoaded)) return;
        if (user && tab !== "mine" && tab !== "interests" && !canSearch) {
            setListings([]);
            setMeta({ total: 0, page: 1, limit: 10, totalPages: 0 });
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        try {
            if (tab === "mine") {
                const own = await getMyRoomListings(residenceId || undefined);
                setListings(own);
                setMeta({ total: own.length, page: 1, limit: 10, totalPages: 1 });
                return;
            }
            if (tab === "interests") {
                const ownInterests = await getMyRoomInterests();
                setMyInterests(ownInterests);
                setInterestStatusError("");
                setListings([]);
                setMeta({
                    total: ownInterests.length,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                });
                return;
            }
            const nextFilters = { ...filters, page: filters.page ?? 1 };
            if (tab === "republic") nextFilters.tipoMoradia = "REPUBLICA";
            if (tab === "pets") nextFilters.aceitaPets = true;
            const result = await searchRoomListings(nextFilters);
            setListings(result.data);
            setMeta(result.meta);
            await refreshMyInterests();
        } catch (cause: unknown) {
            setError(errorText(cause));
        } finally {
            setLoading(false);
        }
    }, [
        authLoading,
        canSearch,
        filters,
        refreshMyInterests,
        residenceId,
        residencesLoaded,
        tab,
        urlReady,
        user,
    ]);

    useEffect(() => {
        // Synchronize the visible results with the external API request.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    useEffect(() => {
        if (!user || !canSearch) return;
        const refreshWhenVisible = () => {
            if (document.visibilityState === "visible") void refreshMyInterests();
        };
        document.addEventListener("visibilitychange", refreshWhenVisible);
        return () => {
            document.removeEventListener("visibilitychange", refreshWhenVisible);
        };
    }, [canSearch, refreshMyInterests, user]);

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

    function chooseTab(next: "all" | "republic" | "pets" | "mine" | "interests") {
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
            const payload = readRoomListingInput(form, residenceId, fotos);
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
            const result = await expressRoomInterest(listing.id, interestMessage);
            setMyInterests((current) => [
                ...current.filter((interest) => interest.anuncio.id !== listing.id),
                {
                    id: result.id,
                    status: result.status,
                    mensagem: interestMessage.trim() || null,
                    negotiationId: null,
                    anuncio: listing,
                },
            ]);
            setInterestStatusError("");
            setNotice("Seu interesse foi enviado ao anunciante.");
            setInterestMessage("");
            setSelected(null);
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

    function openListingDetails(listing: RoomListing) {
        setSelected(listing);
        if (user && canSearch) void refreshMyInterests();
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

    useEffect(() => {
        if (!showForm) return;
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !saving) {
                setShowForm(false);
                setEditing(null);
                setError("");
            }
        }
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [saving, showForm]);

    function closeListingForm() {
        if (saving) return;
        setShowForm(false);
        setEditing(null);
        setError("");
    }

    async function decideInterest(interest: RoomInterest, status: "ACEITO" | "RECUSADO") {
        if (!selected) return;
        try {
            const result = await updateRoomInterest(selected.id, interest.id, status);
            setInterests((current) =>
                current.map((item) =>
                    item.id === interest.id
                        ? { ...item, status, negotiationId: result.negotiationId }
                        : item
                )
            );
        } catch (cause: unknown) {
            setError(errorText(cause));
        }
    }

    return (
        <div className="min-h-screen bg-[#f7f8fa] text-[#24232a] md:flex">
            <AppSidebar
                activeSection="rooms"
                residenceName={residence?.name}
                noResidence={!hasActiveResidence}
            />
            <div className="min-w-0 flex-1">
                <AppPageHeader
                    greetingName={memberName}
                    residenceName={residence?.name ?? "Busca pública de quartos"}
                    settingsHref={user ? "/settings" : undefined}
                    residenceControl={
                        residences.length ? (
                            <label className="flex items-center gap-2 rounded-xl bg-[#e8e5e9] p-1 text-xs">
                                <span className="sr-only">Residência ativa</span>
                                <SystemSelect
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
                                </SystemSelect>
                            </label>
                        ) : undefined
                    }
                />
                <main className="mx-auto max-w-[1480px] p-5 md:p-10">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#dedee4]">
                        <div
                            className="flex gap-7 overflow-x-auto"
                            role="tablist"
                            aria-label="Categorias de quartos"
                        >
                            {visibleTabs.map(({ key, label }) => (
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
                        {canManageListings && (
                            <button
                                className={greenButton}
                                onClick={() => {
                                    setEditing(null);
                                    setShowForm(true);
                                    setError("");
                                }}
                            >
                                <Plus size={16} className="mr-1 inline" /> Anunciar quarto
                            </button>
                        )}
                    </div>

                    <form
                        hidden={!canSearch || tab === "mine" || tab === "interests"}
                        onSubmit={applySearch}
                        className="mb-3 flex flex-wrap gap-3"
                    >
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
                                <SystemSelect
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
                                </SystemSelect>
                            </label>
                        </div>
                        <button type="submit" className="sr-only">
                            Buscar
                        </button>
                    </form>

                    {canSearch && tab !== "mine" && applied.length > 0 && (
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
                    {hasActiveResidence && tab === "mine" && (
                        <p role="status" className="mb-4 text-sm text-[#77717c]">
                            A busca de quartos fica disponível para pessoas sem residência ativa.
                            Você ainda pode gerir seus anúncios.
                        </p>
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
                        <div
                            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4"
                            role="presentation"
                            onMouseDown={(event) => {
                                if (event.target === event.currentTarget) closeListingForm();
                            }}
                        >
                            <form
                                key={editing?.id ?? "create"}
                                onSubmit={(event) => void submitListing(event)}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="room-listing-form-title"
                                className="my-auto grid max-h-[calc(100vh-2rem)] w-full max-w-3xl gap-4 overflow-y-auto rounded-2xl border bg-white p-5 shadow-2xl md:grid-cols-2"
                            >
                                <div className="flex items-center justify-between md:col-span-2">
                                    <h2 id="room-listing-form-title" className="text-lg font-bold">
                                        {editing ? "Editar anúncio" : "Novo anúncio"}
                                    </h2>
                                    <button
                                        type="button"
                                        aria-label="Fechar formulário"
                                        disabled={saving}
                                        onClick={closeListingForm}
                                        className="rounded-lg p-1 text-[#77717c] hover:bg-[#f2edf3] disabled:opacity-50"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                {error && (
                                    <p
                                        role="alert"
                                        className="rounded-lg bg-red-50 p-3 text-sm text-red-800 md:col-span-2"
                                    >
                                        {error}
                                    </p>
                                )}
                                <RoomListingFields residence={residence} editing={editing} />
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
                                        disabled={saving}
                                        onClick={closeListingForm}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="mb-4 flex items-end justify-between">
                        <div>
                            <h2 className="font-bold">
                                {meta.total}{" "}
                                {tab === "interests"
                                    ? meta.total === 1
                                        ? "interesse"
                                        : "interesses"
                                    : meta.total === 1
                                      ? "resultado"
                                      : "resultados"}
                                {tab !== "interests" && filters.cidade
                                    ? ` para ${filters.cidade}`
                                    : ""}
                            </h2>
                            <p className="text-xs text-[#77717c]">
                                {tab === "interests"
                                    ? "Acompanhe o status dos seus pedidos e continue a conversa após a aceitação."
                                    : "Endereço completo e contato aparecem apenas quando autorizados pelo anunciante."}
                            </p>
                        </div>
                        <span className="rounded-full bg-[#e7f3e9] px-3 py-1.5 text-xs font-semibold text-[#2b6330]">
                            {meta.total}{" "}
                            {tab === "interests" ? "interesses" : "anúncios encontrados"}
                        </span>
                    </div>
                    {loading ? (
                        <p role="status" className="py-16 text-center text-sm text-[#77717c]">
                            {tab === "interests"
                                ? "Carregando seus interesses..."
                                : "Carregando anúncios..."}
                        </p>
                    ) : error && !listings.length ? null : tab === "interests" ? (
                        myInterests.length === 0 ? (
                            <div className="rounded-2xl border border-dashed bg-white px-5 py-16 text-center">
                                <BedDouble className="mx-auto mb-3 text-[#879080]" />
                                <h3 className="font-semibold">
                                    Você ainda não demonstrou interesse
                                </h3>
                                <p className="mt-1 text-sm text-[#77717c]">
                                    Seus pedidos e conversas aceitas aparecerão aqui.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {myInterests.map((interest) => (
                                    <article
                                        key={interest.id}
                                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4"
                                    >
                                        <div>
                                            <h3 className="font-semibold">
                                                {interest.anuncio.titulo}
                                            </h3>
                                            <p className="mt-1 text-xs text-[#77717c]">
                                                {[interest.anuncio.bairro, interest.anuncio.cidade]
                                                    .filter(Boolean)
                                                    .join(", ")}
                                            </p>
                                            <p className="mt-2 text-sm">
                                                Estado:{" "}
                                                {interest.status === "PENDENTE"
                                                    ? "Aguardando resposta"
                                                    : interest.status === "ACEITO"
                                                      ? "Negociação aberta"
                                                      : "Recusado"}
                                            </p>
                                            {interest.mensagem && (
                                                <p className="mt-1 text-sm text-[#77717c]">
                                                    Sua mensagem: {interest.mensagem}
                                                </p>
                                            )}
                                        </div>
                                        {interest.negotiationId && (
                                            <button
                                                className={greenButton}
                                                onClick={() =>
                                                    router.push(
                                                        `/rooms/negotiations/${interest.negotiationId}`
                                                    )
                                                }
                                            >
                                                Abrir conversa
                                            </button>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )
                    ) : listings.length === 0 ? (
                        <div className="rounded-2xl border border-dashed bg-white px-5 py-16 text-center">
                            <BedDouble className="mx-auto mb-3 text-[#879080]" />
                            <h3 className="font-semibold">Nenhum anúncio encontrado</h3>
                            <p className="mt-1 text-sm text-[#77717c]">
                                Ajuste os filtros ou tente outra localização.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            {listings.map((listing) => {
                                const interest = getMyInterestForListing(myInterests, listing.id);
                                return (
                                    <RoomListingCard key={listing.id} listing={listing}>
                                        {interest?.status === "PENDENTE" && (
                                            <p
                                                role="status"
                                                className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
                                            >
                                                Interesse enviado · aguardando anunciante
                                            </p>
                                        )}
                                        {interest?.status === "RECUSADO" && (
                                            <p className="mb-3 rounded-lg bg-[#fcebec] px-3 py-2 text-sm text-[#8e282d]">
                                                Interesse recusado · você pode tentar novamente
                                            </p>
                                        )}
                                        {interest?.status === "ACEITO" && (
                                            <div className="mb-3 rounded-lg bg-[#e7f3e9] p-3">
                                                <p className="mb-2 text-sm font-semibold text-[#285a2e]">
                                                    Interesse aceito · negociação aberta
                                                </p>
                                                {interest.negotiationId ? (
                                                    <button
                                                        type="button"
                                                        className={greenButton}
                                                        onClick={() =>
                                                            router.push(
                                                                `/rooms/negotiations/${interest.negotiationId}`
                                                            )
                                                        }
                                                    >
                                                        Abrir conversa
                                                    </button>
                                                ) : (
                                                    <p className="text-sm text-[#285a2e]">
                                                        Atualize a tela para acessar a conversa.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            onClick={() =>
                                                tab === "mine"
                                                    ? void openManagement(listing)
                                                    : openListingDetails(listing)
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
                                                        setError("");
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
                                    </RoomListingCard>
                                );
                            })}
                        </div>
                    )}

                    {tab !== "mine" && tab !== "interests" && meta.totalPages > 1 && (
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
                                                {interest.status === "ACEITO" &&
                                                    interest.negotiationId && (
                                                        <button
                                                            className="mt-2 rounded border px-3 py-1.5 text-xs"
                                                            onClick={() =>
                                                                router.push(
                                                                    `/rooms/negotiations/${interest.negotiationId}`
                                                                )
                                                            }
                                                        >
                                                            Abrir conversa
                                                        </button>
                                                    )}
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
                                    {loadingInterestStatus ? (
                                        <p role="status" className="text-sm text-[#77717c]">
                                            Verificando o estado do seu interesse...
                                        </p>
                                    ) : interestStatusError ? (
                                        <div
                                            role="alert"
                                            className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
                                        >
                                            <p>
                                                Não foi possível confirmar se você já demonstrou
                                                interesse.
                                            </p>
                                            <button
                                                type="button"
                                                className="mt-2 underline"
                                                onClick={() => void refreshMyInterests()}
                                            >
                                                Tentar novamente
                                            </button>
                                        </div>
                                    ) : selectedInterest?.status === "ACEITO" ? (
                                        <div className="rounded-lg bg-[#e7f3e9] p-3">
                                            <p className="text-sm font-semibold text-[#285a2e]">
                                                Seu interesse foi aceito. A negociação está aberta.
                                            </p>
                                            {selectedInterest.negotiationId ? (
                                                <button
                                                    type="button"
                                                    className={`${greenButton} mt-3`}
                                                    onClick={() =>
                                                        router.push(
                                                            `/rooms/negotiations/${selectedInterest.negotiationId}`
                                                        )
                                                    }
                                                >
                                                    Abrir conversa
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="mt-2 text-sm underline"
                                                    onClick={() => void refreshMyInterests()}
                                                >
                                                    Atualizar conversa
                                                </button>
                                            )}
                                        </div>
                                    ) : selectedInterest?.status === "PENDENTE" ? (
                                        <p
                                            role="status"
                                            className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
                                        >
                                            Seu interesse já foi enviado. Aguarde a resposta do
                                            anunciante.
                                        </p>
                                    ) : (
                                        <>
                                            {selectedInterest?.status === "RECUSADO" && (
                                                <p className="rounded-lg bg-[#fcebec] p-3 text-sm text-[#8e282d]">
                                                    Seu interesse anterior foi recusado. Você pode
                                                    tentar novamente.
                                                </p>
                                            )}
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
                                                {selectedInterest?.status === "RECUSADO"
                                                    ? "Tentar novamente"
                                                    : "Tenho interesse"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
