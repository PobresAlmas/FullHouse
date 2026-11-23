"use client";

import { FormEvent, Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    createChatEventSource,
    getChat,
    getChatMessages,
    markChatRead,
    sendChatMessage,
    type ChatMessage,
} from "@/features/house-collaboration/api/chat.api";
import { ResidenceSelector } from "@/features/house-collaboration/components/ResidenceSelector";
import { getResidences, type Residence } from "@/features/residences/api/residences.api";

export default function ChatPage() {
    const { user } = useAuth();
    const [residences, setResidences] = useState<Residence[]>([]);
    const [residenceId, setResidenceId] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState("");
    const [connected, setConnected] = useState(false);
    const [busy, setBusy] = useState(false);
    const [unreadStartIndex, setUnreadStartIndex] = useState<number | null>(null);
    const lastMessageId = useRef("");
    const readMessageId = useRef("");
    const messagesContainer = useRef<HTMLDivElement>(null);
    const unreadMessageElement = useRef<HTMLElement | null>(null);
    const initialPositionPending = useRef(false);
    const stickToBottom = useRef(true);
    const appendMessages = useCallback((incoming: ChatMessage[]) => {
        setMessages((current) => {
            const byId = new Map(current.map((item) => [item.id, item]));
            for (const item of incoming) byId.set(item.id, item);
            const sorted = [...byId.values()].sort(
                (a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id)
            );
            lastMessageId.current = sorted.at(-1)?.id ?? lastMessageId.current;
            return sorted;
        });
    }, []);
    const markLatestRead = useCallback(async () => {
        const messageId = lastMessageId.current;
        if (!residenceId || !messageId || readMessageId.current === messageId) return;
        try {
            await markChatRead(residenceId, messageId);
            readMessageId.current = messageId;
            setUnreadStartIndex(null);
        } catch {
            readMessageId.current = "";
        }
    }, [residenceId]);

    useEffect(() => {
        let active = true;
        void getResidences()
            .then((items) => {
                if (!active) return;
                setResidences(items);
                setResidenceId(items[0]?.id ?? "");
            })
            .catch(() => setError("Não foi possível carregar suas residências."));
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!residenceId) return;
        let active = true;
        let eventSource: EventSource | null = null;
        lastMessageId.current = "";
        readMessageId.current = "";
        void getChat(residenceId)
            .then((chat) => {
                if (!active) return;
                const memberId = residences.find((item) => item.id === residenceId)?.membership?.id;
                const lastReadIndex = chat.lastReadMessageId
                    ? chat.messages.findIndex((message) => message.id === chat.lastReadMessageId)
                    : -1;
                const firstUnreadIndex = chat.messages.findIndex(
                    (message, index) =>
                        index > lastReadIndex && !!memberId && message.author.memberId !== memberId
                );
                setUnreadStartIndex(firstUnreadIndex >= 0 ? firstUnreadIndex : null);
                initialPositionPending.current = true;
                appendMessages(chat.messages);
            })
            .catch(() => {
                if (active) setError("Não foi possível carregar o chat desta residência.");
            });
        eventSource = createChatEventSource(residenceId);
        eventSource.onopen = () => {
            if (!active) return;
            setConnected(true);
            const afterId = lastMessageId.current || undefined;
            void getChatMessages(residenceId, afterId).then((items) => {
                if (active) appendMessages(items);
            });
        };
        eventSource.onerror = () => {
            if (active) setConnected(false);
        };
        eventSource.onmessage = (event) => {
            if (!active) return;
            try {
                appendMessages([JSON.parse(event.data) as ChatMessage]);
            } catch {
                setError("Uma mensagem recebida não pôde ser exibida.");
            }
        };
        return () => {
            active = false;
            eventSource?.close();
        };
    }, [residenceId, residences, appendMessages]);

    useEffect(() => {
        const container = messagesContainer.current;
        if (!container || messages.length === 0) return;
        const frame = window.requestAnimationFrame(() => {
            if (initialPositionPending.current) {
                const unreadMessage = unreadMessageElement.current;
                container.scrollTop = unreadMessage
                    ? unreadMessage.offsetTop - container.offsetTop - 12
                    : container.scrollHeight;
                initialPositionPending.current = false;
                const atBottom =
                    container.scrollHeight - container.scrollTop - container.clientHeight < 24;
                stickToBottom.current = atBottom;
                if (atBottom) void markLatestRead();
            } else if (stickToBottom.current) {
                container.scrollTop = container.scrollHeight;
                void markLatestRead();
            }
        });
        return () => window.cancelAnimationFrame(frame);
    }, [messages, unreadStartIndex, markLatestRead]);

    function handleMessagesScroll() {
        const container = messagesContainer.current;
        if (!container) return;
        stickToBottom.current =
            container.scrollHeight - container.scrollTop - container.clientHeight < 24;
        if (stickToBottom.current) void markLatestRead();
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!residenceId || !draft.trim() || busy) return;
        setBusy(true);
        setError("");
        try {
            appendMessages([await sendChatMessage(residenceId, draft)]);
            setDraft("");
        } catch {
            setError("Não foi possível enviar a mensagem. Tente novamente.");
        } finally {
            setBusy(false);
        }
    }

    function changeResidence(id: string) {
        lastMessageId.current = "";
        setMessages([]);
        setUnreadStartIndex(null);
        setConnected(false);
        setError("");
        readMessageId.current = "";
        initialPositionPending.current = false;
        stickToBottom.current = true;
        setResidenceId(id);
    }

    return (
        <div className="h-[calc(100dvh-72px)] overflow-hidden bg-[#f6f3f7] md:flex">
            <AppSidebar
                activeSection="chat"
                residenceName={residences.find((item) => item.id === residenceId)?.name}
            />
            <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pb-3 pt-3 md:px-8">
                <AppPageHeader
                    greetingName={user?.name ?? "Morador"}
                    residenceName={residences.find((item) => item.id === residenceId)?.name}
                    subtitle="Converse com os moradores da residência."
                    residenceControl={
                        <ResidenceSelector
                            residences={residences}
                            value={residenceId}
                            onChange={changeResidence}
                        />
                    }
                />
                <div className="mb-3 flex shrink-0 items-center justify-between">
                    <h1 className="text-xl font-bold">Chat da casa</h1>
                    <span
                        role="status"
                        className="inline-flex items-center gap-2 text-sm text-slate-600"
                    >
                        <span
                            className={`size-2 rounded-full ${connected ? "bg-green-500" : "bg-amber-400"}`}
                        />
                        {connected ? "Conectado" : "Reconectando…"}
                    </span>
                </div>
                {error && (
                    <p role="alert" className="mb-3 text-sm text-red-700">
                        {error}
                    </p>
                )}
                <section
                    aria-label="Mensagens"
                    className="flex min-h-0 flex-1 flex-col rounded-xl border border-[#ded6e1] bg-white p-3 shadow-sm sm:p-4"
                >
                    <div
                        ref={messagesContainer}
                        onScroll={handleMessagesScroll}
                        className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
                    >
                        {messages.length === 0 && (
                            <p className="text-sm text-slate-500">
                                Ainda não há mensagens nesta conversa.
                            </p>
                        )}
                        {messages.map((message, index) => {
                            const messageDate = new Date(message.sentAt);
                            const dateKey = messageDate.toLocaleDateString("pt-BR");
                            const previousDate = messages[index - 1]
                                ? new Date(messages[index - 1].sentAt).toLocaleDateString("pt-BR")
                                : null;
                            const isUnread = unreadStartIndex !== null && index >= unreadStartIndex;
                            return (
                                <Fragment key={message.id}>
                                    {dateKey !== previousDate && (
                                        <div
                                            className="flex items-center gap-3 py-1.5"
                                            role="separator"
                                        >
                                            <span className="h-px flex-1 bg-[#e7e0e9]" />
                                            <time
                                                dateTime={messageDate.toISOString()}
                                                className="text-[11px] font-medium capitalize text-[#77717c]"
                                            >
                                                {messageDate.toLocaleDateString("pt-BR", {
                                                    weekday: "long",
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                })}
                                            </time>
                                            <span className="h-px flex-1 bg-[#e7e0e9]" />
                                        </div>
                                    )}
                                    {index === unreadStartIndex && (
                                        <div
                                            role="separator"
                                            aria-label="Mensagens não lidas"
                                            className="flex items-center gap-3 py-1"
                                        >
                                            <span className="h-px flex-1 bg-[#5b8d42]" />
                                            <span className="rounded-full bg-[#edf5e9] px-3 py-1 text-[11px] font-semibold text-[#416b30]">
                                                Não lidas
                                            </span>
                                            <span className="h-px flex-1 bg-[#5b8d42]" />
                                        </div>
                                    )}
                                    <article
                                        ref={
                                            index === unreadStartIndex
                                                ? unreadMessageElement
                                                : undefined
                                        }
                                        className={`rounded-xl border p-3 transition-colors ${isUnread ? "border-[#b9d5aa] bg-[#f0f7ec]" : "border-transparent bg-[#f7f5f8]"}`}
                                    >
                                        <div className="flex items-baseline justify-between gap-3">
                                            <strong className="text-sm">
                                                {message.author.name}
                                            </strong>
                                            <time className="text-[11px] text-slate-500">
                                                {messageDate.toLocaleTimeString("pt-BR", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </time>
                                        </div>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-[#29252d]">
                                            {message.content}
                                        </p>
                                    </article>
                                </Fragment>
                            );
                        })}
                    </div>
                    <form onSubmit={submit} className="mt-4 flex gap-2">
                        <input
                            aria-label="Mensagem"
                            className="min-w-0 flex-1 rounded-md border px-3 py-2"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            maxLength={4000}
                        />
                        <button
                            className="rounded-md bg-[#234a1b] px-4 py-2 font-semibold text-white disabled:opacity-50"
                            disabled={busy || !draft.trim()}
                        >
                            Enviar
                        </button>
                    </form>
                </section>
            </main>
        </div>
    );
}
