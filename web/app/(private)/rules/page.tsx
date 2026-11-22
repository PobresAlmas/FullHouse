"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
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
    const [busy, setBusy] = useState(false);
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
        setEditing(rule);
        setTitle(rule.title);
        setDescription(rule.description);
        setError("");
    }
    function clearForm() {
        setEditing(null);
        setTitle("");
        setDescription("");
    }
    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!title.trim() || !description.trim()) {
            setError("Preencha o título e a descrição da regra.");
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
            setError("Não foi possível salvar a regra. Verifique os dados e tente novamente.");
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
                <h1 className="my-5 text-2xl font-bold">Regras da casa</h1>
                {error && (
                    <p role="alert" className="my-3 text-sm text-red-700">
                        {error}
                    </p>
                )}
                <section className="my-5 rounded-xl border bg-white p-5">
                    <h2 className="mb-4 text-lg font-semibold">
                        {editing ? "Editar regra" : "Nova regra"}
                    </h2>
                    <form onSubmit={submit} className="grid gap-3">
                        <label className="grid gap-1 text-sm font-medium">
                            Título
                            <input
                                aria-label="Título"
                                maxLength={150}
                                className="rounded-md border px-3 py-2"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                            />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                            Descrição
                            <textarea
                                aria-label="Descrição"
                                maxLength={5000}
                                rows={3}
                                className="rounded-md border px-3 py-2"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                            />
                        </label>
                        <div className="flex gap-2">
                            <button
                                disabled={busy || !residenceId}
                                className="rounded-md bg-[#234a1b] px-4 py-2 font-semibold text-white"
                            >
                                {editing ? "Salvar alterações" : "Adicionar regra"}
                            </button>
                            {editing && (
                                <button
                                    type="button"
                                    onClick={clearForm}
                                    className="rounded-md border px-4 py-2"
                                >
                                    Cancelar edição
                                </button>
                            )}
                        </div>
                    </form>
                </section>
                <section aria-label="Mural de regras" className="grid gap-3">
                    {rules.length === 0 && (
                        <p className="rounded-xl border bg-white p-5 text-slate-600">
                            Ainda não há regras vigentes.
                        </p>
                    )}
                    {rules.map((rule) => (
                        <article key={rule.id} className="rounded-xl border bg-white p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <h2 className="text-lg font-semibold">{rule.title}</h2>
                                <button
                                    type="button"
                                    onClick={() => startEdit(rule)}
                                    className="rounded-md border px-3 py-1.5"
                                >
                                    Editar
                                </button>
                            </div>
                            <p className="my-2 whitespace-pre-wrap">{rule.description}</p>
                            <p className="text-xs text-slate-600">
                                Criada por {rule.createdBy} em{" "}
                                {new Date(rule.createdAt).toLocaleDateString("pt-BR")} · Última
                                edição: {rule.updatedBy}
                            </p>
                        </article>
                    ))}
                </section>
            </main>
        </div>
    );
}
