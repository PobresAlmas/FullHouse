import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function TabButton({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`rounded-lg px-4 py-2 text-xs transition ${active ? "bg-white font-semibold text-[#356c43] shadow-[inset_0_-2px_0_#4e812f]" : "text-[#716b76] hover:bg-white/70"}`}
        >
            {label}
            <span className="ml-1 text-[10px] opacity-70">{count}</span>
        </button>
    );
}

export function SelectFilter({
    label,
    value,
    onChange,
    children,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <label className="relative">
            <span className="sr-only">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-[#d9d1de] bg-[#fffaff] px-3 pr-8 text-sm text-[#625c66] outline-none focus:border-[#4e812f]"
            >
                {children}
            </select>
            <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#77717c]"
                size={15}
            />
        </label>
    );
}
