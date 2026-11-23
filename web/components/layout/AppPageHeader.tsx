import type { ReactNode } from "react";
import Link from "next/link";
import { House } from "lucide-react";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SettingsLink } from "./SettingsLink";
import { useContext, useEffect, useSyncExternalStore } from "react";
import { AppShellContext } from "./AppShellContext";
import { AppHeaderControlContext } from "./AppHeaderControlContext";

function getGreeting() {
    const hour = new Date().getHours();
    return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

function subscribeToGreeting(onChange: () => void) {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const timeout = setTimeout(onChange, nextHour.getTime() - now.getTime());
    return () => clearTimeout(timeout);
}

export function AppPageHeader({
    greetingName,
    residenceName,
    subtitle,
    residenceControl,
    profile,
    global = false,
    profileName,
    profilePhoto,
    profileBackgroundColor,
}: {
    greetingName: string;
    residenceName?: string | null;
    subtitle?: ReactNode;
    residenceControl?: ReactNode;
    profile?: ReactNode;
    settingsHref?: string;
    global?: boolean;
    profileName?: string;
    profilePhoto?: string;
    profileBackgroundColor?: string;
}) {
    const insideShell = useContext(AppShellContext);
    const headerControlContext = useContext(AppHeaderControlContext);
    const firstName = greetingName.trim().split(/\s+/)[0] || "Morador";
    const greeting = useSyncExternalStore(subscribeToGreeting, getGreeting, () => "Olá");

    useEffect(() => {
        if (!insideShell || global || !headerControlContext) return;
        headerControlContext.registerControl(residenceControl ?? null);
        headerControlContext.registerPageState({ residenceName, subtitle });
    }, [global, headerControlContext, insideShell, residenceControl, residenceName, subtitle]);

    useEffect(() => {
        if (!insideShell || global || !headerControlContext) return;
        return () => {
            headerControlContext.registerControl(null);
            headerControlContext.registerPageState(null);
        };
    }, [global, headerControlContext, insideShell]);

    if (insideShell && !global) return null;

    return (
        <>
            <header
                className={`sticky top-0 z-40 flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#d9d0dc] bg-[#fffaff] px-5 py-3 md:fixed md:left-[220px] md:right-0 md:h-[72px] md:min-h-[72px] md:flex-nowrap md:px-7 ${residenceControl ? "md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" : ""}`}
            >
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold leading-tight">
                        {greeting}, {firstName}
                    </h1>
                    {residenceName ? (
                        <p className="truncate text-xs text-[#77717c]" title={residenceName}>
                            <House
                                size={12}
                                className="mr-1 inline-block align-text-bottom"
                                aria-hidden="true"
                            />
                            {residenceName}
                        </p>
                    ) : (
                        subtitle && <div className="text-xs text-[#96909a]">{subtitle}</div>
                    )}
                </div>
                {residenceControl && (
                    <div className="order-last grid shrink-0 basis-full place-items-center md:order-none">
                        {residenceControl}
                    </div>
                )}
                <div className="flex items-center gap-3 text-[#514c56] md:justify-self-end">
                    <NotificationBell />
                    <SettingsLink />
                    {profile ?? (
                        <Link
                            href="/settings?section=account"
                            aria-label="Abrir configurações da conta"
                            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition hover:ring-2 hover:ring-[#4e812f]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e812f]"
                        >
                            <UserAvatar
                                name={profileName || greetingName}
                                photo={profilePhoto}
                                backgroundColor={profileBackgroundColor}
                                shape="circle"
                            />
                        </Link>
                    )}
                </div>
            </header>
            <div aria-hidden="true" className="hidden h-[72px] shrink-0 md:block" />
        </>
    );
}
