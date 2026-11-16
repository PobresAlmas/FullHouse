import type { ReactNode } from "react";
import Link from "next/link";
import { House, Settings } from "lucide-react";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

export function AppPageHeader({
    greetingName,
    residenceName,
    subtitle,
    residenceControl,
    profile,
    settingsHref,
}: {
    greetingName: string;
    residenceName?: string | null;
    subtitle?: ReactNode;
    residenceControl?: ReactNode;
    profile?: ReactNode;
    settingsHref?: string;
}) {
    const firstName = greetingName.trim().split(/\s+/)[0] || "Morador";

    return (
        <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#d9d0dc] bg-[#fffaff] px-5 py-3 md:px-7">
            <div>
                <h1 className="text-xl font-bold leading-tight">Bom dia, {firstName}</h1>
                {residenceName ? (
                    <p className="flex items-center gap-1 text-xs text-[#77717c]">
                        <House size={12} />
                        {residenceName}
                    </p>
                ) : (
                    subtitle && <div className="text-xs text-[#96909a]">{subtitle}</div>
                )}
            </div>
            {residenceControl}
            <div className="flex items-center gap-3 text-[#514c56]">
                <NotificationBell />
                {settingsHref ? (
                    <Link
                        href={settingsHref}
                        aria-label="Configurações"
                        className="grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"
                    >
                        <Settings size={19} />
                    </Link>
                ) : (
                    <span
                        aria-label="Configurações"
                        className="grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"
                    >
                        <Settings size={19} />
                    </span>
                )}
                {profile}
            </div>
        </header>
    );
}
