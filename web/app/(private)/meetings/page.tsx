"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    cancelMeeting,
    createMeeting,
    getMeetings,
    respondToMeeting,
    rescheduleMeeting,
    type ResidenceMeeting,
} from "@/features/house-collaboration/api/meetings.api";
import { ResidenceSelector } from "@/features/house-collaboration/components/ResidenceSelector";
import { getResidences, type Residence } from "@/features/residences/api/residences.api";

const statusLabel: Record<ResidenceMeeting["status"], string> = {
    AGENDADA: "Agendada",
    REALIZADA: "Realizada",
    CANCELADA: "Cancelada",
    REAGENDADA: "Reagendada",
};
const responseLabel = { PENDENTE: "Pendente", CONFIRMADO: "Confirmado", RECUSADO: "Recusado" };

export default function MeetingsPage() {
    const { user } = useAuth();
    const [residences, setResidences] = useState<Residence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [meetings, setMeetings] = useState<ResidenceMeeting[]>([]);
    const [editing, setEditing] = useState<ResidenceMeeting | null>(null);
    const [dateTime, setDateTime] = useState("");
    const [agenda, setAgenda] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const residence = useMemo(
        () => residences.find((item) => item.id === residenceId) ?? null,
        [residences, residenceId]
    );
    const loadMeetings = useCallback(async (id: string) => {
        try {
            setMeetings(await getMeetings(id));
            setError("");
        } catch {
            setError("Não foi possível carregar as reuniões desta residência.");
        }
    }, []);
    useEffect(() => {
        let active = true;
        void getResidences()
            .then((items) => {
                if (active) {
                    setResidences(items);
                    setResidenceId(items[0]?.id ?? "");
                    if (items[0]) void loadMeetings(items[0].id);
                }
            })
            .catch(() => setError("Não foi possível carregar suas residências."));
        return () => {
            active = false;
        };
    }, [loadMeetings]);

    function changeResidence(id: string) {
        setResidenceId(id);
        void loadMeetings(id);
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!agenda.trim() || !dateTime) {
            setError("Informe data, horário e pauta da reunião.");
            return;
        }
        const date = new Date(dateTime);
        if (!Number.isFinite(date.getTime()) || date <= new Date()) {
            setError("Escolha uma data e horário futuros.");
            return;
        }
        setBusy(true);
        try {
            const payload = { dateTime: date.toISOString(), agenda: agenda.trim() };
            if (editing) await rescheduleMeeting(residenceId, editing.id, payload);
            else await createMeeting(residenceId, payload);
            setEditing(null);
            setDateTime("");
            setAgenda("");
            await loadMeetings(residenceId);
        } catch {
            setError("Não foi possível salvar a reunião. Confira os dados e tente novamente.");
        } finally {
            setBusy(false);
        }
    }
    async function respond(meeting: ResidenceMeeting, response: "CONFIRMADO" | "RECUSADO") {
        setBusy(true);
        try {
            await respondToMeeting(residenceId, meeting.id, response);
            await loadMeetings(residenceId);
        } catch {
            setError("Não foi possível registrar sua resposta ao convite.");
        } finally {
            setBusy(false);
        }
    }
    async function cancel(meeting: ResidenceMeeting) {
        setBusy(true);
        try {
            await cancelMeeting(residenceId, meeting.id);
            await loadMeetings(residenceId);
        } catch {
            setError("Não foi possível cancelar a reunião.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#f6f3f7] md:flex">
            <AppSidebar activeSection="meetings" residenceName={residence?.name} />
            <main className="min-w-0 flex-1 px-4 py-5 md:px-8">
                <AppPageHeader
                    greetingName={user?.name ?? "Morador"}
                    residenceName={residence?.name}
                    subtitle="Organize encontros e acompanhe as confirmações dos moradores."
                    residenceControl={
                        <ResidenceSelector
                            residences={residences}
                            value={residenceId}
                            onChange={changeResidence}
                        />
                    }
                />
                <h1 className="my-5 text-2xl font-bold">Reuniões</h1>
                {error && (
                    <p role="alert" className="my-3 text-sm text-red-700">
                        {error}
                    </p>
                )}
                <section className="my-5 rounded-xl border bg-white p-5">
                    <h2 className="mb-4 text-lg font-semibold">
                        {editing ? "Reagendar reunião" : "Marcar reunião"}
                    </h2>
                    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1 text-sm font-medium">
                            Data e horário
                            <input
                                aria-label="Data e horário"
                                type="datetime-local"
                                className="rounded-md border px-3 py-2"
                                value={dateTime}
                                onChange={(event) => setDateTime(event.target.value)}
                            />
                        </label>
                        <label className="grid gap-1 text-sm font-medium md:col-span-2">
                            Pauta
                            <textarea
                                aria-label="Pauta"
                                rows={3}
                                maxLength={5000}
                                className="rounded-md border px-3 py-2"
                                value={agenda}
                                onChange={(event) => setAgenda(event.target.value)}
                            />
                        </label>
                        <div className="flex gap-2">
                            <button
                                disabled={busy || !residenceId}
                                className="rounded-md bg-[#234a1b] px-4 py-2 font-semibold text-white"
                            >
                                {editing ? "Confirmar reagendamento" : "Criar reunião"}
                            </button>
                            {editing && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditing(null);
                                        setDateTime("");
                                        setAgenda("");
                                    }}
                                    className="rounded-md border px-4 py-2"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </section>
                <section aria-label="Lista de reuniões" className="grid gap-3">
                    {meetings.length === 0 && (
                        <p className="rounded-xl border bg-white p-5 text-slate-600">
                            Ainda não há reuniões cadastradas.
                        </p>
                    )}
                    {meetings.map((meeting) => {
                        const ownInvitation = meeting.participants.find(
                            (person) => person.memberId === residence?.membership?.id
                        );
                        const isOrganizer = meeting.organizerMemberId === residence?.membership?.id;
                        return (
                            <article key={meeting.id} className="rounded-xl border bg-white p-5">
                                <div className="flex flex-wrap justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-semibold">{meeting.title}</h2>
                                        <p className="text-sm text-slate-600">
                                            {new Date(meeting.dateTime).toLocaleString("pt-BR")} ·{" "}
                                            {statusLabel[meeting.status]}
                                        </p>
                                    </div>
                                    <span className="text-sm">
                                        Organizada por {meeting.organizer}
                                    </span>
                                </div>
                                <p className="my-3 whitespace-pre-wrap">{meeting.agenda}</p>
                                <details className="mb-3">
                                    <summary className="cursor-pointer font-medium">
                                        Participantes ({meeting.participants.length})
                                    </summary>
                                    <ul className="mt-2 space-y-1 text-sm">
                                        {meeting.participants.map((person) => (
                                            <li key={person.memberId}>
                                                {person.name}: {responseLabel[person.response]}
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                                {meeting.status === "AGENDADA" && (
                                    <div className="flex flex-wrap gap-2">
                                        {ownInvitation?.response === "PENDENTE" && (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() =>
                                                        void respond(meeting, "CONFIRMADO")
                                                    }
                                                    className="cursor-pointer rounded-md bg-[#4e812f] px-3 py-1.5 text-white transition-colors hover:bg-[#3e6b25] disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    Confirmar presença
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() =>
                                                        void respond(meeting, "RECUSADO")
                                                    }
                                                    className="cursor-pointer rounded-md bg-red-600 px-3 py-1.5 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    Recusar convite
                                                </button>
                                            </>
                                        )}
                                        {isOrganizer && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setEditing(meeting);
                                                        setAgenda(meeting.agenda);
                                                        setDateTime("");
                                                        window.scrollTo({
                                                            top: 0,
                                                            behavior: "smooth",
                                                        });
                                                    }}
                                                    className="rounded-md border px-3 py-1.5"
                                                >
                                                    Reagendar
                                                </button>
                                                <button
                                                    disabled={busy}
                                                    onClick={() => void cancel(meeting)}
                                                    className="rounded-md border border-red-300 px-3 py-1.5 text-red-700"
                                                >
                                                    Cancelar reunião
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </section>
            </main>
        </div>
    );
}
