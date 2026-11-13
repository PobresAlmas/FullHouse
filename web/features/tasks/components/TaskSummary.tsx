export function SummaryCard({
    label,
    value,
    detail,
    valueClass = "",
    progress,
}: {
    label: string;
    value: string;
    detail: string;
    valueClass?: string;
    progress?: number;
}) {
    return (
        <div className="min-h-[76px] rounded-lg border border-[#d7ceda] px-3 py-2.5">
            <p className="text-[11px] font-medium">{label}</p>
            <p className={`mt-1 text-lg font-bold leading-tight ${valueClass}`}>{value}</p>
            {progress !== undefined ? (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e2e3e5]">
                    <div
                        className="h-full rounded-full bg-[#4e812f]"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                </div>
            ) : (
                <p className="mt-1 text-[10px] text-[#77717c]">{detail}</p>
            )}
        </div>
    );
}
export function TagFilter({
    label,
    active,
    onClick,
    color = "",
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    color?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition ${active ? "border-[#b9dda8] bg-[#b9dda8] text-[#263922]" : "border-[#ded7e1] bg-white hover:bg-[#f6f2f7]"}`}
        >
            <span
                className={`size-2 rounded-full ${color || (active ? "bg-[#4e812f]" : "bg-[#b2adb5]")}`}
            />
            {label}
        </button>
    );
}
