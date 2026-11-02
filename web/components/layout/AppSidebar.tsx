import Link from "next/link";
import {
    CheckSquare,
    DollarSign,
    House,
    Package,
    PawPrint,
    ShoppingBasket,
    Settings,
    UserRound,
} from "lucide-react";

export type AppSection =
    "home" | "tasks" | "finance" | "pantry" | "shopping-list" | "pets" | "settings" | "profile";

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
    { id: "settings", label: "Configurações", href: "/settings", icon: Settings },
];
const implementedSections: AppSection[] = [
    "home",
    "tasks",
    "finance",
    "pantry",
    "shopping-list",
    "pets",
];

export function AppSidebar({
    activeSection,
    residenceName,
    noResidence = false,
    onProfileSelect,
}: {
    activeSection: AppSection;
    residenceName?: string | null;
    noResidence?: boolean;
    onProfileSelect?: () => void;
}) {
    return (
        <aside className="flex shrink-0 flex-col border-b border-[#d9d0dc] bg-[#f8f4fa] px-3 py-3 md:min-h-screen md:w-[220px] md:border-b-0 md:border-r md:px-4 md:py-5">
            <div className="mb-3 flex items-center gap-3 rounded-lg px-1 md:mb-7">
                <span className="grid size-10 place-items-center rounded-xl bg-[#234a1b] text-white">
                    <House size={24} strokeWidth={2.4} />
                </span>
                <span>
                    <span className="block font-bold leading-tight">FullHouse</span>
                    <span className="block text-xs text-[#625c66]">
                        {residenceName
                            ? residenceName.toLocaleLowerCase("pt-BR").startsWith("casa ")
                                ? residenceName
                                : `Casa ${residenceName}`
                            : "Nenhuma casa associada"}
                    </span>
                </span>
            </div>

            <nav aria-label="Navegação principal" className="grid grid-cols-4 gap-1 md:grid-cols-1">
                {(noResidence ? sections.filter(({ id }) => id === "home") : sections).map(
                    ({ id, label, href, icon: Icon }) => {
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
                    }
                )}
                {noResidence && (
                    <button
                        type="button"
                        onClick={onProfileSelect}
                        aria-current={activeSection === "profile" ? "page" : undefined}
                        className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-center text-[10px] leading-tight transition hover:bg-white/70 md:h-12 md:min-h-0 md:flex-row md:justify-start md:gap-3 md:px-3 md:text-left md:text-sm ${activeSection === "profile" ? "bg-white font-semibold text-[#4e812f]" : "text-[#514c56]"}`}
                    >
                        <UserRound size={17} />
                        <span>Perfil</span>
                    </button>
                )}
            </nav>
        </aside>
    );
}
