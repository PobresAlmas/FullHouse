"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
    CheckSquare,
    DollarSign,
    House,
    Package,
    PawPrint,
    ShoppingBasket,
    BedDouble,
    Settings,
    MessageCircle,
    ScrollText,
    CalendarDays,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    getResidences,
    RESIDENCE_MEMBERSHIP_CHANGED_EVENT,
} from "@/features/residences/api/residences.api";

export type AppSection =
    | "home"
    | "tasks"
    | "finance"
    | "pantry"
    | "shopping-list"
    | "pets"
    | "settings"
    | "profile"
    | "chat"
    | "rules"
    | "rooms"
    | "meetings";

const sections: { id: AppSection; label: string; href: string; icon: typeof House }[] = [
    { id: "home", label: "Home", href: "/", icon: House },
    { id: "tasks", label: "Tarefas", href: "/tasks", icon: CheckSquare },
    { id: "finance", label: "Financeiro", href: "/finance", icon: DollarSign },
    { id: "pantry", label: "Despensa", href: "/pantry", icon: Package },
    {
        id: "shopping-list",
        label: "Lista de compras",
        href: "/shopping-list",
        icon: ShoppingBasket,
    },
    { id: "pets", label: "Pets", href: "/pets", icon: PawPrint },
    { id: "chat", label: "Chat da casa", href: "/chat", icon: MessageCircle },
    { id: "rules", label: "Regras", href: "/rules", icon: ScrollText },
    { id: "meetings", label: "Reuniões", href: "/meetings", icon: CalendarDays },
    { id: "rooms", label: "Quartos", href: "/rooms", icon: BedDouble },
    { id: "settings", label: "Configurações", href: "/settings", icon: Settings },
];
const implementedSections: AppSection[] = [
    "home",
    "tasks",
    "finance",
    "pantry",
    "shopping-list",
    "pets",
    "chat",
    "rules",
    "meetings",
    "rooms",
    "settings",
];

export function AppSidebar({
    activeSection,
    residenceName,
    noResidence,
}: {
    activeSection: AppSection;
    residenceName?: string | null;
    noResidence?: boolean;
}) {
    const { user, loading: authLoading } = useAuth();
    const userId = user?.id;
    const [membership, setMembership] = useState<{
        userId: string;
        hasResidence: boolean;
        residenceName?: string;
    } | null>(null);
    const [membershipError, setMembershipError] = useState<{
        userId: string;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (noResidence !== undefined || authLoading || !userId) return;
        let active = true;
        let latestRequest = 0;
        const refreshMembership = async () => {
            const request = ++latestRequest;
            try {
                const residences = await getResidences();
                if (!active || request !== latestRequest) return;
                setMembership({
                    userId,
                    hasResidence: residences.length > 0,
                    residenceName: residences[0]?.name ?? undefined,
                });
                setMembershipError(null);
            } catch (cause: unknown) {
                if (!active || request !== latestRequest) return;
                const message =
                    typeof cause === "object" && cause && "message" in cause
                        ? String(cause.message)
                        : "Não foi possível verificar sua residência.";
                setMembershipError({ userId, message });
            }
        };
        void refreshMembership();
        window.addEventListener(RESIDENCE_MEMBERSHIP_CHANGED_EVENT, refreshMembership);
        return () => {
            active = false;
            window.removeEventListener(RESIDENCE_MEMBERSHIP_CHANGED_EVENT, refreshMembership);
        };
    }, [authLoading, noResidence, userId]);

    const hasNoResidence =
        noResidence ??
        (authLoading ||
            !userId ||
            membership?.userId !== userId ||
            !membership.hasResidence ||
            membershipError?.userId === userId);
    const displayedResidenceName =
        residenceName ??
        (membership && membership.userId === userId ? membership.residenceName : undefined);

    return (
        <aside className="flex shrink-0 flex-col border-b border-[#d9d0dc] bg-[#f8f4fa] px-3 py-3 md:sticky md:top-0 md:h-screen md:min-h-0 md:w-[220px] md:self-start md:overflow-y-auto md:border-b-0 md:border-r md:px-4 md:py-5">
            <div className="mb-3 flex items-center gap-3 rounded-lg px-1 md:mb-7">
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#234a1b]">
                    <Image
                        src="/logo.png"
                        alt="Logo FullHouse"
                        width={40}
                        height={40}
                        className="size-full object-contain"
                    />
                </span>
                <span>
                    <span className="block font-bold leading-tight">FullHouse</span>
                    <span className="block text-xs text-[#625c66]">
                        {displayedResidenceName
                            ? displayedResidenceName.toLocaleLowerCase("pt-BR").startsWith("casa ")
                                ? displayedResidenceName
                                : `Casa ${displayedResidenceName}`
                            : "Nenhuma casa associada"}
                    </span>
                </span>
            </div>

            <nav aria-label="Navegação principal" className="grid grid-cols-4 gap-1 md:grid-cols-1">
                {(hasNoResidence
                    ? sections.filter(
                          ({ id }) => id === "home" || id === "rooms" || id === "settings"
                      )
                    : sections.filter(({ id }) => id !== "rooms")
                ).map(({ id, label, href, icon: Icon }) => {
                    const active = id === activeSection;
                    const implemented = implementedSections.includes(id);
                    const className = `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-center text-[10px] leading-tight md:h-12 md:min-h-0 md:flex-row md:justify-start md:gap-3 md:px-3 md:text-left md:text-sm ${
                        implemented
                            ? active
                                ? "bg-white font-semibold text-[#4e812f]"
                                : "text-[#514c56] transition hover:bg-white/70"
                            : "cursor-not-allowed text-[#9a949e]"
                    }`;
                    return implemented ? (
                        <Link
                            key={id}
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={className}
                        >
                            <Icon size={17} />
                            <span>{label}</span>
                        </Link>
                    ) : (
                        <span key={id} aria-disabled="true" className={className}>
                            <Icon size={17} />
                            <span>{label}</span>
                        </span>
                    );
                })}
            </nav>
            {membershipError && membershipError.userId === userId && (
                <p role="alert" className="mt-2 px-2 text-xs text-red-700">
                    {membershipError.message}
                </p>
            )}
        </aside>
    );
}
