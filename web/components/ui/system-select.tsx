"use client";

import {
    Children,
    Fragment,
    isValidElement,
    useEffect,
    useMemo,
    useRef,
    useState,
    useId,
} from "react";
import type { ChangeEvent, HTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string; disabled: boolean };
type Group = { label?: string; options: Option[] };
type SystemSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
    onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
};

function readGroups(children: ReactNode): Group[] {
    const groups: Group[] = [];
    const current: Group = { options: [] };
    const visit = (nodes: ReactNode, target: Group, inheritedDisabled = false) => {
        Children.forEach(nodes, (child) => {
            if (!isValidElement(child)) return;
            if (child.type === Fragment) {
                visit(
                    (child.props as { children?: ReactNode }).children,
                    target,
                    inheritedDisabled
                );
                return;
            }
            if (child.type === "optgroup") {
                const props = child.props as {
                    label?: string;
                    children?: ReactNode;
                    disabled?: boolean;
                };
                const group: Group = { label: props.label, options: [] };
                visit(props.children, group, inheritedDisabled || Boolean(props.disabled));
                groups.push(group);
                return;
            }
            if (child.type !== "option") return;
            const props = child.props as {
                value?: string | number;
                children?: ReactNode;
                disabled?: boolean;
            };
            const label = Children.toArray(props.children)
                .map((part) =>
                    typeof part === "string" || typeof part === "number" ? String(part) : ""
                )
                .join("");
            target.options.push({
                value: String(props.value ?? label),
                label,
                disabled: inheritedDisabled || Boolean(props.disabled),
            });
        });
    };
    visit(children, current);
    if (current.options.length) groups.unshift(current);
    return groups;
}

export function SystemSelect({
    children,
    value,
    defaultValue,
    onChange,
    className = "",
    disabled = false,
    multiple = false,
    name,
    id,
    required,
    autoFocus,
    ...triggerProps
}: SystemSelectProps) {
    const groups = useMemo(() => readGroups(children), [children]);
    const options = useMemo(() => groups.flatMap((group) => group.options), [groups]);
    const controlled = value !== undefined;
    const initial =
        value ??
        defaultValue ??
        (multiple ? [] : (options.find((option) => !option.disabled)?.value ?? ""));
    const [localSelectedValues, setLocalSelectedValues] = useState<string[]>(
        Array.isArray(initial) ? initial.map(String) : initial === "" ? [] : [String(initial)]
    );
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const listboxId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const hiddenRef = useRef<HTMLSelectElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const selectedValues = useMemo(
        () =>
            controlled
                ? Array.isArray(value)
                    ? value.map(String)
                    : value === ""
                      ? []
                      : [String(value)]
                : localSelectedValues,
        [controlled, value, localSelectedValues]
    );

    useEffect(() => {
        if (!open) return;
        const firstSelectedIndex = options.findIndex((option) =>
            selectedValues.includes(option.value)
        );
        optionRefs.current[firstSelectedIndex >= 0 ? firstSelectedIndex : 0]?.focus();
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open, options, selectedValues]);

    const selectedLabels = options
        .filter((option) => selectedValues.includes(option.value))
        .map((option) => option.label);
    const emptyOptionLabel = options.find((option) => option.value === "")?.label;
    const displayValue = multiple
        ? selectedLabels.length
            ? selectedLabels.join(", ")
            : (emptyOptionLabel ?? "Selecione")
        : (selectedLabels[0] ?? emptyOptionLabel ?? "Selecione");

    function commit(nextValues: string[]) {
        const select = hiddenRef.current;
        if (!select) return;
        if (multiple) {
            for (const option of Array.from(select.options))
                option.selected = nextValues.includes(option.value);
        } else {
            select.value = nextValues[0] ?? "";
        }
        if (!controlled) setLocalSelectedValues(nextValues);
        const event = {
            target: select,
            currentTarget: select,
            nativeEvent: new Event("change", { bubbles: true }),
            bubbles: true,
            cancelable: false,
            defaultPrevented: false,
            eventPhase: 2,
            isTrusted: false,
            timeStamp: 0,
            type: "change",
            preventDefault() {},
            stopPropagation() {},
            isDefaultPrevented: () => false,
            isPropagationStopped: () => false,
            persist() {},
        } as unknown as ChangeEvent<HTMLSelectElement>;
        onChange?.(event);
        if (!multiple) {
            setOpen(false);
            triggerRef.current?.focus();
        }
    }

    function onOptionKeyDown(index: number, event: React.KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
            return;
        }
        if (!options.length) return;
        const forward = event.key === "ArrowDown";
        const backward = event.key === "ArrowUp";
        const first = event.key === "Home";
        const last = event.key === "End";
        if (!forward && !backward && !first && !last) return;

        let nextIndex = -1;
        if (first) nextIndex = options.findIndex((option) => !option.disabled);
        else if (last) {
            nextIndex = options.findLastIndex((option) => !option.disabled);
        } else {
            const direction = backward ? -1 : 1;
            let candidateIndex = index;
            for (let step = 0; step < options.length; step += 1) {
                candidateIndex = (candidateIndex + direction + options.length) % options.length;
                if (!options[candidateIndex]?.disabled) {
                    nextIndex = candidateIndex;
                    break;
                }
            }
        }
        if (nextIndex < 0) return;
        event.preventDefault();
        optionRefs.current[nextIndex]?.focus();
    }

    let optionIndex = -1;
    return (
        <div ref={rootRef} className="relative min-w-0">
            <select
                ref={hiddenRef}
                name={name}
                value={multiple ? selectedValues : (selectedValues[0] ?? "")}
                multiple={multiple}
                required={required}
                disabled={disabled}
                aria-hidden="true"
                tabIndex={-1}
                onChange={() => undefined}
                onInvalid={() => {
                    triggerRef.current?.focus();
                    setOpen(true);
                }}
                className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
            >
                {children}
            </select>
            <button
                {...(triggerProps as HTMLAttributes<HTMLButtonElement>)}
                ref={triggerRef}
                id={id}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-controls={listboxId}
                aria-expanded={open}
                aria-required={required || undefined}
                disabled={disabled}
                autoFocus={autoFocus}
                onClick={() => setOpen((current) => !current)}
                onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && !open) {
                        event.preventDefault();
                        setOpen(true);
                    }
                    triggerProps.onKeyDown?.(event as never);
                }}
                className={`flex min-h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-[#d8d1da] bg-white py-2 pl-3 pr-3 text-left text-sm text-[#29252d] outline-none transition-colors hover:border-[#a99eae] focus-visible:border-[#4e812f] focus-visible:ring-2 focus-visible:ring-[#4e812f]/15 disabled:cursor-not-allowed disabled:bg-[#f7f4f8] disabled:text-[#77717c] ${className}`}
            >
                <span className="min-w-0 truncate">{displayValue}</span>
                <ChevronDown
                    aria-hidden="true"
                    size={17}
                    className={`ml-3 shrink-0 text-[#514d56] transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open && (
                <div
                    role="listbox"
                    id={listboxId}
                    aria-multiselectable={multiple || undefined}
                    className="system-select-listbox absolute inset-x-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-y-auto rounded-lg border border-[#ded6e2] bg-white p-1 shadow-lg shadow-[#34243f]/10"
                >
                    {groups.map((group, groupIndex) => (
                        <div key={`${group.label ?? "options"}-${groupIndex}`}>
                            {group.label && (
                                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[#8d8791]">
                                    {group.label}
                                </p>
                            )}
                            {group.options.map((option) => {
                                const index = ++optionIndex;
                                const isSelected = selectedValues.includes(option.value);
                                return (
                                    <button
                                        key={`${option.value}-${index}`}
                                        ref={(node) => {
                                            optionRefs.current[index] = node;
                                        }}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        disabled={option.disabled}
                                        onKeyDown={(event) => onOptionKeyDown(index, event)}
                                        onClick={() => {
                                            const next = multiple
                                                ? isSelected
                                                    ? selectedValues.filter(
                                                          (item) => item !== option.value
                                                      )
                                                    : [...selectedValues, option.value]
                                                : [option.value];
                                            commit(next);
                                        }}
                                        className={`system-select-option flex min-h-9 w-full items-center justify-between rounded-md px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4e812f]/40 disabled:cursor-not-allowed disabled:opacity-45 ${isSelected ? "bg-[#edf5e9] font-medium text-[#3f762c]" : "text-[#29252d] hover:bg-[#f4f0f6]"}`}
                                    >
                                        {option.label}
                                        {isSelected && (
                                            <Check
                                                aria-hidden="true"
                                                size={16}
                                                className="ml-3 shrink-0 text-[#4e812f]"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
