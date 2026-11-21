"use client";
import { SystemSelect } from "@/components/ui/system-select";
import { SystemSwitch } from "@/components/ui/system-switch";

import { useEffect, useState } from "react";
import { Bell, CalendarDays, House, Laptop, Moon, PawPrint, Sun, WalletCards } from "lucide-react";
import type { ResidencePreferences, ResidencePreferencesUpdate } from "../api/settings.api";
import { useTheme } from "@/providers/ThemeProvider";
import type { ThemePreference } from "@/providers/ThemeProvider";

type PreferenceTab = "general" | "categories" | "pantry" | "finance" | "pets";
const card = "rounded-xl border border-[#dfd6e3] bg-[#fffaff] p-5";
const header = "-mx-5 -mt-5 mb-3 flex items-center gap-3 border-b border-[#e5dce8] px-5 py-3";
const field =
    "min-h-10 w-full max-w-sm rounded-lg border border-[#d8d1da] bg-white px-3 text-sm outline-none focus:border-[#4e812f]";

function formatCreationDate(date?: string) {
    if (!date) return "Data indisponível";
    const parts = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).formatToParts(new Date(`${date.slice(0, 10)}T12:00:00`));
    const day = parts.find((part) => part.type === "day")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const year = parts.find((part) => part.type === "year")?.value;
    return `${day} ${month} ${year}`;
}

export function PreferencesPanel({
    tab,
    value,
    residenceName,
    residenceCreatedAt,
    canRenameResidence,
    onRenameResidence,
    loading,
    saving,
    onSave,
}: {
    tab: Exclude<PreferenceTab, "categories">;
    value: ResidencePreferences;
    residenceName: string;
    residenceCreatedAt?: string;
    canRenameResidence: boolean;
    onRenameResidence: (name: string) => Promise<boolean>;
    loading: boolean;
    saving: boolean;
    onSave: (update: ResidencePreferencesUpdate) => void;
}) {
    const [draft, setDraft] = useState(value);
    const [editingResidenceName, setEditingResidenceName] = useState(false);
    const [residenceNameDraft, setResidenceNameDraft] = useState(residenceName);
    const { theme, setTheme } = useTheme();
    // These drafts must follow server updates while retaining local edits between them.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setDraft(value), [value]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setResidenceNameDraft(residenceName), [residenceName]);
    if (loading)
        return (
            <section className={card} role="status">
                Carregando preferências…
            </section>
        );

    if (tab === "general") {
        const options = [
            ["newTasks", "Novas tarefas", "Avisos de tarefas atribuídas ou criadas na casa."],
            ["newExpenses", "Despesas adicionadas", "Avisos sobre despesas compartilhadas."],
            ["upcomingDueDates", "Vencimentos próximos", "Lembretes de prazos próximos."],
            [
                "residentInvitations",
                "Convites de moradores",
                "Atualizações de convites para a casa.",
            ],
            [
                "houseUpdates",
                "Atualizações da casa",
                "Mudanças gerais nas informações da residência.",
            ],
        ] as const;
        return (
            <div className="grid gap-3 md:grid-cols-2">
                <section className={`${card} min-h-[234px]`}>
                    <header className={header}>
                        <House size={19} className="text-[#4e812f]" />
                        <h2 className="text-base font-bold">Informações da casa</h2>
                    </header>
                    <form
                        className="grid gap-4"
                        onSubmit={async (event) => {
                            event.preventDefault();
                            if (await onRenameResidence(residenceNameDraft))
                                setEditingResidenceName(false);
                        }}
                    >
                        <div>
                            <label
                                htmlFor="preferences-residence-name"
                                className="mb-1 block text-sm font-semibold"
                            >
                                Nome da casa
                            </label>
                            <div className="grid grid-cols-[minmax(0,1fr)_116px] gap-3">
                                <input
                                    id="preferences-residence-name"
                                    name="name"
                                    maxLength={80}
                                    readOnly={!editingResidenceName}
                                    value={residenceNameDraft}
                                    onChange={(event) => setResidenceNameDraft(event.target.value)}
                                    className="min-h-12 min-w-0 rounded-lg border border-[#d8d1da] bg-transparent px-4 text-sm outline-none focus:border-[#4e812f] disabled:opacity-60"
                                />
                                {!editingResidenceName ? (
                                    <button
                                        type="button"
                                        disabled={!canRenameResidence || saving}
                                        onClick={() => setEditingResidenceName(true)}
                                        className="min-h-12 cursor-pointer rounded-lg border border-[#4e812f] px-4 text-sm font-semibold text-[#4e812f] transition-colors hover:bg-[#edf5e9] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Editar
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => {
                                                setResidenceNameDraft(residenceName);
                                                setEditingResidenceName(false);
                                            }}
                                            className="min-h-12 cursor-pointer rounded-lg border border-[#d8d1da] px-3 text-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving || !residenceNameDraft.trim()}
                                            className="min-h-12 cursor-pointer rounded-lg border border-[#4e812f] px-3 text-sm font-semibold text-[#4e812f] disabled:opacity-50"
                                        >
                                            {saving ? "Salvando…" : "Salvar"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <span className="block text-sm font-semibold text-[#625c66]">
                                Data de criação
                            </span>
                            <p className="mt-1 flex items-center gap-3 text-sm text-[#625c66]">
                                <CalendarDays size={22} aria-hidden="true" />
                                {formatCreationDate(residenceCreatedAt)}
                            </p>
                        </div>
                    </form>
                </section>
                <section className={`${card} min-h-[234px]`}>
                    <header className={header}>
                        <span
                            className="grid size-6 grid-cols-2 gap-0.5 text-[#4e812f]"
                            aria-hidden="true"
                        >
                            <i className="bg-current" />
                            <i className="bg-current" />
                            <i className="bg-current" />
                            <i className="bg-current" />
                        </span>
                        <h2 className="text-base font-bold">Aparência</h2>
                    </header>
                    <p className="mb-2 text-sm">Tema</p>
                    <div
                        className="flex flex-wrap gap-3"
                        role="group"
                        aria-label="Tema da aplicação"
                    >
                        {(
                            [
                                ["light", "Claro", Sun],
                                ["dark", "Escuro", Moon],
                                ["system", "Sistema", Laptop],
                            ] as const
                        ).map(([value, label, Icon]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={theme === value}
                                onClick={() => setTheme(value as ThemePreference)}
                                className={`inline-flex min-h-[54px] cursor-pointer items-center gap-3 rounded-lg border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e812f] ${theme === value ? "border-[#4e812f] text-[#4e812f]" : "border-[#d8d1da] text-[#77717c] hover:border-[#8d8791]"}`}
                            >
                                <Icon
                                    size={23}
                                    fill={value === "dark" ? "currentColor" : "none"}
                                    aria-hidden="true"
                                />
                                {label}
                            </button>
                        ))}
                    </div>
                </section>
                <section className={`${card} md:col-span-2`}>
                    <header className={header}>
                        <Bell size={19} className="text-[#4e812f]" />
                        <div>
                            <h2 className="text-sm font-semibold">Notificações</h2>
                            <p className="text-[11px] text-[#77717c]">
                                Escolha quais notificações deseja receber
                            </p>
                        </div>
                    </header>
                    <ul className="divide-y divide-[#e8e0eb]">
                        {options.map(([key, label, description]) => (
                            <li
                                key={key}
                                className="flex items-center justify-between gap-4 py-2.5"
                            >
                                <span>
                                    <span className="block text-sm font-medium">{label}</span>
                                    <span className="mt-0.5 block text-xs text-[#77717c]">
                                        {description}
                                    </span>
                                </span>
                                <SystemSwitch
                                    label={label}
                                    disabled={saving}
                                    checked={draft.notifications[key]}
                                    onCheckedChange={(checked) => {
                                        const next = {
                                            ...draft,
                                            notifications: {
                                                ...draft.notifications,
                                                [key]: checked,
                                            },
                                        };
                                        setDraft(next);
                                        onSave({ notifications: next.notifications });
                                    }}
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        );
    }

    if (tab === "pets") {
        const options = [
            ["vaccineReminders", "Vacinas"],
            ["dewormingReminders", "Vermífugo"],
            ["appointmentReminders", "Consultas veterinárias"],
        ] as const;
        return (
            <section className={card}>
                <header className={header}>
                    <PawPrint size={19} className="text-[#4e812f]" />
                    <div>
                        <h2 className="text-sm font-semibold">Lembretes de cuidados</h2>
                        <p className="text-[11px] text-[#77717c]">
                            Preferências para os pets da casa
                        </p>
                    </div>
                </header>
                <ul className="mt-3 divide-y divide-[#e8e0eb]">
                    {options.map(([key, label]) => (
                        <li key={key} className="flex items-center justify-between py-3">
                            <span className="text-sm">
                                Lembretes de {label.toLocaleLowerCase("pt-BR")}
                            </span>
                            <SystemSwitch
                                label={`Lembretes de ${label}`}
                                disabled={saving}
                                checked={draft.pets[key]}
                                onCheckedChange={(checked) => {
                                    const next = {
                                        ...draft,
                                        pets: { ...draft.pets, [key]: checked },
                                    };
                                    setDraft(next);
                                    onSave({ pets: next.pets });
                                }}
                            />
                        </li>
                    ))}
                </ul>
            </section>
        );
    }

    const pantry = tab === "pantry";
    const updateDraft = (days?: number, checked?: boolean) => {
        const next = pantry
            ? {
                  ...draft,
                  pantry: {
                      ...draft.pantry,
                      ...(days !== undefined ? { expirationNoticeDays: days } : {}),
                      ...(checked !== undefined ? { showExpired: checked } : {}),
                  },
              }
            : {
                  ...draft,
                  finance: {
                      ...draft.finance,
                      ...(days !== undefined ? { dueNoticeDays: days } : {}),
                      ...(checked !== undefined ? { showOverdue: checked } : {}),
                  },
              };
        setDraft(next);
        onSave(pantry ? { pantry: next.pantry } : { finance: next.finance });
    };
    return (
        <section className={card}>
            <header className={header}>
                {pantry ? (
                    <CalendarDays size={19} className="text-[#4e812f]" />
                ) : (
                    <WalletCards size={19} className="text-[#4e812f]" />
                )}
                <div>
                    <h2 className="text-sm font-semibold">
                        {pantry ? "Configurações da despensa" : "Configurações financeiras"}
                    </h2>
                    <p className="text-[11px] text-[#77717c]">
                        {pantry
                            ? "Personalize como a despensa é gerenciada"
                            : "Personalize como os avisos financeiros são exibidos"}
                    </p>
                </div>
            </header>
            <div className="grid gap-5 md:grid-cols-2">
                <div>
                    <p className="text-sm font-semibold">
                        {pantry ? "Validade dos itens" : "Vencimento das despesas"}
                    </p>
                    <label className="mt-2 grid gap-1.5 text-sm">
                        Avisar com quantos dias de antecedência?
                        <SystemSelect
                            className={`${field} mt-1`}
                            disabled={saving}
                            value={
                                pantry
                                    ? draft.pantry.expirationNoticeDays
                                    : draft.finance.dueNoticeDays
                            }
                            onChange={(event) => updateDraft(Number(event.target.value))}
                        >
                            {[1, 3, 5, 7, 14].map((days) => (
                                <option key={days} value={days}>
                                    {days} {days === 1 ? "dia" : "dias"}
                                </option>
                            ))}
                        </SystemSelect>
                    </label>
                </div>
                <label className="flex items-start gap-3 pt-1 text-sm font-semibold">
                    <SystemSwitch
                        label={pantry ? "Mostrar itens vencidos" : "Mostrar despesas atrasadas"}
                        disabled={saving}
                        checked={pantry ? draft.pantry.showExpired : draft.finance.showOverdue}
                        onCheckedChange={(checked) => updateDraft(undefined, checked)}
                    />
                    <span>
                        {pantry ? "Mostrar itens vencidos" : "Mostrar despesas atrasadas"}
                        <span className="mt-1 block text-xs font-normal text-[#77717c]">
                            {pantry
                                ? "Exibir itens que já passaram da validade"
                                : "Exibir despesas que já passaram do vencimento"}
                        </span>
                    </span>
                </label>
            </div>
        </section>
    );
}
