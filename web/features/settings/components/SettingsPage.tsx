"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
    Bell,
    Brush,
    CalendarDays,
    Candy,
    Coffee,
    Grape,
    House,
    Milk,
    Package,
    PawPrint,
    ShieldCheck,
    Sparkles,
    Tags,
    UserRound,
    UsersRound,
    Wheat,
    Plus,
    Pencil,
    Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    announceResidenceMembershipChanged,
    getResidenceMembers,
    getResidences,
    updateResidenceName,
    removeResidenceMember,
    updateResidenceMemberAccess,
} from "@/features/residences/api/residences.api";
import type { Residence, ResidenceMember } from "@/features/residences/api/residences.api";
import {
    createPantryCategory,
    deletePantryCategory,
    getPantryCategories,
    updatePantryCategory,
} from "@/features/pantry/api/pantry.api";
import type { PantryCategory } from "@/features/pantry/api/pantry.api";
import {
    getResidencePreferences,
    updateResidencePreferences,
} from "@/features/settings/api/settings.api";
import type {
    ResidencePreferences,
    ResidencePreferencesUpdate,
} from "@/features/settings/api/settings.api";
import { PreferencesPanel } from "@/features/settings/components/PreferencesPanel";
import { ProfileSettingsContent } from "@/features/profile/components/ProfilePage";
import { SettingsMembersTable } from "@/features/settings/components/SettingsMembersTable";
import { PantryCategoryModal } from "@/features/pantry/components/PantryCategoryModal";
import {
    getNotifications,
    markNotificationRead,
    subscribeNotifications,
} from "@/features/notifications/api/notifications.api";
import type {
    AppNotification,
    NotificationsResponse,
} from "@/features/notifications/api/notifications.api";

type Section = "account" | "house" | "members" | "permissions" | "notifications" | "preferences";
type PreferenceTab = "general" | "categories" | "pantry" | "finance" | "pets";

const subnav: { id: Section | "account"; label: string; icon: typeof House }[] = [
    { id: "account", label: "Minha conta", icon: UserRound },
    { id: "house", label: "Casa", icon: House },
    { id: "members", label: "Moradores", icon: UsersRound },
    { id: "permissions", label: "Permissões", icon: ShieldCheck },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "preferences", label: "Preferências", icon: Sparkles },
];

const preferenceTabs: {
    id: PreferenceTab;
    label: string;
    icon?: typeof House;
    enabled: boolean;
}[] = [
    { id: "general", label: "Geral", enabled: true },
    { id: "categories", label: "Categorias", icon: Tags, enabled: true },
    { id: "pantry", label: "Despensa", enabled: true },
    { id: "finance", label: "Financeiro", enabled: true },
    { id: "pets", label: "Pets", icon: PawPrint, enabled: true },
];

const defaultPreferences: ResidencePreferences = {
    notifications: {
        newTasks: true,
        newExpenses: true,
        upcomingDueDates: true,
        residentInvitations: true,
        houseUpdates: false,
    },
    pantry: { expirationNoticeDays: 5, showExpired: true },
    finance: { dueNoticeDays: 5, showOverdue: true },
    pets: { vaccineReminders: true, dewormingReminders: true, appointmentReminders: true },
};

const inputClass =
    "min-h-11 w-full rounded-lg border border-[#d8d1da] bg-white px-3 text-sm outline-none focus:border-[#4e812f] focus:ring-2 focus:ring-[#4e812f]/20 disabled:bg-[#f4f1f5] disabled:text-[#77717c]";
const cardClass = "rounded-xl border border-[#dfd6e3] bg-[#fffaff] p-5";
const categoryIcons: Record<string, LucideIcon> = {
    bebidas: Coffee,
    doces: Candy,
    graos: Grape,
    higiene: Sparkles,
    laticínios: Milk,
    laticinios: Milk,
    limpeza: Brush,
    massas: Wheat,
    outros: Package,
};

function errorText(error: unknown) {
    if (typeof error === "object" && error !== null) {
        if (
            "response" in error &&
            error.response &&
            typeof error.response === "object" &&
            "data" in error.response
        ) {
            const data = error.response.data;
            if (data && typeof data === "object" && "message" in data) {
                const message = data.message;
                return Array.isArray(message) ? message.join(" ") : String(message);
            }
        }
        if ("message" in error) return String(error.message);
    }
    return "Não foi possível concluir a solicitação. Tente novamente.";
}

function residenceError(error: unknown) {
    return errorText(error);
}

export function SettingsPage({ section, tab }: { section: Section; tab: PreferenceTab }) {
    const { user, loading: authLoading } = useAuth();
    const userId = user?.id;
    const [residenceState, setResidenceState] = useState<{
        userId: string;
        residence: Residence | null;
    } | null>(null);
    const [loadingResidence, setLoadingResidence] = useState(false);
    const [residenceErrorText, setResidenceErrorText] = useState("");
    const [members, setMembers] = useState<ResidenceMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [categories, setCategories] = useState<PantryCategory[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [sectionError, setSectionError] = useState("");
    const [notice, setNotice] = useState("");
    const [saving, setSaving] = useState(false);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [categoryDraft, setCategoryDraft] = useState("");
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [categoryError, setCategoryError] = useState("");
    const [notifications, setNotifications] = useState<NotificationsResponse>({
        items: [],
        unreadCount: 0,
        nextCursor: null,
    });
    const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("all");
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [notificationError, setNotificationError] = useState("");
    const [preferences, setPreferences] = useState<ResidencePreferences>(defaultPreferences);
    const [preferencesLoading, setPreferencesLoading] = useState(false);

    const residence =
        residenceState && residenceState.userId === userId ? residenceState.residence : null;
    const manager =
        residence?.membership?.role === "LIDER" || residence?.membership?.role === "ADMINISTRADOR";
    const canEditCategories = residence?.creationEditPolicy === "TODOS" || manager;
    const displayName = user?.nickname || user?.name || "Morador";

    useEffect(() => {
        if (authLoading) return;
        if (!userId) {
            return;
        }
        let active = true;
        queueMicrotask(() => {
            if (!active) return;
            setLoadingResidence(true);
            setResidenceErrorText("");
        });
        getResidences()
            .then((residences) => {
                if (!active) return;
                // The API/database enforce one active residence per user.
                setResidenceState({ userId, residence: residences[0] ?? null });
            })
            .catch((error: unknown) => {
                if (active) setResidenceErrorText(residenceError(error));
            })
            .finally(() => {
                if (active) setLoadingResidence(false);
            });
        return () => {
            active = false;
        };
    }, [authLoading, userId]);

    useEffect(() => {
        if (!residence) return;
        let active = true;
        if (section === "house" || section === "members" || section === "permissions") {
            queueMicrotask(() => {
                if (active) setMembersLoading(true);
            });
            getResidenceMembers(residence.id)
                .then((result) => active && setMembers(result))
                .catch((error: unknown) => active && setSectionError(errorText(error)))
                .finally(() => active && setMembersLoading(false));
        }
        if (section === "preferences" && tab === "categories") {
            queueMicrotask(() => {
                if (active) setCategoriesLoading(true);
            });
            getPantryCategories(residence.id)
                .then((result) => active && setCategories(result))
                .catch((error: unknown) => active && setSectionError(errorText(error)))
                .finally(() => active && setCategoriesLoading(false));
        }
        if (section === "preferences" && tab !== "categories") {
            queueMicrotask(() => active && setPreferencesLoading(true));
            getResidencePreferences(residence.id)
                .then((result) => active && setPreferences(result))
                .catch((error: unknown) => active && setSectionError(errorText(error)))
                .finally(() => active && setPreferencesLoading(false));
        }
        return () => {
            active = false;
        };
    }, [residence, section, tab]);

    const refreshNotifications = useCallback(
        async (quiet = false) => {
            if (!userId) return;
            if (!quiet) setNotificationsLoading(true);
            setNotificationError("");
            try {
                setNotifications(
                    await getNotifications(20, undefined, notificationFilter === "unread")
                );
            } catch (error: unknown) {
                setNotificationError(errorText(error));
            } finally {
                if (!quiet) setNotificationsLoading(false);
            }
        },
        [notificationFilter, userId]
    );

    useEffect(() => {
        if (section !== "notifications" || authLoading || !userId) return;
        let active = true;
        const load = async () => {
            if (!active || document.visibilityState !== "visible") return;
            await refreshNotifications(true);
        };
        queueMicrotask(() => {
            if (active) void refreshNotifications();
        });
        const unsubscribe = subscribeNotifications(
            (update) => {
                if (!active) return;
                setNotifications(update);
                setNotificationError("");
            },
            () => {
                if (active) {
                    setNotificationError(
                        "A atualização em tempo real está temporariamente indisponível. A atualização periódica continuará."
                    );
                }
            }
        );
        const timer = window.setInterval(() => void load(), 30_000);
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") void load();
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            active = false;
            window.clearInterval(timer);
            unsubscribe();
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [authLoading, refreshNotifications, section, userId]);

    const selectedSectionTitle = subnav.find((item) => item.id === section)?.label ?? "Casa";

    async function renameResidence(name: string) {
        if (!residence || !manager) return false;
        const trimmedName = name.trim();
        if (!trimmedName || trimmedName.length > 80) {
            setSectionError("O nome precisa ter entre 1 e 80 caracteres.");
            return false;
        }
        setSaving(true);
        setSectionError("");
        setNotice("");
        try {
            const updated = await updateResidenceName(residence.id, trimmedName);
            setResidenceState((current) => {
                if (!current || current.userId !== userId || !current.residence) return current;
                return { ...current, residence: { ...current.residence, ...updated } };
            });
            announceResidenceMembershipChanged();
            setNotice("Nome da casa atualizado.");
            return true;
        } catch (error: unknown) {
            setSectionError(errorText(error));
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function saveHouseName(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await renameResidence(String(form.get("name") ?? ""));
    }

    async function saveMemberAccess(member: ResidenceMember, allowed: boolean) {
        if (!residence || !manager) return;
        setSaving(true);
        setSectionError("");
        setNotice("");
        try {
            const updated = await updateResidenceMemberAccess(residence.id, member.id, allowed);
            setMembers((current) =>
                current.map((item) => (item.id === updated.id ? updated : item))
            );
            setNotice(`Permissão de ${updated.name} atualizada.`);
        } catch (error: unknown) {
            setSectionError(errorText(error));
            getResidenceMembers(residence.id)
                .then(setMembers)
                .catch(() => undefined);
        } finally {
            setSaving(false);
        }
    }

    async function removeMember(member: ResidenceMember) {
        if (!residence || !manager) return;
        if (!window.confirm(`Remover ${member.name} desta casa? O histórico será preservado.`))
            return;
        setSaving(true);
        setSectionError("");
        setNotice("");
        try {
            await removeResidenceMember(residence.id, member.id);
            setMembers((current) => current.filter((item) => item.id !== member.id));
            setNotice(`${member.name} foi removido da casa.`);
        } catch (error: unknown) {
            setSectionError(errorText(error));
        } finally {
            setSaving(false);
        }
    }

    async function savePreferences(update: ResidencePreferencesUpdate) {
        if (!residence) return;
        setSaving(true);
        setNotice("");
        setSectionError("");
        try {
            const saved = await updateResidencePreferences(residence.id, update);
            setPreferences(saved);
            setNotice("Preferências salvas.");
        } catch (error: unknown) {
            setPreferences((current) => ({ ...current }));
            setSectionError(errorText(error));
        } finally {
            setSaving(false);
        }
    }

    async function saveCategory(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!residence || !canEditCategories) return;
        const name = categoryDraft.trim();
        if (!name) return;
        setSaving(true);
        setCategoryError("");
        try {
            if (editingCategoryId) {
                const updated = await updatePantryCategory(residence.id, editingCategoryId, name);
                setCategories((current) =>
                    current.map((item) => (item.id === updated.id ? updated : item))
                );
            } else {
                const created = await createPantryCategory(residence.id, name);
                setCategories((current) => [...current, created]);
            }
            setCategoryDraft("");
            setEditingCategoryId(null);
            setNotice(editingCategoryId ? "Categoria atualizada." : "Categoria criada.");
        } catch (error: unknown) {
            setCategoryError(errorText(error));
        } finally {
            setSaving(false);
        }
    }

    async function removeCategory(category: PantryCategory) {
        if (!residence || !canEditCategories) return;
        if (!window.confirm(`Excluir a categoria “${category.name}”?`)) return;
        setSaving(true);
        setCategoryError("");
        try {
            await deletePantryCategory(residence.id, category.id);
            setCategories((current) => current.filter((item) => item.id !== category.id));
            setNotice("Categoria removida.");
        } catch (error: unknown) {
            setCategoryError(errorText(error));
        } finally {
            setSaving(false);
        }
    }

    async function loadMoreNotifications() {
        const cursor = notifications.nextCursor;
        if (!cursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const page = await getNotifications(20, cursor, notificationFilter === "unread");
            setNotifications((current) => ({
                unreadCount: page.unreadCount,
                nextCursor: page.nextCursor ?? null,
                items: [...current.items, ...page.items],
            }));
        } catch (error: unknown) {
            setNotificationError(errorText(error));
        } finally {
            setLoadingMore(false);
        }
    }

    async function markRead(notification: AppNotification) {
        if (notification.lida) return;
        try {
            await markNotificationRead(notification.id);
            setNotifications((current) => ({
                ...current,
                unreadCount: Math.max(0, current.unreadCount - 1),
                items: current.items.map((item) =>
                    item.id === notification.id ? { ...item, lida: true } : item
                ),
            }));
        } catch (error: unknown) {
            setNotificationError(errorText(error));
        }
    }

    const visibleNotifications = useMemo(
        () => notifications.items.filter((item) => notificationFilter === "all" || !item.lida),
        [notificationFilter, notifications.items]
    );

    function sectionHref(id: Section) {
        return id === "preferences"
            ? "/settings?section=preferences&tab=general"
            : `/settings?section=${id}`;
    }

    return (
        <div className="min-h-screen bg-[#f7f3f9] text-[#26232a] md:flex">
            <AppSidebar
                activeSection="settings"
                residenceName={residence?.name}
                noResidence={residence ? false : loadingResidence ? undefined : true}
            />
            <div className="min-w-0 flex-1">
                <AppPageHeader
                    greetingName={displayName}
                    residenceName={residence?.name}
                    subtitle={residence ? undefined : "Configurações da sua conta e da casa"}
                    settingsHref="/settings?section=house"
                />
                <main className="mx-auto max-w-[1500px] p-4 md:p-6 lg:p-7">
                    <div className="grid gap-5 lg:min-h-screen lg:grid-cols-[350px_minmax(0,1fr)] lg:gap-8">
                        <div className="lg:min-h-[calc(100vh-120px)]">
                            <nav
                                aria-label="Configurações do perfil"
                                className="rounded-xl border border-[#d9d0dc] bg-[#fffaff] p-3 md:p-4 lg:fixed lg:bottom-6 lg:left-[calc(220px+1.75rem)] lg:top-[88px] lg:z-30 lg:w-[350px] lg:overflow-y-auto lg:p-4"
                            >
                                <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
                                    {subnav.map(({ id, label, icon: Icon }) => (
                                        <li key={id}>
                                            <Link
                                                href={sectionHref(id)}
                                                aria-current={id === section ? "page" : undefined}
                                                className={`settings-nav flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f] ${
                                                    id === section
                                                        ? "settings-nav-active bg-[#e9defa] font-medium text-[#4b2b9b]"
                                                        : "font-medium text-[#514c56] hover:bg-[#f3edf7]"
                                                }`}
                                            >
                                                <Icon size={18} aria-hidden="true" />
                                                {label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </div>

                        <section className="min-w-0" aria-labelledby="settings-heading">
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h1
                                        id="settings-heading"
                                        className="text-2xl font-bold tracking-tight md:text-[28px]"
                                    >
                                        {section === "preferences"
                                            ? "Preferências"
                                            : selectedSectionTitle}
                                    </h1>
                                    {residence && (
                                        <p className="mt-1 text-sm text-[#77717c]">
                                            {residence.name}
                                        </p>
                                    )}
                                </div>
                                <span aria-hidden="true" className="text-[#8d8791]">
                                    ⚙
                                </span>
                            </div>

                            {section === "account" ? (
                                <ProfileSettingsContent />
                            ) : authLoading || loadingResidence ? (
                                <p role="status" className={`${cardClass} text-sm text-[#6f6873]`}>
                                    Carregando residência...
                                </p>
                            ) : residenceErrorText ? (
                                <div role="alert" className={`${cardClass} text-sm text-red-800`}>
                                    <p>{residenceErrorText}</p>
                                    <button
                                        type="button"
                                        onClick={() => window.location.reload()}
                                        className="mt-2 underline"
                                    >
                                        Tentar novamente
                                    </button>
                                </div>
                            ) : !residence ? (
                                <div className={cardClass}>
                                    <h2 className="font-semibold">
                                        Você ainda não pertence a uma casa
                                    </h2>
                                    <p className="mt-2 text-sm text-[#6f6873]">
                                        Entre em uma casa ou crie uma para acessar as configurações
                                        da residência.
                                    </p>
                                    <Link
                                        href="/rooms"
                                        className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#4e812f] px-4 text-sm font-semibold text-white"
                                    >
                                        Encontrar uma casa
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    {sectionError && (
                                        <p
                                            role="alert"
                                            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                                        >
                                            {sectionError}
                                        </p>
                                    )}
                                    {notice && (
                                        <p
                                            role="status"
                                            className="settings-notice-enter mb-4 rounded-lg border border-green-200 bg-[#edf5eb] p-3 text-sm text-[#285a2e]"
                                        >
                                            {notice}
                                        </p>
                                    )}
                                    {section === "house" && (
                                        <div className="grid gap-4">
                                            <section className={cardClass}>
                                                <h2 className="text-base font-semibold">
                                                    Informações da casa
                                                </h2>
                                                <form
                                                    onSubmit={(event) => void saveHouseName(event)}
                                                    className="mt-4 grid gap-4"
                                                >
                                                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_100px] sm:items-end">
                                                        <label className="grid gap-1.5 text-xs font-bold">
                                                            Nome da casa
                                                            <input
                                                                className={inputClass}
                                                                name="name"
                                                                defaultValue={residence.name}
                                                                maxLength={80}
                                                                required
                                                                disabled={!manager || saving}
                                                            />
                                                        </label>
                                                        {manager && (
                                                            <button
                                                                type="submit"
                                                                disabled={saving}
                                                                className="min-h-10 rounded-lg border border-[#4e812f] px-4 text-sm font-semibold text-[#4e812f] disabled:opacity-50"
                                                            >
                                                                {saving ? "Salvando…" : "Editar"}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid gap-1 text-xs">
                                                        <span className="font-bold">
                                                            Data de criação
                                                        </span>
                                                        <span className="inline-flex items-center gap-2 text-[#625c66]">
                                                            <CalendarDays
                                                                size={17}
                                                                aria-hidden="true"
                                                            />
                                                            {residence.createdAt
                                                                ? new Date(
                                                                      `${residence.createdAt}T00:00:00`
                                                                  ).toLocaleDateString("pt-BR", {
                                                                      day: "2-digit",
                                                                      month: "short",
                                                                      year: "numeric",
                                                                  })
                                                                : "Data indisponível"}
                                                        </span>
                                                    </div>
                                                </form>
                                            </section>
                                            <SettingsMembersTable
                                                mode="house"
                                                members={members}
                                                loading={membersLoading}
                                                manager={Boolean(manager)}
                                                currentUserId={userId}
                                                busy={saving}
                                                onAccessChange={(member, allowed) =>
                                                    void saveMemberAccess(member, allowed)
                                                }
                                                onRemove={(member) => void removeMember(member)}
                                            />
                                        </div>
                                    )}

                                    {section === "members" && (
                                        <SettingsMembersTable
                                            mode="members"
                                            members={members}
                                            loading={membersLoading}
                                            manager={Boolean(manager)}
                                            currentUserId={userId}
                                            busy={saving}
                                            onAccessChange={(member, allowed) =>
                                                void saveMemberAccess(member, allowed)
                                            }
                                            onRemove={(member) => void removeMember(member)}
                                        />
                                    )}

                                    {section === "permissions" && (
                                        <SettingsMembersTable
                                            mode="permissions"
                                            members={members}
                                            loading={membersLoading}
                                            manager={Boolean(manager)}
                                            currentUserId={userId}
                                            busy={saving}
                                            onAccessChange={(member, allowed) =>
                                                void saveMemberAccess(member, allowed)
                                            }
                                            onRemove={(member) => void removeMember(member)}
                                        />
                                    )}

                                    {section === "notifications" && (
                                        <section className={cardClass}>
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <h2 className="font-semibold">
                                                        Suas notificações
                                                    </h2>
                                                    <p className="mt-1 text-sm text-[#77717c]">
                                                        {notifications.unreadCount} não lida(s)
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void refreshNotifications()}
                                                    disabled={notificationsLoading}
                                                    className="min-h-9 rounded-lg border border-[#d9d0dc] bg-white px-3 text-sm font-medium"
                                                >
                                                    {notificationsLoading
                                                        ? "Atualizando…"
                                                        : "Atualizar"}
                                                </button>
                                            </div>
                                            <div
                                                role="tablist"
                                                aria-label="Filtro de notificações"
                                                className="mt-4 flex gap-5 border-b border-[#ded6e2]"
                                            >
                                                {(
                                                    [
                                                        { id: "all", label: "Visão Geral" },
                                                        { id: "unread", label: "Não Lidas" },
                                                    ] as const
                                                ).map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={
                                                            notificationFilter === item.id
                                                        }
                                                        onClick={() =>
                                                            setNotificationFilter(item.id)
                                                        }
                                                        className={`border-b-2 px-0.5 pb-2 text-sm font-semibold ${notificationFilter === item.id ? "border-[#4e812f] text-[#514c56]" : "border-transparent text-[#77717c]"}`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {notificationError && (
                                                <p
                                                    role="alert"
                                                    className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
                                                >
                                                    {notificationError}
                                                </p>
                                            )}
                                            {notificationsLoading ? (
                                                <p
                                                    role="status"
                                                    className="py-8 text-center text-sm text-[#77717c]"
                                                >
                                                    Carregando notificações…
                                                </p>
                                            ) : visibleNotifications.length === 0 ? (
                                                <p className="py-8 text-center text-sm text-[#77717c]">
                                                    {notificationFilter === "unread"
                                                        ? "Não há notificações não lidas."
                                                        : "Você ainda não tem notificações."}
                                                </p>
                                            ) : (
                                                <ul className="mt-2 divide-y divide-[#e5dfe8]">
                                                    {visibleNotifications.map((item) => (
                                                        <li
                                                            key={item.id}
                                                            className={`relative py-4 pl-5 ${item.lida ? "" : "before:absolute before:left-0 before:top-6 before:size-1.5 before:rounded-full before:bg-[#4e812f]"}`}
                                                        >
                                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                                <h3
                                                                    className={`text-sm ${item.lida ? "font-medium" : "font-bold"}`}
                                                                >
                                                                    {item.titulo}
                                                                </h3>
                                                                <time
                                                                    className="shrink-0 text-xs text-[#77717c]"
                                                                    dateTime={item.criadoEm}
                                                                >
                                                                    {new Date(
                                                                        item.criadoEm
                                                                    ).toLocaleString("pt-BR", {
                                                                        dateStyle: "short",
                                                                        timeStyle: "short",
                                                                    })}
                                                                </time>
                                                            </div>
                                                            {item.mensagem && (
                                                                <p className="mt-1 text-sm text-[#625c66]">
                                                                    {item.mensagem}
                                                                </p>
                                                            )}
                                                            {!item.lida && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        void markRead(item)
                                                                    }
                                                                    className="mt-2 text-xs font-medium text-[#315f35] underline underline-offset-2"
                                                                >
                                                                    Marcar como lida
                                                                </button>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {notificationFilter === "all" &&
                                                notifications.nextCursor && (
                                                    <button
                                                        type="button"
                                                        disabled={loadingMore}
                                                        onClick={() => void loadMoreNotifications()}
                                                        className="mt-4 min-h-10 w-full rounded-lg border border-[#d9d0dc] bg-white text-sm font-semibold disabled:opacity-50"
                                                    >
                                                        {loadingMore
                                                            ? "Carregando…"
                                                            : "Carregar mais"}
                                                    </button>
                                                )}
                                        </section>
                                    )}

                                    {section === "preferences" && (
                                        <>
                                            <nav
                                                aria-label="Abas de preferências"
                                                className="mb-5 flex gap-1 overflow-x-auto"
                                            >
                                                {preferenceTabs.map((preference) =>
                                                    preference.enabled ? (
                                                        <Link
                                                            key={preference.id}
                                                            href={`/settings?section=preferences&tab=${preference.id}`}
                                                            aria-current={
                                                                tab === preference.id
                                                                    ? "page"
                                                                    : undefined
                                                            }
                                                            className={`shrink-0 rounded-md border-b-2 px-4 py-2 text-sm transition-all duration-200 ease-in-out ${tab === preference.id ? "settings-tab-active border-[#4e812f] bg-white font-bold text-[#4e812f] shadow-sm" : "border-transparent font-medium text-[#625c66] hover:bg-white/60 hover:text-[#315f35]"}`}
                                                        >
                                                            {preference.label}
                                                        </Link>
                                                    ) : (
                                                        <span
                                                            key={preference.id}
                                                            aria-disabled="true"
                                                            className="shrink-0 rounded-md border-b-2 border-transparent px-4 py-2 text-sm font-medium text-[#aaa4ad]"
                                                        >
                                                            {preference.label}
                                                            <span className="sr-only">
                                                                , indisponível nesta fase
                                                            </span>
                                                        </span>
                                                    )
                                                )}
                                            </nav>
                                            {tab === "categories" ? (
                                                <section className="overflow-hidden rounded-xl border border-[#d9d0dc] bg-[#fffaff]">
                                                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2dbe5] px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="grid size-8 place-items-center rounded-lg bg-[#edf5e9] text-[#4e812f]">
                                                                <Tags
                                                                    size={19}
                                                                    aria-hidden="true"
                                                                />
                                                            </span>
                                                            <div>
                                                                <h2 className="text-base font-semibold">
                                                                    Categorias de despensa
                                                                </h2>
                                                                <p className="mt-0.5 text-xs text-[#77717c]">
                                                                    Organize os itens da despensa da
                                                                    casa em categorias
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {canEditCategories && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setCategoryDraft("");
                                                                    setEditingCategoryId(null);
                                                                    setCategoryError("");
                                                                    setCategoryModalOpen(true);
                                                                }}
                                                                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#4e812f] px-4 text-sm font-semibold text-white hover:bg-[#3d6c25]"
                                                            >
                                                                <Plus
                                                                    size={18}
                                                                    aria-hidden="true"
                                                                />
                                                                Adicionar categoria
                                                            </button>
                                                        )}
                                                    </header>
                                                    {categoriesLoading ? (
                                                        <p
                                                            role="status"
                                                            className="px-5 py-8 text-sm text-[#77717c]"
                                                        >
                                                            Carregando categorias…
                                                        </p>
                                                    ) : categories.length === 0 ? (
                                                        <p className="px-5 py-8 text-sm text-[#77717c]">
                                                            Nenhuma categoria cadastrada.
                                                        </p>
                                                    ) : (
                                                        <>
                                                            <div className="hidden grid-cols-[minmax(220px,1fr)_minmax(150px,1fr)_minmax(140px,.9fr)_100px] border-b border-[#e2dbe5] bg-[#fcf9fd] px-5 py-3 text-xs text-[#8d8791] md:grid">
                                                                <span>Nome</span>
                                                                <span>Ícone</span>
                                                                <span>Itens</span>
                                                                <span className="text-right">
                                                                    Ações
                                                                </span>
                                                            </div>
                                                            <ul className="divide-y divide-[#e2dbe5]">
                                                                {categories.map((category) => {
                                                                    const key = category.name
                                                                        .normalize("NFD")
                                                                        .replace(
                                                                            /[\u0300-\u036f]/g,
                                                                            ""
                                                                        )
                                                                        .toLocaleLowerCase("pt-BR");
                                                                    const Icon =
                                                                        categoryIcons[key] ??
                                                                        Package;
                                                                    return (
                                                                        <li
                                                                            key={category.id}
                                                                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-3 md:grid-cols-[minmax(220px,1fr)_minmax(150px,1fr)_minmax(140px,.9fr)_100px]"
                                                                        >
                                                                            <span className="truncate text-sm font-medium text-[#29252d]">
                                                                                {category.name}
                                                                            </span>
                                                                            <span className="hidden md:block">
                                                                                <Icon
                                                                                    size={20}
                                                                                    strokeWidth={
                                                                                        2.5
                                                                                    }
                                                                                    aria-label={`Ícone de ${category.name}`}
                                                                                />
                                                                            </span>
                                                                            <span className="text-xs text-[#77717c]">
                                                                                {category.itemCount ??
                                                                                    0}{" "}
                                                                                {(category.itemCount ??
                                                                                    0) === 1
                                                                                    ? "item"
                                                                                    : "itens"}
                                                                            </span>
                                                                            <span className="col-span-2 flex justify-end gap-1 md:col-span-1">
                                                                                {canEditCategories && (
                                                                                    <>
                                                                                        <button
                                                                                            type="button"
                                                                                            aria-label={`Renomear ${category.name}`}
                                                                                            onClick={() => {
                                                                                                setCategoryDraft(
                                                                                                    category.name
                                                                                                );
                                                                                                setEditingCategoryId(
                                                                                                    category.id
                                                                                                );
                                                                                                setCategoryError(
                                                                                                    ""
                                                                                                );
                                                                                                setCategoryModalOpen(
                                                                                                    true
                                                                                                );
                                                                                            }}
                                                                                            className="grid size-8 place-items-center rounded border border-[#bbb3c0] text-[#625c66] hover:bg-[#f1edf3]"
                                                                                        >
                                                                                            <Pencil
                                                                                                size={
                                                                                                    15
                                                                                                }
                                                                                            />
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            aria-label={`Excluir ${category.name}`}
                                                                                            onClick={() =>
                                                                                                void removeCategory(
                                                                                                    category
                                                                                                )
                                                                                            }
                                                                                            className="grid size-8 place-items-center rounded border border-[#d55353] text-[#d23d3d] hover:bg-red-50"
                                                                                        >
                                                                                            <Trash2
                                                                                                size={
                                                                                                    15
                                                                                                }
                                                                                            />
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        </>
                                                    )}
                                                </section>
                                            ) : (
                                                <PreferencesPanel
                                                    tab={tab}
                                                    value={preferences}
                                                    residenceName={residence.name}
                                                    residenceCreatedAt={residence.createdAt}
                                                    canRenameResidence={Boolean(manager)}
                                                    onRenameResidence={renameResidence}
                                                    loading={preferencesLoading}
                                                    saving={saving}
                                                    onSave={(update) =>
                                                        void savePreferences(update)
                                                    }
                                                />
                                            )}
                                            <PantryCategoryModal
                                                categoryModalOpen={categoryModalOpen}
                                                categories={categories}
                                                canManageCategories={canEditCategories}
                                                busy={saving}
                                                categoryDraft={categoryDraft}
                                                setCategoryDraft={setCategoryDraft}
                                                editingCategoryId={editingCategoryId}
                                                categoryError={categoryError}
                                                onClose={() => setCategoryModalOpen(false)}
                                                onSave={(event) => void saveCategory(event)}
                                                onEdit={(category) => {
                                                    setEditingCategoryId(category.id);
                                                    setCategoryDraft(category.name);
                                                }}
                                                onRemove={(category) =>
                                                    void removeCategory(category)
                                                }
                                                onCancelEdit={() => {
                                                    setEditingCategoryId(null);
                                                    setCategoryDraft("");
                                                }}
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
