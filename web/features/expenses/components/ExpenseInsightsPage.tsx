"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
    ArrowLeft,
    CalendarDays,
    Check,
    ChevronDown,
    CircleAlert,
    Filter,
    SlidersHorizontal,
    Wallet,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    getExpenseHomeMembers,
    getExpenseHomes,
    getExpenseInsights,
    getExpenseSubgroups,
} from "@/features/expenses/api/expenses.api";
import type {
    ExpenseHome,
    ExpenseHomeMember,
    ExpenseInsights,
    ExpenseInsightsStatus,
    ExpenseSubgroup,
} from "@/features/expenses/api/expenses.api";

import { expenseMonthRange } from "../lib/finance-format";

type PeriodPreset = "CURRENT_MONTH" | "NEXT_MONTH" | "LAST_SIX_MONTHS" | "CUSTOM";
type MemberSort = "overdue" | "paid" | "due" | "percentage";
type OverdueSort = "days" | "amount";
type InsightsFilters = {
    homeId: string;
    preset: PeriodPreset;
    from: string;
    to: string;
    participationId: string;
    subgroupId: string;
    status: ExpenseInsightsStatus;
};
type VisualizationId =
    | "summary"
    | "contributionRanking"
    | "overdueByMember"
    | "residentComparison"
    | "monthlyEvolution"
    | "wholeBillsPaid"
    | "overdueAllocations";
type VisualizationPreferences = Record<VisualizationId, boolean>;

const VISUALIZATION_STORAGE_PREFIX = "fullhouse:insights:view-preferences:v1:";
const DEFAULT_VISUALIZATIONS: VisualizationPreferences = {
    summary: true,
    contributionRanking: true,
    overdueByMember: true,
    residentComparison: true,
    monthlyEvolution: true,
    wholeBillsPaid: true,
    overdueAllocations: true,
};
const VISUALIZATION_OPTIONS: {
    id: VisualizationId;
    label: string;
    description: string;
}[] = [
    {
        id: "summary",
        label: "Resumo da casa",
        description: "Totais devidos, pagos, em aberto e em atraso.",
    },
    {
        id: "contributionRanking",
        label: "Percentual pago por morador",
        description: "Mostra quem já quitou uma parte maior da própria cota.",
    },
    {
        id: "overdueByMember",
        label: "Atrasos por morador",
        description: "Compara o valor vencido que ainda está em aberto.",
    },
    {
        id: "residentComparison",
        label: "Comparativo das cotas",
        description: "Compara valores devidos, pagos e em aberto por morador.",
    },
    {
        id: "monthlyEvolution",
        label: "Evolução mensal",
        description: "Acompanha as cotas pelo mês de vencimento.",
    },
    {
        id: "wholeBillsPaid",
        label: "Contas inteiras pagas",
        description: "Mostra quem registrou a quitação de cada conta da casa.",
    },
    {
        id: "overdueAllocations",
        label: "Lista de cotas em atraso",
        description: "Detalha despesa, morador, vencimento e valor em aberto.",
    },
];

function normalizeVisualizationPreferences(value: unknown): VisualizationPreferences {
    const saved =
        typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
    return Object.fromEntries(
        VISUALIZATION_OPTIONS.map(({ id }) => [
            id,
            typeof saved[id] === "boolean" ? saved[id] : DEFAULT_VISUALIZATIONS[id],
        ])
    ) as VisualizationPreferences;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
});

function businessDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Fortaleza",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
}

function presetRange(preset: Exclude<PeriodPreset, "CUSTOM">, today: string) {
    if (preset === "NEXT_MONTH") return expenseMonthRange(today, 1);
    const currentMonth = expenseMonthRange(today);
    return preset === "LAST_SIX_MONTHS"
        ? { from: expenseMonthRange(today, -5).from, to: currentMonth.to }
        : currentMonth;
}

function defaultFilters(): InsightsFilters {
    const today = businessDate();
    const month = expenseMonthRange(today);
    if (typeof window === "undefined")
        return {
            homeId: "",
            preset: "CURRENT_MONTH",
            ...month,
            participationId: "",
            subgroupId: "",
            status: "ALL",
        };

    const params = new URLSearchParams(window.location.search);
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";
    const validDate = (value: string) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
    };
    const requestedRange = params.get("range");
    const requestedPreset: PeriodPreset =
        requestedRange === "CURRENT_MONTH" ||
        requestedRange === "NEXT_MONTH" ||
        requestedRange === "LAST_SIX_MONTHS" ||
        requestedRange === "CUSTOM"
            ? requestedRange
            : from && to && (from !== month.from || to !== month.to)
              ? "CUSTOM"
              : "CURRENT_MONTH";
    const validCustom = validDate(from) && validDate(to) && from <= to;
    const preset = requestedPreset === "CUSTOM" && !validCustom ? "CURRENT_MONTH" : requestedPreset;
    const range = preset === "CUSTOM" ? { from, to } : presetRange(preset, today);
    const status = params.get("status");
    return {
        homeId: params.get("homeId") ?? "",
        preset,
        ...range,
        participationId: params.get("participationId") ?? "",
        subgroupId: params.get("subgroupId") ?? "",
        status: status === "PAID" || status === "PENDING" || status === "OVERDUE" ? status : "ALL",
    };
}

function formatCurrency(value: string | number) {
    return currency.format(Number(value));
}

function formatDate(value: string) {
    return dateFormatter.format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

function monthLabel(value: string) {
    return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" })
        .format(new Date(`${value}-01T00:00:00.000Z`))
        .replace(" de ", " ");
}

function errorMessage(error: unknown) {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { message?: unknown } } }).response;
        const message = response?.data?.message;
        if (typeof message === "string") return message;
        if (Array.isArray(message)) return message.join(" ");
    }
    return "Não foi possível carregar os Insights. Tente novamente.";
}

function updateAddress(filters: InsightsFilters) {
    const params = new URLSearchParams({
        range: filters.preset,
        from: filters.from,
        to: filters.to,
        status: filters.status,
    });
    if (filters.participationId) params.set("participationId", filters.participationId);
    if (filters.subgroupId) params.set("subgroupId", filters.subgroupId);
    if (filters.homeId) params.set("homeId", filters.homeId);
    window.history.replaceState(null, "", `/finance/insights?${params.toString()}`);
}

function moneyCents(value: string) {
    const [whole, fraction = ""] = value.replace(",", ".").split(".");
    return Math.round(Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2)));
}

function Card({
    label,
    value,
    detail,
    color,
    icon,
}: {
    label: string;
    value: string;
    detail: string;
    color: string;
    icon: ReactNode;
}) {
    return (
        <article className="rounded-xl border border-[#ded6e2] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[#706a74]">{label}</p>
                <span className={`grid size-9 place-items-center rounded-lg ${color}`}>{icon}</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#29252d]">{value}</p>
            <p className="mt-1 text-xs text-[#817b84]">{detail}</p>
        </article>
    );
}

export default function ExpenseInsightsPage() {
    const { user, loading: authLoading } = useAuth();
    const [homes, setHomes] = useState<ExpenseHome[]>([]);
    const [members, setMembers] = useState<ExpenseHomeMember[]>([]);
    const [subgroups, setSubgroups] = useState<ExpenseSubgroup[]>([]);
    const [insights, setInsights] = useState<ExpenseInsights | null>(null);
    const [contributionInsights, setContributionInsights] = useState<ExpenseInsights | null>(null);
    const [filters, setFilters] = useState<InsightsFilters | null>(null);
    const [sortBy, setSortBy] = useState<MemberSort>("overdue");
    const [overdueSort, setOverdueSort] = useState<OverdueSort>("days");
    const [initialLoading, setInitialLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [error, setError] = useState("");
    const [residenceError, setResidenceError] = useState("");
    const [visibleViews, setVisibleViews] =
        useState<VisualizationPreferences>(DEFAULT_VISUALIZATIONS);
    const [preferencesUserId, setPreferencesUserId] = useState<string | null>(null);
    const [preferenceStorageAvailable, setPreferenceStorageAvailable] = useState<boolean | null>(
        null
    );
    const home = homes.find((item) => item.id === filters?.homeId) ?? homes[0];
    const preferencesStorageKey = user?.id ? `${VISUALIZATION_STORAGE_PREFIX}${user.id}` : null;
    const hasVisibleViews = Object.values(visibleViews).some(Boolean);

    useEffect(() => {
        if (authLoading || !user?.id || !preferencesStorageKey) return;
        let preferences = DEFAULT_VISUALIZATIONS;
        try {
            const stored = window.localStorage.getItem(preferencesStorageKey);
            if (stored) {
                try {
                    preferences = normalizeVisualizationPreferences(JSON.parse(stored));
                } catch {
                    preferences = DEFAULT_VISUALIZATIONS;
                }
            }
            // Verify both reading and writing while hydrating browser-only preferences.
            window.localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
            // Hydrate after mount so server and initial client markup remain the same.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPreferenceStorageAvailable(true);
        } catch {
            setPreferenceStorageAvailable(false);
        }
        setVisibleViews(preferences);
        setPreferencesUserId(user.id);
    }, [authLoading, user?.id, preferencesStorageKey]);

    const loadHomes = useCallback(async () => {
        setInitialLoading(true);
        setResidenceError("");
        try {
            setHomes(await getExpenseHomes());
        } catch (loadError: unknown) {
            setResidenceError(errorMessage(loadError));
        } finally {
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        // Read query parameters after mount to avoid a server/client hydration mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFilters(defaultFilters());
        void loadHomes();
    }, [loadHomes]);

    const setFilter = useCallback((update: Partial<InsightsFilters>) => {
        setFilters((current) => {
            if (!current) return current;
            return { ...current, ...update };
        });
        setLoading(true);
        setError("");
        setInsights(null);
        setContributionInsights(null);
    }, []);

    function saveVisualizations(next: VisualizationPreferences) {
        setVisibleViews(next);
        if (!preferencesStorageKey || preferencesUserId !== user?.id) return;
        try {
            window.localStorage.setItem(preferencesStorageKey, JSON.stringify(next));
            setPreferenceStorageAvailable(true);
        } catch {
            setPreferenceStorageAvailable(false);
        }
    }

    useEffect(() => {
        if (filters) updateAddress(filters);
    }, [filters]);

    useEffect(() => {
        const refresh = () => setRefreshVersion((version) => version + 1);
        window.addEventListener("focus", refresh);
        return () => window.removeEventListener("focus", refresh);
    }, []);

    useEffect(() => {
        if (!home || !filters) return;
        let active = true;
        const query = {
            from: filters.from,
            to: filters.to,
            status: filters.status,
            ...(filters.participationId ? { participationId: filters.participationId } : {}),
            ...(filters.subgroupId ? { subgroupId: filters.subgroupId } : {}),
        };
        const insightRequest = getExpenseInsights(home.id, query);
        const contributionRequest =
            filters.status === "ALL"
                ? insightRequest
                : getExpenseInsights(home.id, { ...query, status: "ALL" });
        Promise.all([
            getExpenseHomeMembers(home.id),
            getExpenseSubgroups(),
            insightRequest,
            contributionRequest,
        ])
            .then(([availableMembers, availableSubgroups, result, contributionResult]) => {
                if (!active) return;
                setError("");
                setMembers(availableMembers);
                setSubgroups(availableSubgroups.filter((item) => item.homeId === home.id));
                setInsights(result);
                setContributionInsights(contributionResult);
            })
            .catch((loadError: unknown) => {
                if (!active) return;
                setError(errorMessage(loadError));
                setInsights(null);
                setContributionInsights(null);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [home, filters, refreshVersion]);

    const sortedMembers = useMemo(() => {
        const items = [...(insights?.members ?? [])];
        const comparators: Record<
            MemberSort,
            (a: ExpenseInsights["members"][number], b: ExpenseInsights["members"][number]) => number
        > = {
            overdue: (
                a: ExpenseInsights["members"][number],
                b: ExpenseInsights["members"][number]
            ) => moneyCents(b.overdueAmount) - moneyCents(a.overdueAmount),
            paid: (a: ExpenseInsights["members"][number], b: ExpenseInsights["members"][number]) =>
                moneyCents(b.paidAmount) - moneyCents(a.paidAmount),
            due: (a: ExpenseInsights["members"][number], b: ExpenseInsights["members"][number]) =>
                moneyCents(b.dueAmount) - moneyCents(a.dueAmount),
            percentage: (
                a: ExpenseInsights["members"][number],
                b: ExpenseInsights["members"][number]
            ) => (b.paidPercentage ?? 0) - (a.paidPercentage ?? 0),
        };
        return items.sort(
            (a, b) => comparators[sortBy](a, b) || a.name.localeCompare(b.name, "pt-BR")
        );
    }, [insights, sortBy]);

    const contributionRanking = useMemo(
        () =>
            [...(contributionInsights?.members ?? [])]
                .filter(
                    (member) => member.paidPercentage !== null && moneyCents(member.dueAmount) > 0
                )
                .sort(
                    (left, right) =>
                        (left.paidPercentage ?? 0) - (right.paidPercentage ?? 0) ||
                        left.name.localeCompare(right.name, "pt-BR")
                ),
        [contributionInsights]
    );

    const overdueMembers = useMemo(
        () =>
            [...(insights?.members ?? [])]
                .filter((member) => moneyCents(member.overdueAmount) > 0)
                .sort(
                    (left, right) =>
                        moneyCents(right.overdueAmount) - moneyCents(left.overdueAmount) ||
                        right.overdueCount - left.overdueCount ||
                        left.name.localeCompare(right.name, "pt-BR")
                ),
        [insights]
    );

    const sortedOverdueAllocations = useMemo(() => {
        const items = [...(insights?.overdueAllocations ?? [])];
        return items.sort((left, right) =>
            overdueSort === "amount"
                ? moneyCents(right.amount) - moneyCents(left.amount) ||
                  right.overdueDays - left.overdueDays
                : right.overdueDays - left.overdueDays ||
                  moneyCents(right.amount) - moneyCents(left.amount)
        );
    }, [insights, overdueSort]);

    const residentOptions = useMemo(() => {
        const options = new Map<string, { id: string; name: string; active: boolean }>();
        for (const member of members) {
            options.set(member.id, { ...member, active: true });
        }
        for (const member of insights?.members ?? []) {
            if (!options.has(member.participationId)) {
                options.set(member.participationId, {
                    id: member.participationId,
                    name: member.name,
                    active: member.active,
                });
            }
        }
        return [...options.values()].sort((left, right) =>
            left.name.localeCompare(right.name, "pt-BR")
        );
    }, [members, insights]);

    const maxDue = Math.max(1, ...sortedMembers.map((member) => moneyCents(member.dueAmount)));
    const maxMonthly = Math.max(
        1,
        ...(insights?.monthly ?? []).map((month) => moneyCents(month.dueAmount))
    );
    const maxWholeBills = Math.max(
        1,
        ...(insights?.wholeBillsPaidByMember ?? []).map((member) => moneyCents(member.amount))
    );
    const maxOverdueByMember = Math.max(
        1,
        ...overdueMembers.map((member) => moneyCents(member.overdueAmount))
    );

    function applyPreset(preset: PeriodPreset) {
        setFilter(
            preset === "CUSTOM" ? { preset } : { preset, ...presetRange(preset, businessDate()) }
        );
    }

    if (initialLoading) {
        return (
            <main className="mx-auto max-w-[1500px] p-5 md:p-[30px]">
                <p role="status" className="text-sm text-[#77717c]">
                    Carregando Insights financeiros…
                </p>
            </main>
        );
    }

    if (residenceError) {
        return (
            <main className="mx-auto max-w-[1500px] p-5 md:p-[30px]">
                <section className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
                    <h1 className="text-xl font-semibold text-red-900">
                        Não foi possível carregar a residência
                    </h1>
                    <p role="alert" className="mt-2 text-sm text-red-800">
                        {residenceError}
                    </p>
                    <button
                        type="button"
                        onClick={() => void loadHomes()}
                        className="mt-5 rounded-lg bg-[#4e812f] px-4 py-2.5 text-sm font-medium text-white"
                    >
                        Tentar novamente
                    </button>
                </section>
            </main>
        );
    }

    if (!home) {
        return (
            <main className="mx-auto max-w-[1500px] p-5 md:p-[30px]">
                <section className="rounded-xl border border-[#ded6e2] bg-white p-8 text-center">
                    <Wallet className="mx-auto mb-3 text-[#4e812f]" size={30} />
                    <h1 className="text-xl font-semibold">Insights da residência</h1>
                    <p className="mt-2 text-sm text-[#706a74]">
                        Associe-se a uma residência para comparar as cotas e despesas da casa.
                    </p>
                    <Link
                        href="/finance"
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#4e812f] px-4 py-2.5 text-sm font-medium text-white"
                    >
                        <ArrowLeft size={16} /> Voltar ao Financeiro
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1500px] space-y-5 p-5 md:p-[30px]">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Link
                        href="/finance"
                        className="mb-2 inline-flex items-center gap-1.5 text-sm text-[#4e812f] hover:underline"
                    >
                        <ArrowLeft size={15} /> Financeiro
                    </Link>
                    <h1 className="text-2xl font-bold text-[#29252d]">Insights financeiros</h1>
                    <p className="mt-1 text-sm text-[#706a74]">
                        Compare as cotas da casa e acompanhe as pendências de {home.name}.
                    </p>
                </div>
                <p className="text-xs text-muted-foreground">Visão da casa</p>
            </header>

            <section
                aria-label="Filtros dos Insights"
                className="rounded-xl border border-[#ded6e2] bg-white p-4 shadow-sm"
            >
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#514c56]">
                    <Filter size={16} /> Filtros
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <label className="text-xs font-medium text-[#625c66]">
                        Período
                        <select
                            aria-label="Período"
                            value={filters?.preset ?? "CURRENT_MONTH"}
                            onChange={(event) => applyPreset(event.target.value as PeriodPreset)}
                            className="mt-1.5 w-full rounded-lg border border-[#d8d1da] bg-white px-3 py-2.5 text-sm text-[#29252d]"
                        >
                            <option value="CURRENT_MONTH">Mês atual</option>
                            <option value="NEXT_MONTH">Próximo mês</option>
                            <option value="LAST_SIX_MONTHS">Últimos 6 meses</option>
                            <option value="CUSTOM">Personalizado</option>
                        </select>
                    </label>
                    {filters?.preset === "CUSTOM" && (
                        <>
                            <label className="text-xs font-medium text-[#625c66]">
                                De
                                <input
                                    type="date"
                                    aria-label="Data inicial"
                                    value={filters.from}
                                    max={filters.to}
                                    onChange={(event) => setFilter({ from: event.target.value })}
                                    className="mt-1.5 w-full rounded-lg border border-[#d8d1da] bg-white px-3 py-2.5 text-sm text-[#29252d]"
                                />
                            </label>
                            <label className="text-xs font-medium text-[#625c66]">
                                Até
                                <input
                                    type="date"
                                    aria-label="Data final"
                                    value={filters.to}
                                    min={filters.from}
                                    onChange={(event) => setFilter({ to: event.target.value })}
                                    className="mt-1.5 w-full rounded-lg border border-[#d8d1da] bg-white px-3 py-2.5 text-sm text-[#29252d]"
                                />
                            </label>
                        </>
                    )}
                    <label className="text-xs font-medium text-[#625c66]">
                        Morador
                        <select
                            aria-label="Filtrar por morador"
                            value={filters?.participationId ?? ""}
                            onChange={(event) => setFilter({ participationId: event.target.value })}
                            className="mt-1.5 w-full rounded-lg border border-[#d8d1da] bg-white px-3 py-2.5 text-sm text-[#29252d]"
                        >
                            <option value="">Todos os moradores</option>
                            {residentOptions.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                    {!member.active ? " (ex-morador)" : ""}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs font-medium text-[#625c66]">
                        Subgrupo
                        <select
                            aria-label="Filtrar por subgrupo"
                            value={filters?.subgroupId ?? ""}
                            onChange={(event) => setFilter({ subgroupId: event.target.value })}
                            className="mt-1.5 w-full rounded-lg border border-[#d8d1da] bg-white px-3 py-2.5 text-sm text-[#29252d]"
                        >
                            <option value="">Todos os subgrupos visíveis</option>
                            {subgroups.map((subgroup) => (
                                <option key={subgroup.id} value={subgroup.id}>
                                    {subgroup.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs font-medium text-[#625c66]">
                        Situação da cota
                        <select
                            aria-label="Filtrar por situação da cota"
                            value={filters?.status ?? "ALL"}
                            onChange={(event) =>
                                setFilter({ status: event.target.value as ExpenseInsightsStatus })
                            }
                            className="mt-1.5 w-full rounded-lg border border-[#d8d1da] bg-white px-3 py-2.5 text-sm text-[#29252d]"
                        >
                            <option value="ALL">Todas</option>
                            <option value="PAID">Pagas</option>
                            <option value="PENDING">Pendentes</option>
                            <option value="OVERDUE">Atrasadas</option>
                        </select>
                    </label>
                </div>
                {filters?.preset === "CUSTOM" && filters.from > filters.to && (
                    <p role="alert" className="mt-3 text-sm text-red-700">
                        A data inicial deve ser anterior à data final.
                    </p>
                )}
            </section>

            <details className="group rounded-xl border border-[#ded6e2] bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-xl p-4 text-sm font-semibold text-[#29252d] outline-none focus-visible:ring-2 focus-visible:ring-[#4e812f] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                        <SlidersHorizontal size={17} className="text-[#4e812f]" />
                        Personalizar visualizações
                    </span>
                    <span className="text-xs font-normal text-[#706a74]">
                        {Object.values(visibleViews).filter(Boolean).length} de{" "}
                        {VISUALIZATION_OPTIONS.length} visíveis
                    </span>
                    <ChevronDown
                        aria-hidden="true"
                        size={16}
                        className="text-[#706a74] transition-transform group-open:rotate-180"
                    />
                </summary>
                <div className="border-t border-[#eee9f0] px-4 pb-4 pt-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-[#706a74]">
                            Escolha os blocos exibidos. Os filtros e os dados da casa não mudam.
                        </p>
                        <button
                            type="button"
                            onClick={() => saveVisualizations({ ...DEFAULT_VISUALIZATIONS })}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-[#4e812f] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f]"
                        >
                            Restaurar padrão
                        </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {VISUALIZATION_OPTIONS.map((option) => (
                            <label
                                key={option.id}
                                htmlFor={"insights-view-" + option.id}
                                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#eee9f0] p-3 hover:bg-[#faf9fb]"
                            >
                                <input
                                    id={"insights-view-" + option.id}
                                    type="checkbox"
                                    checked={visibleViews[option.id]}
                                    onChange={(event) =>
                                        saveVisualizations({
                                            ...visibleViews,
                                            [option.id]: event.target.checked,
                                        })
                                    }
                                    className="mt-0.5 size-4 shrink-0 accent-[#4e812f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f]"
                                />
                                <span>
                                    <span className="block text-sm font-medium text-[#29252d]">
                                        {option.label}
                                    </span>
                                    <span className="mt-0.5 block text-xs font-normal text-[#706a74]">
                                        {option.description}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                    {preferenceStorageAvailable !== null && (
                        <p className="mt-3 text-xs text-[#817b84]" role="status">
                            {preferenceStorageAvailable
                                ? "As escolhas ficam salvas neste navegador para seu usuário."
                                : "O navegador não permitiu salvar as escolhas; elas valem enquanto esta página estiver aberta."}
                        </p>
                    )}
                </div>
            </details>

            {error && (
                <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => {
                            if (filters) setFilter({ ...filters });
                        }}
                        className="rounded-md border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100"
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {loading && (
                <p role="status" className="text-sm text-[#77717c]">
                    Atualizando os dados do período…
                </p>
            )}

            {insights && (
                <>
                    <section
                        hidden={!visibleViews.summary}
                        style={!visibleViews.summary ? { display: "none" } : undefined}
                        aria-label="Resumo das cotas"
                        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
                    >
                        <Card
                            label="Devido em cotas"
                            value={formatCurrency(insights.summary.dueAmount)}
                            detail="Rateios no período selecionado"
                            color="bg-[#eeeaf0] text-[#625c66]"
                            icon={<Wallet size={18} />}
                        />
                        <Card
                            label="Marcado como pago"
                            value={formatCurrency(insights.summary.paidAmount)}
                            detail="Cotas que os moradores marcaram como pagas"
                            color="bg-green-100 text-green-700"
                            icon={<Check size={18} />}
                        />
                        <Card
                            label="Em aberto"
                            value={formatCurrency(insights.summary.pendingAmount)}
                            detail="Inclui as cotas em atraso"
                            color="bg-amber-100 text-amber-700"
                            icon={<CalendarDays size={18} />}
                        />
                        <Card
                            label="Em atraso"
                            value={formatCurrency(insights.summary.overdueAmount)}
                            detail="Vencidas e ainda pendentes"
                            color="bg-red-100 text-red-700"
                            icon={<CircleAlert size={18} />}
                        />
                        <Card
                            label="Percentual quitado"
                            value={
                                insights.summary.paidPercentage === null
                                    ? "—"
                                    : `${insights.summary.paidPercentage.toFixed(2)}%`
                            }
                            detail="Valor pago ÷ valor devido"
                            color="bg-[#e9f2e5] text-[#4e812f]"
                            icon={<Check size={18} />}
                        />
                    </section>

                    {insights.summary.unallocatedExpenseCount > 0 && (
                        <aside
                            role="status"
                            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
                        >
                            {insights.summary.unallocatedExpenseCount}{" "}
                            {insights.summary.unallocatedExpenseCount === 1
                                ? "despesa sem rateio"
                                : "despesas sem rateio"}{" "}
                            ({formatCurrency(insights.summary.unallocatedExpenseAmount)} no total)
                            não entram no comparativo por morador. O sistema não estimou uma
                            divisão.
                        </aside>
                    )}

                    {!loading &&
                    insights.summary.dueAmount === "0.00" &&
                    insights.summary.unallocatedExpenseCount === 0 ? (
                        <section className="rounded-xl border border-[#ded6e2] bg-white p-8 text-center">
                            <h2 className="font-semibold text-[#29252d]">
                                Nenhuma cota encontrada neste período
                            </h2>
                            <p className="mt-1 text-sm text-[#706a74]">
                                Os Insights usam o vencimento das despesas. Mude o período ou remova
                                algum filtro para ampliar a análise.
                            </p>
                            {filters?.preset === "CURRENT_MONTH" && (
                                <button
                                    type="button"
                                    onClick={() => applyPreset("NEXT_MONTH")}
                                    className="mt-3 cursor-pointer rounded text-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                >
                                    Ver próximo mês
                                </button>
                            )}
                            {!hasVisibleViews && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        saveVisualizations({ ...DEFAULT_VISUALIZATIONS })
                                    }
                                    className="mt-4 rounded-lg bg-[#4e812f] px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f]"
                                >
                                    Mostrar todas as visualizações
                                </button>
                            )}
                        </section>
                    ) : (
                        <div className="grid items-start gap-5 xl:grid-cols-2">
                            {!hasVisibleViews && (
                                <section className="col-span-full rounded-xl border border-dashed border-[#cfc7d3] bg-white p-6 text-center">
                                    <h2 className="font-semibold text-[#29252d]">
                                        Nenhuma visualização selecionada
                                    </h2>
                                    <p className="mt-1 text-sm text-[#706a74]">
                                        Escolha os blocos em “Personalizar visualizações” ou reexiba
                                        tudo.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            saveVisualizations({ ...DEFAULT_VISUALIZATIONS })
                                        }
                                        className="mt-3 rounded-lg bg-[#4e812f] px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f]"
                                    >
                                        Mostrar todas as visualizações
                                    </button>
                                </section>
                            )}
                            <section
                                hidden={!visibleViews.contributionRanking}
                                style={
                                    !visibleViews.contributionRanking
                                        ? { display: "none" }
                                        : undefined
                                }
                                aria-labelledby="contribution-ranking-title"
                                className="rounded-xl border border-[#ded6e2] bg-white p-4 shadow-sm"
                            >
                                <h2
                                    id="contribution-ranking-title"
                                    className="text-lg font-semibold text-[#29252d]"
                                >
                                    Menor percentual de cotas marcadas como pagas
                                </h2>
                                <p className="mt-1 text-xs text-[#706a74]">
                                    Ordenado do menor para o maior. A taxa considera todas as
                                    situações de cota no período, para comparar com o total devido.
                                    “Pago” é uma marcação feita no sistema.
                                </p>
                                <div
                                    className="mt-4 flex flex-wrap gap-3 text-xs text-[#625c66]"
                                    aria-label="Legenda do percentual de cotas"
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        <i className="size-2.5 rounded-sm bg-[#4e812f]" /> Marcado
                                        como pago
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <i className="size-2.5 rounded-sm bg-[#d7d2da]" /> Em aberto
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <i className="size-2.5 rounded-sm bg-[#c43d42]" /> Atrasado
                                    </span>
                                </div>
                                <div
                                    aria-hidden="true"
                                    className="mt-3 flex justify-between text-[10px] text-[#817b84]"
                                >
                                    <span>0%</span>
                                    <span>100%</span>
                                </div>
                                {filters?.status !== "ALL" && (
                                    <p className="mt-3 rounded-lg bg-[#f6f3f7] px-3 py-2 text-xs text-[#625c66]">
                                        O filtro de situação não altera esta taxa; período, morador
                                        e subgrupo continuam aplicados.
                                    </p>
                                )}
                                {contributionRanking.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-[#817b84]">
                                        Não há cotas devidas para comparar com estes filtros.
                                    </p>
                                ) : (
                                    <ul className="mt-4 space-y-4">
                                        {contributionRanking.map((member) => {
                                            const paid = Math.max(
                                                0,
                                                Math.min(100, member.paidPercentage ?? 0)
                                            );
                                            const pending = 100 - paid;
                                            const overdueOfDue = Math.min(
                                                pending,
                                                (moneyCents(member.overdueAmount) /
                                                    moneyCents(member.dueAmount)) *
                                                    100
                                            );
                                            const percentage = (member.paidPercentage ?? 0).toFixed(
                                                1
                                            );
                                            return (
                                                <li key={member.participationId}>
                                                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                                        <span className="font-medium text-[#29252d]">
                                                            {member.name}
                                                            {!member.active && (
                                                                <span className="ml-2 rounded-full bg-[#eeeaf0] px-2 py-0.5 text-[10px] font-normal text-[#706a74]">
                                                                    Ex-morador
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-sm font-semibold text-[#29252d]">
                                                            {percentage}%
                                                        </span>
                                                    </div>
                                                    <div
                                                        role="img"
                                                        aria-label={
                                                            member.name +
                                                            ": " +
                                                            percentage +
                                                            "% das cotas marcadas como pagas, " +
                                                            formatCurrency(member.paidAmount) +
                                                            " de " +
                                                            formatCurrency(member.dueAmount) +
                                                            ", " +
                                                            formatCurrency(member.overdueAmount) +
                                                            " em atraso"
                                                        }
                                                        className="flex h-3 overflow-hidden rounded-full bg-[#f0edf1]"
                                                    >
                                                        <span
                                                            className="h-full bg-[#4e812f]"
                                                            style={{ width: paid + "%" }}
                                                        />
                                                        <span
                                                            className="relative h-full bg-[#d7d2da]"
                                                            style={{ width: pending + "%" }}
                                                        >
                                                            <span
                                                                className="absolute inset-y-0 left-0 bg-[#c43d42]"
                                                                style={{
                                                                    width:
                                                                        pending > 0
                                                                            ? (overdueOfDue /
                                                                                  pending) *
                                                                                  100 +
                                                                              "%"
                                                                            : "0%",
                                                                }}
                                                            />
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-[#706a74]">
                                                        {formatCurrency(member.paidAmount)} de{" "}
                                                        {formatCurrency(member.dueAmount)} marcado
                                                        como pago ·{" "}
                                                        {formatCurrency(member.overdueAmount)} em
                                                        atraso
                                                    </p>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>

                            <section
                                hidden={!visibleViews.overdueByMember}
                                style={
                                    !visibleViews.overdueByMember ? { display: "none" } : undefined
                                }
                                aria-labelledby="overdue-by-member-title"
                                className="rounded-xl border border-[#ded6e2] bg-white p-4 shadow-sm"
                            >
                                <h2
                                    id="overdue-by-member-title"
                                    className="text-lg font-semibold text-[#29252d]"
                                >
                                    Valor em atraso por morador
                                </h2>
                                <p className="mt-1 text-xs text-[#706a74]">
                                    Ordenado pelo maior valor vencido. O valor em atraso faz parte
                                    do total em aberto; as barras são proporcionais ao maior valor
                                    vencido neste recorte.
                                </p>
                                {overdueMembers.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-[#817b84]">
                                        Nenhuma cota vencida corresponde aos filtros selecionados.
                                    </p>
                                ) : (
                                    <ul className="mt-4 space-y-4">
                                        {overdueMembers.map((member) => {
                                            const amount = moneyCents(member.overdueAmount);
                                            const width = (amount / maxOverdueByMember) * 100;
                                            return (
                                                <li key={member.participationId}>
                                                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                                        <span className="font-medium text-[#29252d]">
                                                            {member.name}
                                                            {!member.active && (
                                                                <span className="ml-2 rounded-full bg-[#eeeaf0] px-2 py-0.5 text-[10px] font-normal text-[#706a74]">
                                                                    Ex-morador
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-sm font-semibold text-[#a82f39]">
                                                            {formatCurrency(member.overdueAmount)}
                                                        </span>
                                                    </div>
                                                    <div
                                                        role="img"
                                                        aria-label={
                                                            member.name +
                                                            ": " +
                                                            formatCurrency(member.overdueAmount) +
                                                            " em " +
                                                            member.overdueCount +
                                                            " cotas atrasadas"
                                                        }
                                                        className="h-3 overflow-hidden rounded-full bg-[#f0edf1]"
                                                    >
                                                        <span
                                                            className="block h-full rounded-full bg-[#c43d42]"
                                                            style={{ width: width + "%" }}
                                                        />
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-[#706a74]">
                                                        {member.overdueCount}{" "}
                                                        {member.overdueCount === 1
                                                            ? "cota vencida"
                                                            : "cotas vencidas"}
                                                    </p>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>

                            <section
                                hidden={!visibleViews.residentComparison}
                                style={
                                    !visibleViews.residentComparison
                                        ? { display: "none" }
                                        : undefined
                                }
                                aria-labelledby="resident-comparison-title"
                                className="rounded-xl border border-[#ded6e2] bg-white p-4 shadow-sm"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2
                                            id="resident-comparison-title"
                                            className="text-lg font-semibold text-[#29252d]"
                                        >
                                            Cotas por morador
                                        </h2>
                                        <p className="mt-1 text-xs text-[#706a74]">
                                            Pago e em aberto em relação ao valor devido.
                                        </p>
                                    </div>
                                    <label className="text-xs text-[#625c66]">
                                        Ordenar por
                                        <select
                                            value={sortBy}
                                            onChange={(event) =>
                                                setSortBy(event.target.value as MemberSort)
                                            }
                                            className="ml-2 rounded-md border border-[#d8d1da] bg-white px-2 py-1.5 text-xs"
                                        >
                                            <option value="overdue">Maior atraso</option>
                                            <option value="paid">Maior valor pago</option>
                                            <option value="due">Maior valor devido</option>
                                            <option value="percentage">
                                                Maior percentual quitado
                                            </option>
                                        </select>
                                    </label>
                                </div>
                                <div
                                    className="mt-4 flex flex-wrap gap-3 text-xs text-[#625c66]"
                                    aria-label="Legenda do gráfico de cotas"
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        <i className="size-2.5 rounded-sm bg-[#4e812f]" /> Pago
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <i className="size-2.5 rounded-sm bg-[#d7d2da]" /> Em aberto
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <i className="size-2.5 rounded-sm bg-[#c43d42]" /> Parte
                                        vencida do aberto
                                    </span>
                                </div>
                                {sortedMembers.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-[#817b84]">
                                        Nenhuma cota corresponde aos filtros.
                                    </p>
                                ) : (
                                    <ul className="mt-4 space-y-4">
                                        {sortedMembers.map((member) => {
                                            const paid = moneyCents(member.paidAmount);
                                            const pending = moneyCents(member.pendingAmount);
                                            const overdue = moneyCents(member.overdueAmount);
                                            const paidWidth = Math.min(100, (paid / maxDue) * 100);
                                            const pendingWidth = Math.min(
                                                100 - paidWidth,
                                                (pending / maxDue) * 100
                                            );
                                            const overdueWidth = pending
                                                ? Math.min(pendingWidth, (overdue / maxDue) * 100)
                                                : 0;
                                            return (
                                                <li key={member.participationId}>
                                                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                                        <span className="font-medium text-[#29252d]">
                                                            {member.name}
                                                            {!member.active && (
                                                                <span className="ml-2 rounded-full bg-[#eeeaf0] px-2 py-0.5 text-[10px] font-normal text-[#706a74]">
                                                                    Ex-morador
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-[#625c66]">
                                                            {member.paidPercentage === null
                                                                ? "—"
                                                                : `${member.paidPercentage.toFixed(1)}%`}{" "}
                                                            quitado ·{" "}
                                                            {formatCurrency(member.paidAmount)} de{" "}
                                                            {formatCurrency(member.dueAmount)}
                                                        </span>
                                                    </div>
                                                    <div
                                                        role="img"
                                                        aria-label={`${member.name}: ${formatCurrency(member.paidAmount)} marcado como pago, ${formatCurrency(member.pendingAmount)} em aberto, dos quais ${formatCurrency(member.overdueAmount)} em atraso`}
                                                        className="flex h-3 overflow-hidden rounded-full bg-[#f0edf1]"
                                                    >
                                                        <span
                                                            className="h-full bg-[#4e812f]"
                                                            style={{ width: `${paidWidth}%` }}
                                                        />
                                                        <span
                                                            className="relative h-full bg-[#d7d2da]"
                                                            style={{ width: `${pendingWidth}%` }}
                                                        >
                                                            <span
                                                                className="absolute inset-y-0 left-0 bg-[#c43d42]"
                                                                style={{
                                                                    width: pendingWidth
                                                                        ? `${(overdueWidth / pendingWidth) * 100}%`
                                                                        : "0%",
                                                                }}
                                                            />
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-[#706a74]">
                                                        Em aberto{" "}
                                                        {formatCurrency(member.pendingAmount)} · em
                                                        atraso{" "}
                                                        {formatCurrency(member.overdueAmount)} ·{" "}
                                                        {member.paidCount} paga(s),{" "}
                                                        {member.pendingCount} pendente(s)
                                                    </p>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>

                            <section
                                hidden={!visibleViews.monthlyEvolution}
                                style={
                                    !visibleViews.monthlyEvolution ? { display: "none" } : undefined
                                }
                                aria-labelledby="monthly-trend-title"
                                className="rounded-xl border border-[#ded6e2] bg-white p-4 shadow-sm"
                            >
                                <h2
                                    id="monthly-trend-title"
                                    className="text-lg font-semibold text-[#29252d]"
                                >
                                    Evolução mensal das cotas
                                </h2>
                                <p className="mt-1 text-xs text-[#706a74]">
                                    Agrupadas pelo vencimento. Meses anteriores mostram a situação
                                    registrada hoje.
                                </p>
                                <div
                                    className="mt-4 flex flex-wrap gap-3 text-xs text-[#625c66]"
                                    aria-label="Legenda da evolução mensal"
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        <i className="size-2.5 rounded-sm bg-[#4e812f]" /> Pago
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <i className="size-2.5 rounded-sm bg-[#d7d2da]" /> Em aberto
                                    </span>
                                </div>
                                <ul className="mt-4 space-y-3">
                                    {insights.monthly.map((month) => {
                                        const due = moneyCents(month.dueAmount);
                                        const paidWidth = due
                                            ? (moneyCents(month.paidAmount) / maxMonthly) * 100
                                            : 0;
                                        const pendingWidth = due
                                            ? (moneyCents(month.pendingAmount) / maxMonthly) * 100
                                            : 0;
                                        return (
                                            <li key={month.month}>
                                                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                                                    <span className="font-medium capitalize text-[#29252d]">
                                                        {monthLabel(month.month)}
                                                    </span>
                                                    <span className="text-xs text-[#625c66]">
                                                        Devido {formatCurrency(month.dueAmount)}
                                                    </span>
                                                </div>
                                                <div
                                                    role="img"
                                                    aria-label={`${monthLabel(month.month)}: ${formatCurrency(month.paidAmount)} pago e ${formatCurrency(month.pendingAmount)} em aberto`}
                                                    className="flex h-3 overflow-hidden rounded-full bg-[#f0edf1]"
                                                >
                                                    <span
                                                        className="h-full bg-[#4e812f]"
                                                        style={{ width: `${paidWidth}%` }}
                                                    />
                                                    <span
                                                        className="h-full bg-[#d7d2da]"
                                                        style={{ width: `${pendingWidth}%` }}
                                                    />
                                                </div>
                                                <p className="mt-1 text-[11px] text-[#706a74]">
                                                    Pago {formatCurrency(month.paidAmount)} · em
                                                    aberto {formatCurrency(month.pendingAmount)} ·
                                                    atrasado {formatCurrency(month.overdueAmount)}
                                                </p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>

                            <section
                                hidden={!visibleViews.wholeBillsPaid}
                                style={
                                    !visibleViews.wholeBillsPaid ? { display: "none" } : undefined
                                }
                                aria-labelledby="bill-payer-title"
                                className="rounded-xl border border-[#ded6e2] bg-white p-4 shadow-sm"
                            >
                                <h2
                                    id="bill-payer-title"
                                    className="text-lg font-semibold text-[#29252d]"
                                >
                                    Contas inteiras marcadas como pagas
                                </h2>
                                <p className="mt-1 text-xs text-[#706a74]">
                                    Valor integral das contas com vencimento no período, agrupado
                                    por quem registrou a quitação. Não representa a cota individual.
                                </p>
                                {insights.wholeBillsPaidByMember.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-[#817b84]">
                                        Nenhuma conta inteira marcada como paga nesse recorte.
                                    </p>
                                ) : (
                                    <ul className="mt-4 space-y-3">
                                        {insights.wholeBillsPaidByMember.map((member) => (
                                            <li key={member.participationId ?? "unknown"}>
                                                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                                                    <span className="font-medium text-[#29252d]">
                                                        {member.name}
                                                    </span>
                                                    <span className="text-xs text-[#625c66]">
                                                        {formatCurrency(member.amount)} ·{" "}
                                                        {member.count} conta(s)
                                                    </span>
                                                </div>
                                                <div
                                                    role="img"
                                                    aria-label={`${member.name}: ${formatCurrency(member.amount)} em contas marcadas como pagas`}
                                                    className="h-2.5 overflow-hidden rounded-full bg-[#f0edf1]"
                                                >
                                                    <span
                                                        className="block h-full rounded-full bg-[#6e4b91]"
                                                        style={{
                                                            width: `${(moneyCents(member.amount) / maxWholeBills) * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section
                                hidden={!visibleViews.overdueAllocations}
                                style={
                                    !visibleViews.overdueAllocations
                                        ? { display: "none" }
                                        : undefined
                                }
                                aria-labelledby="overdue-title"
                                className="rounded-xl border border-[#ded6e2] bg-white p-4 shadow-sm"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <h2
                                        id="overdue-title"
                                        className="text-lg font-semibold text-[#29252d]"
                                    >
                                        Cotas em atraso
                                    </h2>
                                    <label className="text-xs text-[#625c66]">
                                        Ordenar por
                                        <select
                                            value={overdueSort}
                                            onChange={(event) =>
                                                setOverdueSort(event.target.value as OverdueSort)
                                            }
                                            className="ml-2 rounded-md border border-[#d8d1da] bg-white px-2 py-1.5 text-xs"
                                        >
                                            <option value="days">Maior atraso</option>
                                            <option value="amount">Maior valor</option>
                                        </select>
                                    </label>
                                </div>
                                <p className="mt-1 text-xs text-[#706a74]">
                                    Pendências com vencimento anterior a{" "}
                                    {formatDate(insights.period.today)}.
                                </p>
                                {insights.overdueAllocations.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-[#817b84]">
                                        Não há cotas vencidas com os filtros selecionados.
                                    </p>
                                ) : (
                                    <>
                                        <div className="mt-4 hidden overflow-x-auto sm:block">
                                            <table className="w-full text-left text-sm">
                                                <thead className="border-b border-[#eee9f0] text-xs text-[#706a74]">
                                                    <tr>
                                                        <th className="px-2 py-2">Morador</th>
                                                        <th className="px-2 py-2">Despesa</th>
                                                        <th className="px-2 py-2">Vencimento</th>
                                                        <th className="px-2 py-2 text-right">
                                                            Dias
                                                        </th>
                                                        <th className="px-2 py-2 text-right">
                                                            Valor
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#f0edf1]">
                                                    {sortedOverdueAllocations.map((item) => (
                                                        <tr key={item.id}>
                                                            <td className="px-2 py-3 font-medium">
                                                                {item.memberName}
                                                            </td>
                                                            <td className="px-2 py-3">
                                                                {item.description}
                                                                {item.subgroupName && (
                                                                    <span className="block text-xs text-[#817b84]">
                                                                        {item.subgroupName}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-3">
                                                                {formatDate(item.dueDate)}
                                                            </td>
                                                            <td className="px-2 py-3 text-right text-red-700">
                                                                {item.overdueDays}
                                                            </td>
                                                            <td className="px-2 py-3 text-right font-medium">
                                                                {formatCurrency(item.amount)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <ul className="mt-4 space-y-2 sm:hidden">
                                            {sortedOverdueAllocations.map((item) => (
                                                <li
                                                    key={item.id}
                                                    className="rounded-lg border border-[#eee9f0] p-3"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="font-medium">
                                                                {item.memberName}
                                                            </p>
                                                            <p className="mt-0.5 text-sm text-[#625c66]">
                                                                {item.description}
                                                            </p>
                                                        </div>
                                                        <strong className="shrink-0 text-sm">
                                                            {formatCurrency(item.amount)}
                                                        </strong>
                                                    </div>
                                                    <p className="mt-2 text-xs text-red-700">
                                                        Venceu em {formatDate(item.dueDate)} ·{" "}
                                                        {item.overdueDays} dia(s) de atraso
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </section>
                        </div>
                    )}
                    <p className="text-xs text-[#817b84]">
                        Pagamentos são marcações feitas no sistema. O gráfico mensal agrupa pelo
                        vencimento e mostra a situação atual das cotas.
                    </p>
                </>
            )}
        </main>
    );
}
