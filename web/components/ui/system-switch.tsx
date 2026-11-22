"use client";

import type { ButtonHTMLAttributes } from "react";

type SystemSwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onChange"> & {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: string;
};

export function SystemSwitch({
    checked,
    onCheckedChange,
    label,
    disabled = false,
    className = "",
    ...buttonProps
}: SystemSwitchProps) {
    return (
        <button
            {...buttonProps}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label ?? buttonProps["aria-label"]}
            disabled={disabled}
            data-state={checked ? "checked" : "unchecked"}
            onClick={() => onCheckedChange(!checked)}
            className={`relative inline-flex h-[28px] w-[52px] shrink-0 cursor-pointer items-center rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#4e812f]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 ${checked ? "bg-[#4e812f]" : "bg-[#c9c3cc]"} ${className}`}
        >
            <span
                aria-hidden="true"
                data-slot="system-switch-thumb"
                className="absolute left-[3px] top-[3px] block size-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
                style={{ transform: checked ? "translateX(24px)" : "translateX(0)" }}
            />
        </button>
    );
}
