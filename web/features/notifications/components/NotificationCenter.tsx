"use client";

import { useState } from "react";
import { useNotificationInbox } from "../hooks/useNotificationInbox";
import { NotificationList } from "./NotificationList";

const buttonClass =
    "min-h-9 rounded-lg border border-border bg-card px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";
const filters = [
    { unreadOnly: false, label: "Visão geral" },
    { unreadOnly: true, label: "Não lidas" },
];

export function NotificationCenter({
    userId,
    refreshUser,
}: {
    userId: string;
    refreshUser: () => Promise<void>;
}) {
    const [unreadOnly, setUnreadOnly] = useState(false);
    const inbox = useNotificationInbox(userId, refreshUser, unreadOnly);

    return (
        <section
            aria-label="Central de notificações"
            className="rounded-xl border border-border bg-card p-5 text-card-foreground"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-semibold">Suas notificações</h2>
                    <p role="status" className="mt-1 text-xs text-muted-foreground">
                        {inbox.unreadCount} não lida(s)
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => void inbox.refresh()}
                        disabled={inbox.loading || inbox.busy}
                        className={buttonClass}
                    >
                        Atualizar
                    </button>
                    <button
                        type="button"
                        onClick={inbox.markAllRead}
                        disabled={inbox.unreadCount === 0 || inbox.busy}
                        className={buttonClass}
                    >
                        Marcar todas como lidas
                    </button>
                </div>
            </div>
            <div
                role="group"
                aria-label="Filtro de notificações"
                className="mb-4 mt-4 flex gap-5 border-b border-border"
            >
                {filters.map((filter) => (
                    <button
                        key={filter.label}
                        type="button"
                        aria-pressed={unreadOnly === filter.unreadOnly}
                        onClick={() => setUnreadOnly(filter.unreadOnly)}
                        className={`border-b-2 px-1 pb-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring ${unreadOnly === filter.unreadOnly ? "border-primary" : "border-transparent text-muted-foreground"}`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
            {inbox.error && (
                <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    {inbox.error}
                </p>
            )}
            {inbox.loading ? (
                <p role="status" className="py-3 text-sm text-muted-foreground">
                    Carregando notificações…
                </p>
            ) : inbox.items.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">
                    {unreadOnly
                        ? "Não há notificações não lidas."
                        : "Você ainda não tem notificações."}
                </p>
            ) : (
                <NotificationList
                    items={inbox.items}
                    busy={inbox.busy}
                    onRead={inbox.markRead}
                    onRespond={inbox.respond}
                />
            )}
            {inbox.nextCursor && !inbox.loading && (
                <button
                    type="button"
                    disabled={inbox.loadingMore || inbox.busy}
                    onClick={() => void inbox.loadMore()}
                    className={`mt-4 w-full ${buttonClass}`}
                >
                    {inbox.loadingMore ? "Carregando…" : "Carregar mais"}
                </button>
            )}
        </section>
    );
}
