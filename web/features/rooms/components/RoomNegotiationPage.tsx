"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    getRoomNegotiation,
    sendRoomInvitation,
    sendRoomNegotiationMessage,
    type RoomNegotiation,
} from "../api/rooms.api";

const MESSAGE_PAGE_SIZE = 30;
const OLDER_MESSAGES_THRESHOLD = 64;

function errorText(error: unknown, fallback = "Não foi possível carregar a negociação.") {
    return typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : fallback;
}

export function RoomNegotiationPage() {
    const { user, loading: authLoading } = useAuth();
    const { replace } = useRouter();
    const { id } = useParams<{ id: string }>();
    const [negotiation, setNegotiation] = useState<RoomNegotiation | null>(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendingInvitation, setSendingInvitation] = useState(false);
    const [error, setError] = useState("");
    const [olderError, setOlderError] = useState("");
    const [notice, setNotice] = useState("");
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const olderRequestInFlightRef = useRef(false);
    const initialScrollPositionedRef = useRef(false);
    const pendingScrollAdjustmentRef = useRef<{ height: number; top: number } | null>(null);
    const messages = negotiation?.mensagens;
    const name = user?.name?.trim() || user?.email?.split("@")[0] || "Morador";

    const loadNegotiation = useCallback(async () => {
        if (!id || !user) return;
        initialScrollPositionedRef.current = false;
        pendingScrollAdjustmentRef.current = null;
        setOlderError("");
        setLoading(true);
        setError("");
        try {
            setNegotiation(await getRoomNegotiation(id));
        } catch (cause: unknown) {
            setError(errorText(cause));
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    const loadOlderMessages = useCallback(async () => {
        if (
            !id ||
            !negotiation?.hasMore ||
            !negotiation.nextCursor ||
            olderRequestInFlightRef.current
        ) {
            return;
        }

        const container = messagesContainerRef.current;
        if (container) {
            pendingScrollAdjustmentRef.current = {
                height: container.scrollHeight,
                top: container.scrollTop,
            };
        }
        olderRequestInFlightRef.current = true;
        setLoadingOlder(true);
        setOlderError("");

        try {
            const olderPage = await getRoomNegotiation(id, {
                before: negotiation.nextCursor,
                limit: MESSAGE_PAGE_SIZE,
            });
            setNegotiation((current) => {
                if (!current) {
                    pendingScrollAdjustmentRef.current = null;
                    return current;
                }
                const currentIds = new Set(current.mensagens.map((item) => item.id));
                const olderMessages = olderPage.mensagens.filter(
                    (item) => !currentIds.has(item.id)
                );
                if (!olderMessages.length) pendingScrollAdjustmentRef.current = null;
                return {
                    ...current,
                    mensagens: [...olderMessages, ...current.mensagens],
                    hasMore: olderPage.hasMore,
                    nextCursor: olderPage.nextCursor,
                };
            });
        } catch (cause: unknown) {
            pendingScrollAdjustmentRef.current = null;
            setOlderError(errorText(cause, "Não foi possível carregar mensagens anteriores."));
        } finally {
            olderRequestInFlightRef.current = false;
            setLoadingOlder(false);
        }
    }, [id, negotiation]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            replace(`/login?returnTo=${encodeURIComponent(`/rooms/negotiations/${id}`)}`);
            return;
        }
        // Load the private conversation when its route and session are ready.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadNegotiation();
    }, [authLoading, id, loadNegotiation, replace, user]);

    useLayoutEffect(() => {
        const container = messagesContainerRef.current;
        if (!container || !messages) return;

        const pendingAdjustment = pendingScrollAdjustmentRef.current;
        if (pendingAdjustment) {
            container.scrollTop =
                pendingAdjustment.top + (container.scrollHeight - pendingAdjustment.height);
            pendingScrollAdjustmentRef.current = null;
            return;
        }
        if (!initialScrollPositionedRef.current) {
            container.scrollTop = container.scrollHeight;
            initialScrollPositionedRef.current = true;
            return;
        }
        container.scrollTop = container.scrollHeight;
    }, [messages]);

    function handleMessagesScroll() {
        const container = messagesContainerRef.current;
        if (container && container.scrollTop <= OLDER_MESSAGES_THRESHOLD && negotiation?.hasMore) {
            void loadOlderMessages();
        }
    }

    async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!message.trim()) return;
        setSending(true);
        setError("");
        setNotice("");
        try {
            const sent = await sendRoomNegotiationMessage(id, message);
            setNegotiation((current) =>
                current ? { ...current, mensagens: [...current.mensagens, sent] } : current
            );
            setMessage("");
        } catch (cause: unknown) {
            setError(errorText(cause));
        } finally {
            setSending(false);
        }
    }

    async function sendInvitation() {
        setSendingInvitation(true);
        setError("");
        setNotice("");
        try {
            const invitation = await sendRoomInvitation(id);
            const expiry = new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
            }).format(new Date(invitation.expiraEm));
            setNotice(`Convite enviado. Ele expira em ${expiry}.`);
        } catch (cause: unknown) {
            setError(errorText(cause));
        } finally {
            setSendingInvitation(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#f7f8fa] text-[#24232a] md:flex md:h-screen md:overflow-hidden">
            <div className="md:sticky md:top-0 md:h-screen md:shrink-0">
                <AppSidebar activeSection="rooms" />
            </div>
            <div className="min-w-0 flex-1 md:flex md:h-screen md:min-h-0 md:flex-col md:overflow-hidden">
                <AppPageHeader
                    greetingName={name}
                    subtitle="Negociação de quarto"
                    settingsHref="/settings"
                    profile={
                        <Link
                            href="/profile"
                            aria-label="Perfil"
                            className="grid size-10 place-items-center rounded-full bg-[#4f7f63] font-semibold text-white"
                        >
                            {name.slice(0, 1).toUpperCase()}
                        </Link>
                    }
                />
                <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col p-5 md:overflow-hidden md:p-8">
                    <Link href="/rooms" className="text-sm text-[#315f35] underline">
                        Voltar para quartos
                    </Link>
                    {loading ? (
                        <p role="status" className="py-12 text-center text-sm">
                            Carregando conversa...
                        </p>
                    ) : error && !negotiation ? (
                        <p
                            role="alert"
                            className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
                        >
                            {error}
                        </p>
                    ) : negotiation ? (
                        <>
                            <header className="my-5 shrink-0 rounded-xl border bg-white p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h1 className="text-xl font-bold">
                                            {negotiation.anuncio.titulo}
                                        </h1>
                                        <p className="mt-1 text-sm text-[#77717c]">
                                            {negotiation.anuncio.cidade}
                                            {negotiation.anuncio.bairro
                                                ? `, ${negotiation.anuncio.bairro}`
                                                : ""}
                                        </p>
                                        <p className="mt-2 text-sm">
                                            R${" "}
                                            {negotiation.anuncio.preco.toLocaleString("pt-BR", {
                                                minimumFractionDigits: 2,
                                            })}
                                            /mês
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void loadNegotiation()}
                                        className="rounded border px-3 py-2 text-sm"
                                    >
                                        Atualizar conversa
                                    </button>
                                </div>
                                {negotiation.podeConvidar && (
                                    <button
                                        type="button"
                                        disabled={sendingInvitation}
                                        onClick={() => void sendInvitation()}
                                        className="mt-4 rounded-lg bg-[#2f6034] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                    >
                                        {sendingInvitation
                                            ? "Enviando..."
                                            : "Enviar convite para a casa"}
                                    </button>
                                )}
                            </header>
                            {notice && (
                                <p
                                    role="status"
                                    className="mb-3 shrink-0 rounded-lg bg-green-50 p-3 text-sm text-green-800"
                                >
                                    {notice}
                                </p>
                            )}
                            {error && (
                                <p
                                    role="alert"
                                    className="mb-3 shrink-0 rounded-lg bg-red-50 p-3 text-sm text-red-800"
                                >
                                    {error}
                                </p>
                            )}
                            <section
                                aria-label="Mensagens da negociação"
                                className="mb-4 flex h-[55vh] min-h-56 flex-col gap-3 rounded-xl border bg-white p-4 md:min-h-0 md:flex-1"
                            >
                                {negotiation.hasMore && (
                                    <div className="shrink-0">
                                        <button
                                            type="button"
                                            disabled={loadingOlder}
                                            onClick={() => void loadOlderMessages()}
                                            className="rounded border px-3 py-2 text-sm disabled:opacity-60"
                                        >
                                            {loadingOlder
                                                ? "Carregando mensagens..."
                                                : olderError
                                                  ? "Tentar novamente"
                                                  : "Carregar mensagens anteriores"}
                                        </button>
                                        {olderError && (
                                            <p role="alert" className="mt-2 text-sm text-red-800">
                                                {olderError}
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div
                                    ref={messagesContainerRef}
                                    role="region"
                                    aria-label="Histórico de mensagens"
                                    tabIndex={0}
                                    onScroll={handleMessagesScroll}
                                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4e812f]"
                                >
                                    {negotiation.mensagens.length ? (
                                        negotiation.mensagens.map((item) => (
                                            <article
                                                key={item.id}
                                                className="mb-3 rounded-lg bg-[#f5f4f6] p-3 last:mb-0"
                                            >
                                                <div className="flex justify-between gap-3 text-xs text-[#77717c]">
                                                    <span className="font-semibold">
                                                        {item.autorNome}
                                                    </span>
                                                    <time dateTime={item.enviadaEm}>
                                                        {new Intl.DateTimeFormat("pt-BR", {
                                                            dateStyle: "short",
                                                            timeStyle: "short",
                                                        }).format(new Date(item.enviadaEm))}
                                                    </time>
                                                </div>
                                                <p className="mt-1 whitespace-pre-wrap text-sm">
                                                    {item.conteudo}
                                                </p>
                                            </article>
                                        ))
                                    ) : (
                                        <p className="grid h-full place-items-center text-center text-sm text-[#77717c]">
                                            A conversa começou. Combine os detalhes antes de
                                            decidir.
                                        </p>
                                    )}
                                </div>
                            </section>
                            <form
                                onSubmit={(event) => void sendMessage(event)}
                                className="grid shrink-0 gap-2"
                            >
                                <label
                                    htmlFor="negotiation-message"
                                    className="text-sm font-semibold"
                                >
                                    Sua mensagem
                                </label>
                                <textarea
                                    id="negotiation-message"
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    maxLength={2000}
                                    required
                                    rows={3}
                                    className="rounded-lg border bg-white p-3 text-sm outline-none focus:border-[#4e812f]"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !message.trim()}
                                    className="justify-self-end rounded-lg bg-[#2f6034] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                >
                                    {sending ? "Enviando..." : "Enviar mensagem"}
                                </button>
                            </form>
                        </>
                    ) : null}
                </main>
            </div>
        </div>
    );
}
