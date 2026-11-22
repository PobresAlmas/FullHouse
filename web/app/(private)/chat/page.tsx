"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    createChatEventSource,
    getChat,
    getChatMessages,
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
    const lastMessageId = useRef("");
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
        void getChat(residenceId)
            .then((chat) => {
                if (active) appendMessages(chat.messages);
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
    }, [residenceId, appendMessages]);

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
        setConnected(false);
        setError("");
        setResidenceId(id);
    }

    return (
        <div className="min-h-screen bg-[#f6f3f7] md:flex">
            <AppSidebar
                activeSection="chat"
                residenceName={residences.find((item) => item.id === residenceId)?.name}
            />
            <main className="min-w-0 flex-1 px-4 py-5 md:px-8">
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
                <h1 className="my-5 text-2xl font-bold">Chat da casa</h1>
                <div className="mb-4 flex items-center justify-end gap-3">
                    <span role="status" className="text-sm text-slate-600">
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
                    className="flex h-[65vh] flex-col rounded-xl border bg-white p-4"
                >
                    <div className="flex-1 space-y-3 overflow-y-auto">
                        {messages.length === 0 && (
                            <p className="text-sm text-slate-500">
                                Ainda não há mensagens nesta conversa.
                            </p>
                        )}
                        {messages.map((message) => (
                            <article key={message.id} className="rounded-lg bg-[#f7f5f8] p-3">
                                <div className="flex justify-between gap-3">
                                    <strong>{message.author.name}</strong>
                                    <time className="text-xs text-slate-500">
                                        {new Date(message.sentAt).toLocaleString("pt-BR")}
                                    </time>
                                </div>
                                <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                            </article>
                        ))}
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
