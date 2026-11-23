"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookOpenCheck, Pencil, Plus, ScrollText } from "lucide-react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    createHouseRule,
    getHouseRules,
    updateHouseRule,
    type HouseRule,
} from "@/features/house-collaboration/api/house-rules.api";
import { ResidenceSelector } from "@/features/house-collaboration/components/ResidenceSelector";
import { getResidences, type Residence } from "@/features/residences/api/residences.api";

export default function HouseRulesPage() {
    const { user } = useAuth();
    const [residences, setResidences] = useState<Residence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [rules, setRules] = useState<HouseRule[]>([]);
    const [editing, setEditing] = useState<HouseRule | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");
    const [validationSubmitted, setValidationSubmitted] = useState(false);
    const [busy, setBusy] = useState(false);
    const activeResidence = residences.find((item) => item.id === residenceId);
    const canManageRules =
        activeResidence?.membership?.role === "LIDER" ||
        activeResidence?.membership?.role === "ADMINISTRADOR";
    const loadRules = useCallback(async (id: string) => {
        try {
            setRules(await getHouseRules(id));
            setError("");
        } catch {
            setError("Não foi possível carregar as regras desta residência.");
        }
    }, []);
    useEffect(() => {
        let active = true;
        void getResidences()
            .then((items) => {
                if (active) {
                    setResidences(items);
                    setResidenceId(items[0]?.id ?? "");
                    if (items[0]) void loadRules(items[0].id);
                }
            })
            .catch(() => setError("Não foi possível carregar suas residências."));
        return () => {
            active = false;
        };
    }, [loadRules]);

    function changeResidence(id: string) {
        setResidenceId(id);
        void loadRules(id);
    }

    function startEdit(rule: HouseRule) {
        if (!canManageRules) return;
        setEditing(rule);
        setTitle(rule.title);
        setDescription(rule.description);
        setFormError("");
        setValidationSubmitted(false);
    }
    function clearForm() {
        setEditing(null);
        setTitle("");
        setDescription("");
        setFormError("");
        setValidationSubmitted(false);
    }
    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!canManageRules) return;
        setValidationSubmitted(true);
        setFormError("");
        if (!title.trim() || !description.trim()) {
            setFormError("Preencha o título e a descrição da regra.");
            return;
        }
        setBusy(true);
        try {
            const payload = { title: title.trim(), description: description.trim() };
            if (editing) await updateHouseRule(residenceId, editing.id, payload);
            else await createHouseRule(residenceId, payload);
            clearForm();
            await loadRules(residenceId);
        } catch {
            setFormError("Não foi possível salvar a regra. Verifique os dados e tente novamente.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#f6f3f7] md:flex">
            <AppSidebar
                activeSection="rules"
                residenceName={residences.find((item) => item.id === residenceId)?.name}
            />
            <main className="min-w-0 flex-1 px-4 py-5 md:px-8">
                <AppPageHeader
                    greetingName={user?.name ?? "Morador"}
                    residenceName={residences.find((item) => item.id === residenceId)?.name}
                    subtitle="Regras da residência"
                    residenceControl={
                        <ResidenceSelector
                            residences={residences}
                            value={residenceId}
                            onChange={changeResidence}
                        />
                    }
                />
                <div className="my-6">
                    <h1 className="text-2xl font-bold tracking-tight text-[#29252d]">
                        Regras da casa
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Combinados simples para uma convivência melhor.
                    </p>
                </div>
                {error && (
                    <p role="alert" className="my-3 text-sm text-red-700">
                        {error}
                    </p>
                )}
                {canManageRules ? (
                    <section className="my-5 overflow-hidden rounded-2xl border border-[#e4dce6] bg-white shadow-sm">
                        <div className="flex items-center gap-3 border-b border-[#eee8ef] bg-[#fbf9fc] px-5 py-4 sm:px-6">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-[#edf5e9] text-[#416b30]">
                                {editing ? <Pencil size={19} /> : <Plus size={20} />}
                            </span>
                            <div>
                                <h2 className="font-semibold text-[#29252d]">
                                    {editing ? "Editar regra" : "Adicionar um combinado"}
                                </h2>
                                <p className="text-sm text-slate-600">
                                    {editing
                                        ? "Atualize o combinado da residência."
                                        : "Deixe claro o que funciona para todos."}
                                </p>
                            </div>
                        </div>
                        <form onSubmit={submit} noValidate className="grid gap-4 p-5 sm:p-6">
                            {formError && (
                                <p
                                    role="alert"
                                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                                >
                                    {formError}
                                </p>
                            )}
                            <label className="grid gap-1 text-sm font-medium">
                                <span>
                                    Título <span className="text-red-600">*</span>
                                </span>
                                <input
                                    aria-label="Título"
                                    required
                                    aria-invalid={validationSubmitted && !title.trim()}
                                    maxLength={150}
                                    placeholder="Ex.: Manter a cozinha organizada"
                                    className={`rounded-lg border bg-white px-3 py-2.5 outline-none transition focus:border-[#5b8d42] focus:ring-2 focus:ring-[#5b8d42]/15 ${validationSubmitted && !title.trim() ? "border-red-500" : "border-[#d9d1dc]"}`}
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                />
                            </label>
                            <label className="grid gap-1 text-sm font-medium">
                                <span>
                                    Descrição <span className="text-red-600">*</span>
                                </span>
                                <textarea
                                    aria-label="Descrição"
                                    required
                                    aria-invalid={validationSubmitted && !description.trim()}
                                    maxLength={5000}
                                    rows={4}
                                    placeholder="Descreva o combinado de forma breve e objetiva."
                                    className={`resize-y rounded-lg border bg-white px-3 py-2.5 outline-none transition focus:border-[#5b8d42] focus:ring-2 focus:ring-[#5b8d42]/15 ${validationSubmitted && !description.trim() ? "border-red-500" : "border-[#d9d1dc]"}`}
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                />
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="submit"
                                    disabled={busy || !residenceId}
                                    className="bg-[#416b30] px-4 text-white hover:bg-[#345927]"
                                >
                                    {editing ? "Salvar alterações" : "Adicionar regra"}
                                </Button>
                                {editing && (
                                    <Button
                                        type="button"
                                        onClick={clearForm}
                                        variant="outline"
                                        className="px-4"
                                    >
                                        Cancelar edição
                                    </Button>
                                )}
                            </div>
                        </form>
                    </section>
                ) : (
                    <p className="my-5 rounded-xl border border-[#e4dce6] bg-white px-4 py-3 text-sm text-slate-600">
                        Somente líderes e administradores podem adicionar ou editar regras.
                    </p>
                )}
                <section aria-label="Mural de regras" className="mt-7 grid gap-3">
                    {rules.length > 0 && (
                        <div className="mb-1 flex items-center gap-2">
                            <ScrollText size={18} className="text-[#5b8d42]" />
                            <h2 className="font-semibold text-[#29252d]">Combinados atuais</h2>
                            <span className="rounded-full bg-[#eee9f0] px-2 py-0.5 text-xs font-medium text-slate-600">
                                {rules.length}
                            </span>
                        </div>
                    )}
                    {rules.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-[#d9d1dc] bg-white px-5 py-8 text-center">
                            <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-[#edf5e9] text-[#5b8d42]">
                                <BookOpenCheck size={21} />
                            </span>
                            <p className="font-medium text-[#29252d]">
                                Nenhum combinado por enquanto
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                                {canManageRules
                                    ? "Adicione uma regra para alinhar a rotina da casa."
                                    : "As regras da residência aparecerão aqui."}
                            </p>
                        </div>
                    )}
                    {rules.map((rule) => (
                        <article
                            key={rule.id}
                            className="rounded-2xl border border-[#e4dce6] bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
                        >
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f3f7f0] text-[#5b8d42]">
                                    <BookOpenCheck size={18} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <h3 className="text-base font-semibold text-[#29252d]">
                                            {rule.title}
                                        </h3>
                                        {canManageRules && (
                                            <Button
                                                type="button"
                                                onClick={() => startEdit(rule)}
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5"
                                            >
                                                <Pencil size={14} />
                                                Editar
                                            </Button>
                                        )}
                                    </div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#514b56]">
                                        {rule.description}
                                    </p>
                                    <p className="mt-4 border-t border-[#f0ebf1] pt-3 text-xs text-slate-500">
                                        Criada por {rule.createdBy} em{" "}
                                        {new Date(rule.createdAt).toLocaleDateString("pt-BR")}
                                        {rule.updatedBy && ` · Editada por ${rule.updatedBy}`}
                                    </p>
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            </main>
        </div>
    );
}
