import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export default function SummaryCard({
    icon,
    iconClass,
    label,
    value,
    valueClass,
    detail,
    detailIcon,
}: {
    icon: ReactNode;
    iconClass: string;
    label: string;
    value: string;
    valueClass: string;
    detail: string;
    detailIcon?: ReactNode;
}) {
    return (
        <div className="min-h-[126px] rounded-xl border border-[#d7ceda] p-3">
            <div className="mb-2 flex items-center gap-2.5">
                <span className={`grid size-7 place-items-center rounded-lg ${iconClass}`}>
                    {icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                <ChevronRight size={17} className="shrink-0 text-[#55505a]" />
            </div>
            <p className={`text-[21px] font-bold ${valueClass}`}>{value}</p>
            <p className="mt-1 flex items-center gap-2 text-[11px] leading-tight text-[#4a454e]">
                {detailIcon}
                {detail}
            </p>
        </div>
    );
}
