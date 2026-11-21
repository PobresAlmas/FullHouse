"use client";
import { SystemSelect } from "@/components/ui/system-select";

import type { Residence } from "@/features/residences/api/residences.api";

export function ResidenceSelector({
    residences,
    value,
    onChange,
}: {
    residences: Residence[];
    value: string;
    onChange: (id: string) => void;
}) {
    if (residences.length <= 1) return null;
    return (
        <label className="flex items-center gap-2 text-sm font-medium">
            Residência
            <SystemSelect
                aria-label="Residência"
                className="rounded-md border border-[#d9d0dc] bg-white px-3 py-2"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                {residences.map((residence) => (
                    <option key={residence.id} value={residence.id}>
                        {residence.name}
                    </option>
                ))}
            </SystemSelect>
        </label>
    );
}
