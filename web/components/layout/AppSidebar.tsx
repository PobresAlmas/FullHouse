import Link from "next/link";
import { CheckSquare, DollarSign, House, Package, PawPrint, Settings } from "lucide-react";

export type AppSection = "home" | "tasks" | "finance" | "pantry" | "pets" | "settings";

const sections: { id: AppSection; label: string; href: string; icon: typeof House }[] = [
    { id: "home", label: "Início", href: "/", icon: House },
    { id: "tasks", label: "Tarefas", href: "/tasks", icon: CheckSquare },
    { id: "finance", label: "Financeiro", href: "/finance", icon: DollarSign },
    { id: "pantry", label: "Despensa", href: "/pantry", icon: Package },
    { id: "pets", label: "Pets", href: "/pets", icon: PawPrint },
    { id: "settings", label: "Configurações", href: "/settings", icon: Settings },
];
const implementedSections: AppSection[] = ["finance", "pantry", "pets"];

export function AppSidebar({
    activeSection,
    residenceName,
}: {
    activeSection: AppSection;
    residenceName?: string | null;
}) {
    return (
        <aside className="flex shrink-0 flex-col border-b border-[#d9d0dc] bg-[#f8f4fa] px-4 py-5 md:min-h-screen md:w-[220px] md:border-b-0 md:border-r">
            <div className="mb-7 flex items-center gap-3 rounded-lg px-1">
                <span className="grid size-10 place-items-center rounded-xl bg-[#234a1b] text-white">
                    <House size={24} strokeWidth={2.4} />
                </span>
                <span>
                    <span className="block font-bold leading-tight">FullHouse</span>
                    <span className="block text-xs text-[#625c66]">
                        {residenceName ? `Casa ${residenceName}` : "Nenhuma casa associada"}
                    </span>
                </span>
            </div>

            <nav aria-label="Navegação principal" className="grid gap-1">
                {sections.map(({ id, label, href, icon: Icon }) => {
                    const active = id === activeSection;
                    const implemented = implementedSections.includes(id);
                    const className = `flex h-12 items-center gap-3 rounded-xl px-3 text-sm ${
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
        </aside>
    );
}
