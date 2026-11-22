import Link from "next/link";
import { Settings } from "lucide-react";

export function SettingsLink({ className = "" }: { className?: string }) {
    return (
        <Link
            href="/settings"
            aria-label="Configurações"
            className={`grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[#d8d1da] bg-white transition-colors hover:bg-[#f5f2f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e812f] ${className}`}
        >
            <Settings size={19} />
        </Link>
    );
}
