import type { ReactNode } from "react";

export function FormField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="grid gap-1.5 text-xs font-medium text-[#514c56]">
            {label}
            {children}
        </label>
    );
}
