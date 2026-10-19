"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import {
    Bell,
    CalendarDays,
    CheckSquare,
    ChevronRight,
    DollarSign,
    House,
    Info,
    PawPrint,
    Plus,
    Settings,
    Trash2,
    UserRound,
    Wallet,
} from "lucide-react";
import {
    createPet,
    createPetCareLog,
    deletePet,
    deletePetCareLog,
    getPet,
    getPetResidenceMembers,
    getPetResidences,
    getPets,
    updatePet,
    updatePetCareLog,
} from "@/features/pets/api/pets.api";
import type {
    Pet,
    PetCareLog,
    PetCareLogInput,
    PetCareType,
    PetInput,
    PetResidence,
    PetResidenceMember,
} from "@/features/pets/api/pets.api";
import { getExpenses } from "@/features/expenses/api/expenses.api";
import type { Expense } from "@/features/expenses/api/expenses.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

const emptyPet: PetInput = { name: "", species: "", breed: "", birthDate: "", photoUrl: "" };
const emptyCare: PetCareLogInput = { type: "VACCINE", title: "", description: "", date: "", cost: null };
const careTypes: { value: PetCareType; label: string }[] = [
    { value: "VACCINE", label: "Vacina" },
    { value: "FOOD", label: "Ração e suprimentos" },
    { value: "VET_VISIT", label: "Consulta veterinária" },
    { value: "MEDICATION", label: "Medicação" },
    { value: "OTHER", label: "Outro" },
];
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
});

function getErrorMessage(error: unknown) {
    if (typeof error === "object" && error !== null && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string") return message;
    }
    return "Não foi possível concluir a operação. Tente novamente.";
}

function displayDate(value: string | null) {
    if (!value) return "Não informado";
    return dateFormat.format(new Date(value.slice(0, 10) + "T00:00:00.000Z"));
}

function roleLabel(role?: string) {
    if (role === "ADMINISTRADOR") return "Administrador";
    if (role === "LIDER") return "Líder";
    return "Morador";
}

function canDeletePet(pet: Pet, residence: PetResidence) {
    return pet.createdById === residence.membership?.id || residence.membership?.role === "ADMINISTRADOR";
}

export default function PetsPage() {
    const { user } = useAuth();
    const [residences, setResidences] = useState<PetResidence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [pets, setPets] = useState<Pet[]>([]);
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [members, setMembers] = useState<PetResidenceMember[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [form, setForm] = useState<PetInput>(emptyPet);
    const [careForm, setCareForm] = useState<PetCareLogInput>(emptyCare);
    const [editingCare, setEditingCare] = useState<PetCareLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingCare, setSavingCare] = useState(false);
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");
    const [notice, setNotice] = useState("");
    const [showCareForm, setShowCareForm] = useState(false);
    const [confirmPetDelete, setConfirmPetDelete] = useState(false);

    const residence = useMemo(
        () => residences.find((item) => item.id === residenceId) ?? null,
        [residences, residenceId],
    );
    const currentMember = residence?.membership ?? null;

    const loadResidenceData = useCallback(async (id: string, active: () => boolean = () => true) => {
        const [nextPets, nextMembers, nextExpenses] = await Promise.all([
            getPets(id),
            getPetResidenceMembers(id),
            getExpenses(),
        ]);
        if (!active()) return;
        setPets(nextPets);
        setMembers(nextMembers);
        setExpenses(nextExpenses.filter((expense) => expense.homeId === id));
    }, []);

    useEffect(() => {
        let active = true;
        getPetResidences()
            .then(async (available) => {
                if (!active) return;
                setResidences(available);
                if (available.length > 0) {
                    setResidenceId(available[0].id);
                    await loadResidenceData(available[0].id, () => active);
                }
            })
            .catch((loadError: unknown) => {
                if (active) setError(getErrorMessage(loadError));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [loadResidenceData]);

    async function changeResidence(id: string) {
        setResidenceId(id);
        setSelectedPet(null);
        setForm(emptyPet);
        setError("");
        setNotice("");
        setLoading(true);
        try {
            await loadResidenceData(id);
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    }

    function startNewPet() {
        setSelectedPet(null);
        setForm(emptyPet);
        setFormError("");
        setNotice("");
        setConfirmPetDelete(false);
    }

    async function choosePet(pet: Pet) {
        setFormError("");
        setNotice("");
        try {
            const detail = await getPet(residenceId, pet.id);
            setSelectedPet(detail);
            setForm({
                name: detail.name,
                species: detail.species,
                breed: detail.breed ?? "",
                birthDate: detail.birthDate ?? "",
                photoUrl: detail.photoUrl ?? "",
            });
            setShowCareForm(false);
            setEditingCare(null);
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError));
        }
    }

    async function handlePetSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError("");
        if (!residenceId) {
            setFormError("Selecione uma casa ativa para cadastrar o pet.");
            return;
        }
        if (!form.name.trim() || !form.species.trim()) {
            setFormError("Preencha o nome e a espécie do pet.");
            return;
        }
        setSaving(true);
        const payload: PetInput = {
            name: form.name.trim(),
            species: form.species.trim(),
            breed: form.breed?.trim() || null,
            birthDate: form.birthDate || null,
            photoUrl: form.photoUrl?.trim() || null,
        };
        try {
            const result = selectedPet
                ? await updatePet(residenceId, selectedPet.id, payload)
                : await createPet(residenceId, payload);
            await loadResidenceData(residenceId);
            if (selectedPet) {
                setSelectedPet({ ...result, careLogs: selectedPet.careLogs ?? [] });
            } else {
                await choosePet(result);
            }
            setNotice(selectedPet ? "Pet atualizado com sucesso." : "Pet cadastrado com sucesso.");
        } catch (saveError: unknown) {
            setFormError(getErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    }

    async function handlePetDelete() {
        if (!selectedPet || !residence) return;
        setSaving(true);
        try {
            await deletePet(residence.id, selectedPet.id);
            await loadResidenceData(residence.id);
            startNewPet();
            setNotice("Pet removido com sucesso.");
        } catch (deleteError: unknown) {
            setError(getErrorMessage(deleteError));
        } finally {
            setSaving(false);
        }
    }

    function startCareRecord(log?: PetCareLog) {
        setEditingCare(log ?? null);
        setCareForm(log
            ? {
                  type: log.type,
                  title: log.title,
                  description: log.description ?? "",
                  date: log.date,
                  cost: log.cost,
                  paidById: log.paidById,
                  expenseId: log.expenseId,
              }
            : { ...emptyCare, date: new Date().toISOString().slice(0, 10) });
        setShowCareForm(true);
    }

    async function handleCareSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedPet) return;
        setSavingCare(true);
        setError("");
        try {
            const payload = {
                ...careForm,
                title: careForm.title.trim(),
                description: careForm.description?.trim() || null,
                cost: careForm.cost === null || careForm.cost === undefined || Number.isNaN(Number(careForm.cost))
                    ? null
                    : Number(careForm.cost),
                paidById: careForm.paidById || null,
                expenseId: careForm.expenseId || null,
            };
            if (editingCare) {
                await updatePetCareLog(selectedPet.id, editingCare.id, payload);
            } else {
                await createPetCareLog(selectedPet.id, payload);
            }
            await choosePet(selectedPet);
            setShowCareForm(false);
            setNotice(editingCare ? "Registro atualizado." : "Cuidado registrado.");
        } catch (saveError: unknown) {
            setError(getErrorMessage(saveError));
        } finally {
            setSavingCare(false);
        }
    }

    async function handleCareDelete(log: PetCareLog) {
        if (!selectedPet) return;
        try {
            await deletePetCareLog(selectedPet.id, log.id);
            await choosePet(selectedPet);
            setNotice("Registro removido.");
        } catch (deleteError: unknown) {
            setError(getErrorMessage(deleteError));
        }
    }

    const canDelete = selectedPet && residence ? canDeletePet(selectedPet, residence) : false;
    const homePlace = [residence?.city, residence?.neighborhood].filter(Boolean).join(" • ");
    const memberName = members.find((member) => member.id === currentMember?.id)?.name ?? user?.email ?? "Morador";

    return (
        <div className="min-h-screen bg-[#f8f4fa] text-[#29252d] md:flex">
            <aside className="flex shrink-0 flex-col border-b border-[#d9d0dc] bg-[#f8f4fa] px-4 py-5 md:min-h-screen md:w-[220px] md:border-b-0 md:border-r">
                <Link href="/" className="mb-7 flex items-center gap-3 rounded-lg px-1" aria-label="FullHouse início">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#234a1b] text-white"><House size={24} /></span>
                    <span><span className="block font-bold leading-tight">FullHouse</span><span className="block text-xs text-[#625c66]">Casa {residence?.name ?? "FullHouse"}</span></span>
                </Link>
                <nav aria-label="Navegação principal" className="grid gap-1">
                    <SidebarLink icon={<House size={17} />} label="Home" />
                    <SidebarLink icon={<CheckSquare size={17} />} label="Tarefas" />
                    <SidebarLink icon={<DollarSign size={17} />} label="Financeiro" href="/finance" />
                    <SidebarLink icon={<Wallet size={17} />} label="Despensa" href="/pantry" />
                    <SidebarLink icon={<UserRound size={17} />} label="Perfil" />
                    <SidebarLink icon={<PawPrint size={18} />} label="Pets" href="/pets" active />
                </nav>
            </aside>

            <div className="min-w-0 flex-1">
                <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#d9d0dc] bg-[#fffaff] px-5 py-3 md:px-7">
                    <div>
                        <h1 className="text-xl font-bold">Bom dia{memberName ? ", " + memberName.split(" ")[0] : ""}</h1>
                        <p className="flex items-center gap-1 text-xs text-[#77717c]"><House size={12} /> {residence?.name ?? "Nenhuma casa ativa"}</p>
                    </div>
                    {residences.length > 0 && (
                        <label className="flex items-center gap-2 rounded-xl bg-[#e8e5e9] p-1 text-xs">
                            <span className="sr-only">Casa selecionada</span>
                            <select value={residenceId} onChange={(event) => void changeResidence(event.target.value)} className="max-w-56 rounded-lg border-0 bg-[#4e812f] px-4 py-2 text-white outline-none">
                                {residences.map((item) => <option key={item.id} value={item.id} className="bg-white text-[#29252d]">{item.name}</option>)}
                            </select>
                        </label>
                    )}
                    <div className="flex items-center gap-3 text-[#514c56]">
                        <button type="button" aria-label="Notificações" className="grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"><Bell size={19} /></button>
                        <button type="button" aria-label="Configurações" className="grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"><Settings size={19} /></button>
                        <span className="grid size-10 place-items-center rounded-full bg-[#4f7f63] font-semibold text-white" aria-label="Perfil">{memberName.slice(0, 1).toUpperCase()}</span>
                    </div>
                </header>

                <main className="mx-auto max-w-[1500px] p-4 md:p-6">
                    {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
                    {notice && <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
                    {!loading && residences.length === 0 ? (
                        <section className="rounded-xl border border-[#d6cdd9] bg-[#fffaff] p-10 text-center">
                            <House className="mx-auto mb-3 text-[#4f7f63]" size={30} />
                            <h2 className="font-semibold">Nenhuma casa ativa</h2>
                            <p className="mt-1 text-sm text-[#77717c]">Entre em uma casa para consultar e cadastrar pets.</p>
                        </section>
                    ) : (
                        <div className="grid min-w-0 gap-1 xl:grid-cols-[minmax(0,1fr)_minmax(370px,0.88fr)]">
                            <section className="rounded-xl border border-[#ded7e1] bg-[#fffaff] p-5 md:p-7">
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="text-lg font-bold">{selectedPet ? "Dados do pet" : "Cadastrar pet"}</h2>
                                    {selectedPet && <button type="button" onClick={startNewPet} className="inline-flex items-center gap-1 rounded-lg border border-[#4f7f63] px-3 py-2 text-sm text-[#4f7f63]"><Plus size={15} /> Novo pet</button>}
                                </div>
                                {loading ? <p className="text-sm text-[#77717c]">Carregando pets…</p> : (
                                    <form onSubmit={handlePetSubmit} className="grid gap-5">
                                        <FormField label="Nome do pet" required>
                                            <input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Thor" className={inputClass} />
                                        </FormField>
                                        <FormField label="Espécie" required>
                                            <select required value={form.species} onChange={(event) => setForm({ ...form, species: event.target.value })} className={inputClass}>
                                                <option value="">Selecione a espécie</option>
                                                <option value="Cachorro">Cachorro</option>
                                                <option value="Gato">Gato</option>
                                                <option value="Pássaro">Pássaro</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </FormField>
                                        <FormField label="Raça">
                                            <input maxLength={100} value={form.breed ?? ""} onChange={(event) => setForm({ ...form, breed: event.target.value })} placeholder="Raça" className={inputClass} />
                                        </FormField>
                                        <FormField label="Data de nascimento">
                                            <input type="date" value={form.birthDate ?? ""} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} className={inputClass} />
                                        </FormField>
                                        <FormField label="URL da foto">
                                            <input type="url" maxLength={500} value={form.photoUrl ?? ""} onChange={(event) => setForm({ ...form, photoUrl: event.target.value })} placeholder="https://..." className={inputClass} />
                                        </FormField>
                                        {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
                                        <div className="flex flex-wrap justify-end gap-3 pt-2">
                                            {selectedPet && canDelete && <button type="button" onClick={() => setConfirmPetDelete(true)} className="mr-auto inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm text-red-700"><Trash2 size={16} /> Excluir pet</button>}
                                            {selectedPet && <button type="button" onClick={startNewPet} className="rounded-lg border border-[#4f7f63] px-5 py-2.5 text-sm font-medium text-[#4f7f63]">Cancelar</button>}
                                            <button type="submit" disabled={saving || !residenceId} className="inline-flex items-center gap-2 rounded-lg bg-[#4f7f63] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3e6b52] disabled:opacity-60"><Plus size={16} /> {saving ? "Salvando…" : selectedPet ? "Salvar alterações" : "Salvar pet"}</button>
                                        </div>
                                    </form>
                                )}
                            </section>

                            <div className="grid content-start gap-1">
                                <section className="rounded-xl border border-[#ded7e1] bg-[#fffaff] p-5">
                                    <h2 className="mb-4 flex items-center gap-2 text-sm font-bold"><House size={17} className="text-[#4f7f63]" /> Casa vinculada</h2>
                                    <div className="flex items-center gap-3 rounded-lg bg-[#e8f0ea] p-3">
                                        <span className="grid size-10 place-items-center rounded-lg bg-[#4f7f63] text-white"><House size={20} /></span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold">{residence?.name ?? "Casa"}</p>
                                            <p className="text-xs text-[#77717c]">{homePlace || "Localização não informada"}</p>
                                        </div>
                                        <span className="rounded-full bg-[#4f7f63] px-2.5 py-1 text-[10px] font-semibold text-white">ATIVA</span>
                                    </div>
                                    <div className="mt-2 rounded-lg bg-[#e8f0ea] px-3 py-2.5">
                                        <p className="text-[11px] font-semibold">Seu vínculo</p>
                                        <p className="text-xs font-medium text-[#29252d]">{roleLabel(currentMember?.role)}</p>
                                        <p className="mt-0.5 text-xs text-[#77717c]">Você pode gerenciar os pets desta casa.</p>
                                    </div>
                                </section>

                                <section className="rounded-xl border border-[#ded7e1] bg-[#fffaff] p-5">
                                    <h2 className="mb-5 flex items-center gap-2 text-sm font-bold"><Info size={17} className="text-[#4f7f63]" /> Informações do pet</h2>
                                    {selectedPet ? (
                                        <div className="flex items-start gap-3 px-1">
                                            <PetAvatar pet={selectedPet} large />
                                            <div className="min-w-0">
                                                <p className="font-semibold">{selectedPet.name}</p>
                                                <p className="text-sm text-[#77717c]">{selectedPet.species}{selectedPet.breed ? " • " + selectedPet.breed : ""}</p>
                                                <p className="mt-4 flex items-center gap-2 text-xs text-[#77717c]"><CalendarDays size={14} /> Nasc. {displayDate(selectedPet.birthDate)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="py-5 text-sm text-[#77717c]">Selecione um pet na lista para ver os detalhes.</p>
                                    )}
                                </section>

                                <section className="min-h-[300px] rounded-xl border border-[#ded7e1] bg-[#fffaff] p-5">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="flex items-center gap-2 text-sm font-bold"><PawPrint size={17} className="text-[#4f7f63]" /> Pets cadastrados nesta casa</h2>
                                        <span className="rounded-full bg-[#d9ead9] px-2.5 py-1 text-xs font-semibold text-[#356748]">{pets.length}</span>
                                    </div>
                                    {loading ? <p className="py-4 text-sm text-[#77717c]">Carregando…</p> : pets.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-[#d9d1dc] px-4 py-8 text-center">
                                            <PawPrint className="mx-auto mb-2 text-[#8c8490]" size={24} />
                                            <p className="text-sm font-medium">Ainda não há pets cadastrados.</p>
                                            <p className="mt-1 text-xs text-[#77717c]">Use o formulário para cadastrar o primeiro.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            {pets.map((pet) => (
                                                <button key={pet.id} type="button" onClick={() => void choosePet(pet)} className={"flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition hover:bg-[#f5f1f6] " + (selectedPet?.id === pet.id ? "border-[#4f7f63] bg-[#f1f6f2]" : "border-[#ded7e1] bg-[#fffaff]")}>
                                                    <PetAvatar pet={pet} />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-semibold">{pet.name}</span>
                                                        <span className="block truncate text-xs text-[#77717c]">{pet.species}{pet.breed ? " • " + pet.breed : ""}</span>
                                                        <span className="mt-0.5 block text-[10px] text-[#96909b]">♙ {pet.createdById === currentMember?.id ? "Você" : "Morador da casa"}</span>
                                                    </span>
                                                    <span className="rounded-full bg-[#d9ead9] px-2.5 py-1 text-[10px] font-semibold text-[#356748]">Ativo</span>
                                                    <ChevronRight size={16} className="text-[#615b65]" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>

                            {selectedPet && (
                                <section className="rounded-xl border border-[#ded7e1] bg-[#fffaff] p-5 xl:col-span-2">
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h2 className="flex items-center gap-2 text-base font-bold"><CalendarDays size={18} className="text-[#4f7f63]" /> Histórico de cuidados e gastos</h2>
                                            <p className="mt-1 text-xs text-[#77717c]">Visível para todos os moradores ativos da casa.</p>
                                        </div>
                                        <button type="button" onClick={() => startCareRecord()} className="inline-flex items-center gap-2 rounded-lg bg-[#4f7f63] px-4 py-2.5 text-sm font-medium text-white"><Plus size={16} /> Registrar cuidado</button>
                                    </div>
                                    {showCareForm && (
                                        <form onSubmit={handleCareSubmit} className="mb-5 grid gap-3 rounded-xl border border-[#d9d1dc] bg-[#faf7fb] p-4 md:grid-cols-2 xl:grid-cols-4">
                                            <FormField label="Tipo" required>
                                                <select required value={careForm.type} onChange={(event) => setCareForm({ ...careForm, type: event.target.value as PetCareType })} className={inputClass}>
                                                    {careTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                                                </select>
                                            </FormField>
                                            <FormField label="Título" required><input required maxLength={150} value={careForm.title} onChange={(event) => setCareForm({ ...careForm, title: event.target.value })} placeholder="Ex.: Vacina anual" className={inputClass} /></FormField>
                                            <FormField label="Data do cuidado" required><input required type="date" value={careForm.date} onChange={(event) => setCareForm({ ...careForm, date: event.target.value })} className={inputClass} /></FormField>
                                            <FormField label="Valor (opcional)"><input type="number" min="0" step="0.01" value={careForm.cost ?? ""} onChange={(event) => setCareForm({ ...careForm, cost: event.target.value === "" ? null : Number(event.target.value) })} placeholder="0,00" className={inputClass} /></FormField>
                                            <FormField label="Pagador/realizador">
                                                <select value={careForm.paidById ?? ""} onChange={(event) => setCareForm({ ...careForm, paidById: event.target.value || null })} className={inputClass}>
                                                    <option value="">Não informado</option>
                                                    {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                                                </select>
                                            </FormField>
                                            <FormField label="Despesa vinculada (opcional)">
                                                <select value={careForm.expenseId ?? ""} onChange={(event) => setCareForm({ ...careForm, expenseId: event.target.value || null })} className={inputClass}>
                                                    <option value="">Sem despesa vinculada</option>
                                                    {expenses.map((expense) => <option key={expense.id} value={expense.id}>{expense.description} · {currency.format(Number(expense.amount))}</option>)}
                                                </select>
                                            </FormField>
                                            <FormField label="Descrição" className="md:col-span-2"><textarea rows={2} value={careForm.description ?? ""} onChange={(event) => setCareForm({ ...careForm, description: event.target.value })} className={inputClass} /></FormField>
                                            <div className="flex items-end justify-end gap-2 md:col-span-2 xl:col-span-4">
                                                <button type="button" onClick={() => setShowCareForm(false)} className="rounded-lg border border-[#cfc7d3] px-4 py-2 text-sm">Cancelar</button>
                                                <button disabled={savingCare} className="rounded-lg bg-[#4f7f63] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{savingCare ? "Salvando…" : editingCare ? "Salvar registro" : "Salvar registro"}</button>
                                            </div>
                                        </form>
                                    )}
                                    {selectedPet.careLogs?.length ? (
                                        <div className="divide-y divide-[#eee8ef]">
                                            {selectedPet.careLogs.map((log) => <CareLogRow key={log.id} log={log} onEdit={() => startCareRecord(log)} onDelete={() => void handleCareDelete(log)} />)}
                                        </div>
                                    ) : (
                                        <p className="rounded-lg bg-[#f8f4fa] px-4 py-6 text-center text-sm text-[#77717c]">Nenhum cuidado ou gasto registrado para este pet.</p>
                                    )}
                                </section>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {confirmPetDelete && selectedPet && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
                    <section role="alertdialog" aria-modal="true" aria-labelledby="delete-pet-title" className="w-full max-w-md rounded-2xl bg-[#fffaff] p-6 shadow-xl">
                        <h2 id="delete-pet-title" className="text-lg font-bold">Excluir {selectedPet.name}?</h2>
                        <p className="mt-2 text-sm text-[#77717c]">O histórico de cuidados deste pet também será removido. Despesas compartilhadas vinculadas serão mantidas.</p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button type="button" onClick={() => setConfirmPetDelete(false)} className="rounded-lg border border-[#cfc7d3] px-4 py-2 text-sm">Cancelar</button>
                            <button type="button" disabled={saving} onClick={() => void handlePetDelete()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Excluindo…" : "Excluir pet"}</button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

const inputClass = "w-full rounded-lg border border-[#d3cbd7] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#4f7f63] focus:ring-2 focus:ring-[#4f7f63]/15";

function FormField({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
    return <label className={"grid gap-2 text-xs font-medium " + className}>{label}{required && <span className="text-red-600"> *</span>}{children}</label>;
}

function SidebarLink({ icon, label, href, active }: { icon: ReactNode; label: string; href?: string; active?: boolean }) {
    const className = "flex items-center gap-3 rounded-xl px-3 py-3 text-sm " + (active ? "bg-white font-semibold text-[#4f7f63]" : href ? "text-[#514c56] hover:bg-white/70" : "text-[#98919c]");
    return href ? <Link href={href} aria-current={active ? "page" : undefined} className={className}>{icon}{label}</Link> : <span className={className}>{icon}{label}</span>;
}

function PetAvatar({ pet, large = false }: { pet: Pet; large?: boolean }) {
    return pet.photoUrl ? (
        <img src={pet.photoUrl} alt="" className={(large ? "size-14" : "size-10") + " shrink-0 rounded-full border border-[#ded7e1] object-cover"} />
    ) : (
        <span className={(large ? "size-14" : "size-10") + " grid shrink-0 place-items-center rounded-full bg-[#e8f0ea] text-[#4f7f63]"}><PawPrint size={large ? 25 : 19} /></span>
    );
}

function CareLogRow({ log, onEdit, onDelete }: { log: PetCareLog; onEdit: () => void; onDelete: () => void }) {
    const label = careTypes.find((type) => type.value === log.type)?.label ?? "Outro cuidado";
    return (
        <article className="flex flex-wrap items-center gap-3 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e8f0ea] text-[#4f7f63]"><PawPrint size={18} /></span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{log.title}</h3>
                    <span className="rounded-full bg-[#edf0ed] px-2 py-0.5 text-[10px] text-[#4f7f63]">{label}</span>
                </div>
                {log.description && <p className="mt-0.5 text-xs text-[#77717c]">{log.description}</p>}
                <p className="mt-1 text-[11px] text-[#8c8490]">{displayDate(log.date)}{log.paidById ? " · Registrado por morador" : ""}</p>
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold text-[#4f7f63]">{log.cost !== null && log.cost !== undefined ? <><DollarSign size={14} />{currency.format(log.cost)}</> : ""}</span>
            <button type="button" onClick={onEdit} className="rounded-md p-2 text-[#68616d] hover:bg-[#f0ebf2]" aria-label={"Editar " + log.title}><Settings size={15} /></button>
            <button type="button" onClick={onDelete} className="rounded-md p-2 text-red-700 hover:bg-red-50" aria-label={"Remover " + log.title}><Trash2 size={15} /></button>
        </article>
    );
}
