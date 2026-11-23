"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, History, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    cancelMeeting,
    createMeeting,
    deleteCancelledMeeting,
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
const statusOrder: Record<ResidenceMeeting["status"], number> = {
    AGENDADA: 0,
    REAGENDADA: 1,
    REALIZADA: 2,
    CANCELADA: 3,
};
const responseLabel = { PENDENTE: "Pendente", CONFIRMADO: "Confirmado", RECUSADO: "Recusado" };

export default function MeetingsPage() {
    const { user } = useAuth();
    const [residences, setResidences] = useState<Residence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [meetings, setMeetings] = useState<ResidenceMeeting[]>([]);
    const [editing, setEditing] = useState<ResidenceMeeting | null>(null);
    const [meetingToDelete, setMeetingToDelete] = useState<ResidenceMeeting | null>(null);
    const [dateTime, setDateTime] = useState("");
    const [agenda, setAgenda] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const residence = useMemo(
        () => residences.find((item) => item.id === residenceId) ?? null,
        [residences, residenceId]
    );
    const sortedMeetings = useMemo(
        () =>
            [...meetings].sort((left, right) => {
                const statusDifference = statusOrder[left.status] - statusOrder[right.status];
                if (statusDifference !== 0) return statusDifference;
                return new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime();
            }),
        [meetings]
    );
    const meetingsById = useMemo(
        () => new Map(meetings.map((meeting) => [meeting.id, meeting])),
        [meetings]
    );
    const visibleMeetings = useMemo(
        () => sortedMeetings.filter((meeting) => meeting.status !== "REAGENDADA"),
        [sortedMeetings]
    );

    function getRescheduleHistory(meeting: ResidenceMeeting) {
        const history: ResidenceMeeting[] = [];
        let previousId = meeting.rescheduledFromId;
        const visited = new Set([meeting.id]);
        while (previousId && !visited.has(previousId)) {
            visited.add(previousId);
            const previous = meetingsById.get(previousId);
            if (!previous) break;
            history.push(previous);
            previousId = previous.rescheduledFromId;
        }
        return history.reverse();
    }
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
        setError("");
        setNotice("");
        const wasEditing = Boolean(editing);
        try {
            const payload = { dateTime: date.toISOString(), agenda: agenda.trim() };
            if (editing) await rescheduleMeeting(residenceId, editing.id, payload);
            else await createMeeting(residenceId, payload);
            setEditing(null);
            setDateTime("");
            setAgenda("");
            await loadMeetings(residenceId);
            setNotice(
                wasEditing ? "Reunião reagendada com sucesso." : "Reunião criada com sucesso."
            );
        } catch {
            setNotice("");
            setError("Não foi possível salvar a reunião. Confira os dados e tente novamente.");
        } finally {
            setBusy(false);
        }
    }
    async function respond(meeting: ResidenceMeeting, response: "CONFIRMADO" | "RECUSADO") {
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await respondToMeeting(residenceId, meeting.id, response);
            await loadMeetings(residenceId);
            setNotice(response === "CONFIRMADO" ? "Presença confirmada." : "Convite recusado.");
        } catch {
            setError("Não foi possível registrar sua resposta ao convite.");
        } finally {
            setBusy(false);
        }
    }
    async function cancel(meeting: ResidenceMeeting) {
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await cancelMeeting(residenceId, meeting.id);
            await loadMeetings(residenceId);
            setNotice("Reunião cancelada. Você pode excluí-la pelo histórico.");
        } catch {
            setError("Não foi possível cancelar a reunião.");
        } finally {
            setBusy(false);
        }
    }

    async function removeCancelledMeeting() {
        if (!meetingToDelete) return;
        setBusy(true);
        setError("");
        try {
            await deleteCancelledMeeting(residenceId, meetingToDelete.id);
            setMeetings((current) =>
                current.filter((meeting) => meeting.id !== meetingToDelete.id)
            );
            setMeetingToDelete(null);
            setNotice("Reunião cancelada excluída.");
        } catch {
            setError("Não foi possível excluir esta reunião cancelada.");
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
                            <Button type="submit" disabled={busy || !residenceId} className="w-fit">
                                {editing ? "Confirmar reagendamento" : "Criar reunião"}
                            </Button>
                            {editing && (
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setEditing(null);
                                        setDateTime("");
                                        setAgenda("");
                                    }}
                                    variant="outline"
                                >
                                    Cancelar
                                </Button>
                            )}
                        </div>
                    </form>
                </section>
                <section
                    aria-label="Lista de reuniões"
                    className="grid content-start gap-3 xl:grid-cols-2"
                >
                    {visibleMeetings.length === 0 && (
                        <p className="rounded-xl border bg-white p-5 text-slate-600">
                            {meetings.length === 0
                                ? "Ainda não há reuniões cadastradas."
                                : "As reuniões anteriores foram reagendadas. Consulte o histórico na reunião atual."}
                        </p>
                    )}
                    {visibleMeetings.map((meeting) => {
                        const ownInvitation = meeting.participants.find(
                            (person) => person.memberId === residence?.membership?.id
                        );
                        const isOrganizer = meeting.organizerMemberId === residence?.membership?.id;
                        const history = getRescheduleHistory(meeting);
                        return (
                            <article
                                key={meeting.id}
                                className="rounded-xl border border-[#ded6e1] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-base font-semibold text-[#29252d]">
                                                {meeting.title}
                                            </h2>
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${meeting.status === "AGENDADA" ? "bg-green-100 text-green-800" : meeting.status === "CANCELADA" ? "bg-red-50 text-red-700" : "bg-[#f1edf3] text-[#625c66]"}`}
                                            >
                                                {statusLabel[meeting.status]}
                                            </span>
                                        </div>
                                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-[#625c66]">
                                            <CalendarClock size={15} aria-hidden="true" />
                                            {new Date(meeting.dateTime).toLocaleString("pt-BR", {
                                                dateStyle: "medium",
                                                timeStyle: "short",
                                            })}
                                            <span aria-hidden="true">·</span>
                                            {meeting.organizer}
                                        </p>
                                    </div>
                                    {meeting.agenda.trim() !== meeting.title.trim() && (
                                        <p className="max-w-2xl whitespace-pre-wrap text-sm text-[#514c56]">
                                            {meeting.agenda}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#eee8f0] pt-3">
                                    <details className="text-sm">
                                        <summary className="cursor-pointer select-none font-medium text-[#514c56] hover:text-[#315d28]">
                                            Participantes ({meeting.participants.length})
                                        </summary>
                                        <ul className="mt-2 space-y-1 text-[#625c66]">
                                            {meeting.participants.map((person) => (
                                                <li key={person.memberId}>
                                                    {person.name}: {responseLabel[person.response]}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>

                                    {history.length > 0 && (
                                        <details className="text-sm">
                                            <summary className="flex cursor-pointer select-none items-center gap-1.5 font-medium text-[#514c56] hover:text-[#315d28]">
                                                <History size={15} aria-hidden="true" />
                                                Histórico ({history.length})
                                            </summary>
                                            <ol className="mt-2 space-y-2 border-l border-[#d9d0dc] pl-3 text-[#625c66]">
                                                {history.map((previous) => (
                                                    <li key={previous.id}>
                                                        <span className="font-medium text-[#29252d]">
                                                            {previous.title}
                                                        </span>
                                                        <span className="ml-2 text-xs">
                                                            {new Date(
                                                                previous.dateTime
                                                            ).toLocaleString("pt-BR", {
                                                                dateStyle: "medium",
                                                                timeStyle: "short",
                                                            })}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ol>
                                        </details>
                                    )}

                                    <span className="ml-auto text-xs text-[#77717c]">
                                        Organizada por {meeting.organizer}
                                    </span>
                                </div>

                                {(meeting.status === "AGENDADA" ||
                                    (meeting.status === "CANCELADA" && isOrganizer)) && (
                                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[#eee8f0] pt-3">
                                        {meeting.status === "AGENDADA" &&
                                            ownInvitation?.response === "PENDENTE" && (
                                                <>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            void respond(meeting, "CONFIRMADO")
                                                        }
                                                    >
                                                        Confirmar presença
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            void respond(meeting, "RECUSADO")
                                                        }
                                                    >
                                                        Recusar convite
                                                    </Button>
                                                </>
                                            )}
                                        {meeting.status === "AGENDADA" && isOrganizer && (
                                            <>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditing(meeting);
                                                        setAgenda(meeting.agenda);
                                                        setDateTime("");
                                                        window.scrollTo({
                                                            top: 0,
                                                            behavior: "smooth",
                                                        });
                                                    }}
                                                >
                                                    Reagendar
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={busy}
                                                    onClick={() => void cancel(meeting)}
                                                >
                                                    Cancelar reunião
                                                </Button>
                                            </>
                                        )}
                                        {meeting.status === "CANCELADA" && isOrganizer && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="destructive"
                                                disabled={busy}
                                                onClick={() => setMeetingToDelete(meeting)}
                                            >
                                                <Trash2 aria-hidden="true" />
                                                Excluir reunião
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </section>
            </main>

            {notice && (
                <div
                    role="status"
                    className="fixed bottom-5 left-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-green-200 bg-[#f0f8ec] px-4 py-3 text-sm font-medium text-green-900 shadow-lg sm:left-auto sm:right-6 sm:max-w-md"
                >
                    <CheckCircle2
                        size={19}
                        className="shrink-0 text-[#4e812f]"
                        aria-hidden="true"
                    />
                    <span className="flex-1">{notice}</span>
                    <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Dispensar aviso"
                        onClick={() => setNotice("")}
                    >
                        <X aria-hidden="true" />
                    </Button>
                </div>
            )}

            {meetingToDelete && (
                <div
                    className="fixed inset-0 z-[60] grid place-items-center bg-[#17131a]/55 p-4"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !busy) {
                            setMeetingToDelete(null);
                        }
                    }}
                >
                    <section
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-meeting-title"
                        className="w-full max-w-md rounded-2xl border border-[#ded6e1] bg-[#fffaff] p-6 shadow-2xl"
                    >
                        <div className="grid size-10 place-items-center rounded-full bg-red-100 text-red-700">
                            <Trash2 size={19} aria-hidden="true" />
                        </div>
                        <h2 id="delete-meeting-title" className="mt-4 text-lg font-semibold">
                            Excluir reunião cancelada?
                        </h2>
                        <p className="mt-2 text-sm text-[#716b74]">
                            “{meetingToDelete.title}” será removida permanentemente do histórico da
                            casa.
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={busy}
                                onClick={() => setMeetingToDelete(null)}
                            >
                                Manter reunião
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => void removeCancelledMeeting()}
                            >
                                {busy ? "Excluindo…" : "Excluir reunião"}
                            </Button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
