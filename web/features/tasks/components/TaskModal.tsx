import type { FormEvent } from "react";
import { Bell, Check, X } from "lucide-react";
import type { TaskMember, TaskPeriodicity, TaskAssignmentType } from "../api/tasks.api";
import { inputClass, periodicityLabels, type TaskFormState } from "../lib/tasks.utils";
export function TaskModal({
    form,
    members,
    editing,
    saving,
    error,
    hasResidence,
    onChange,
    onClose,
    onSubmit,
}: {
    form: TaskFormState;
    members: TaskMember[];
    editing: boolean;
    saving: boolean;
    error: string;
    hasResidence: boolean;
    onChange: <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-4"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-modal-title"
                className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-[530px] overflow-y-auto rounded-2xl bg-[#fffaff] p-5 shadow-2xl md:p-7"
            >
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h2 id="task-modal-title" className="text-xl font-semibold">
                            {editing ? "Editar tarefa" : "Nova tarefa"}
                        </h2>
                        <p className="mt-1 text-[11px] text-[#625c66]">
                            Cadastre uma tarefa para a casa e defina quem é o responsável
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Fechar"
                        onClick={onClose}
                        className="rounded-lg p-1 text-[#77717c] hover:bg-[#f2edf3]"
                    >
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="grid gap-3">
                    {!hasResidence && (
                        <p
                            role="status"
                            className="rounded-lg border border-[#d8e7d1] bg-[#f0f6ed] p-2.5 text-xs text-[#456b35]"
                        >
                            Modo pessoal: esta tarefa ficará salva apenas neste navegador. A
                            sincronização com uma casa poderá ser adicionada depois.
                        </p>
                    )}
                    <label className="grid gap-1.5 text-[11px] font-medium">
                        Título *
                        <input
                            autoFocus
                            required
                            maxLength={150}
                            value={form.title}
                            onChange={(event) => onChange("title", event.target.value)}
                            className={inputClass}
                        />
                    </label>
                    <label className="grid gap-1.5 text-[11px] font-medium">
                        Descrição
                        <textarea
                            maxLength={2000}
                            rows={2}
                            value={form.description}
                            onChange={(event) => onChange("description", event.target.value)}
                            className={`${inputClass} resize-y`}
                        />
                    </label>
                    <label className="grid gap-1.5 text-[11px] font-medium">
                        Tags
                        <input
                            value={form.tags}
                            onChange={(event) => onChange("tags", event.target.value)}
                            placeholder="Ex.: Limpeza, Banheiro (separadas por vírgula)"
                            className={inputClass}
                        />
                    </label>
                    {hasResidence && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1.5 text-[11px] font-medium">
                                Atribuição
                                <select
                                    value={form.assignmentType}
                                    onChange={(event) =>
                                        onChange(
                                            "assignmentType",
                                            event.target.value as TaskAssignmentType
                                        )
                                    }
                                    className={inputClass}
                                >
                                    <option value="FIXA">Responsável fixo</option>
                                    <option value="RODIZIO">Rodízio entre moradores</option>
                                </select>
                            </label>
                            <label className="grid gap-1.5 text-[11px] font-medium">
                                Cor da tarefa
                                <input
                                    type="color"
                                    value={form.color}
                                    onChange={(event) => onChange("color", event.target.value)}
                                    className="h-10 w-full rounded-lg border border-[#d3cbd7] bg-white p-1"
                                />
                            </label>
                        </div>
                    )}
                    {form.assignmentType === "FIXA" ? (
                        <label className="grid gap-1.5 text-[11px] font-medium">
                            Responsável
                            <select
                                value={form.assigneeId}
                                onChange={(event) => onChange("assigneeId", event.target.value)}
                                className={inputClass}
                            >
                                <option value="">Sem responsável</option>
                                {members.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : (
                        <label className="grid gap-1.5 text-[11px] font-medium">
                            Ordem do rodízio (selecione ao menos dois moradores)
                            <select
                                multiple
                                value={form.assigneeIds}
                                onChange={(event) =>
                                    onChange(
                                        "assigneeIds",
                                        Array.from(
                                            event.currentTarget.selectedOptions,
                                            (option) => option.value
                                        )
                                    )
                                }
                                className={`${inputClass} min-h-24`}
                            >
                                {members.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-[11px] font-medium">
                            Data e horário
                            <input
                                required
                                type="datetime-local"
                                value={form.dueAt}
                                onChange={(event) => onChange("dueAt", event.target.value)}
                                className={inputClass}
                            />
                        </label>
                        <label className="grid gap-1.5 text-[11px] font-medium">
                            Repetição
                            <select
                                value={form.repeats ? form.periodicity : "NUNCA"}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    onChange("repeats", value !== "NUNCA");
                                    if (value !== "NUNCA")
                                        onChange("periodicity", value as TaskPeriodicity);
                                }}
                                className={inputClass}
                            >
                                <option value="NUNCA">Não repetir</option>
                                {(
                                    [
                                        "DIARIA",
                                        "SEMANAL",
                                        "QUINZENAL",
                                        "MENSAL",
                                    ] as TaskPeriodicity[]
                                ).map((value) => (
                                    <option key={value} value={value}>
                                        {periodicityLabels[value]}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label className="flex items-center gap-3 rounded-lg bg-[#e9e8e8] px-3 py-2.5 text-[11px]">
                        <Bell size={16} className="shrink-0" />
                        <span className="flex-1">
                            <strong className="block">Lembrete</strong>
                            <span className="text-[10px] text-[#625c66]">
                                Notificar os responsáveis antes do prazo
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            checked={form.hasReminder}
                            onChange={(event) => onChange("hasReminder", event.target.checked)}
                            className="size-4 accent-[#4e812f]"
                        />
                    </label>
                    {form.hasReminder && (
                        <label className="grid gap-1.5 text-[11px] font-medium">
                            Avisar com antecedência
                            <select
                                value={form.reminderMinutesBefore}
                                onChange={(event) =>
                                    onChange("reminderMinutesBefore", event.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="10">10 minutos antes</option>
                                <option value="30">30 minutos antes</option>
                                <option value="60">1 hora antes</option>
                                <option value="1440">1 dia antes</option>
                                <option value="10080">1 semana antes</option>
                            </select>
                        </label>
                    )}
                    {error && (
                        <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
                            {error}
                        </p>
                    )}
                    <div className="mt-1 flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-[#cfc7d3] px-4 py-2 text-xs"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#4e812f] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                            <Check size={14} />
                            {saving ? "Salvando…" : editing ? "Salvar alterações" : "Salvar tarefa"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
