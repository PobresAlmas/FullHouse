"use client";

import Link from "next/link";
import { useCallback, useContext, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
    getNotifications,
    markNotificationRead,
    subscribeNotifications,
} from "../api/notifications.api";
import type { AppNotification } from "../api/notifications.api";
import { respondToRoomInvitation } from "@/features/rooms/api/rooms.api";
import { announceResidenceMembershipChanged } from "@/features/residences/api/residences.api";
import { AuthContext } from "@/providers/AuthProvider";

function errorText(error: unknown) {
    return typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "Não foi possível carregar as notificações.";
}

export function NotificationBell() {
    const auth = useContext(AuthContext);
    const userId = auth?.user?.id;
    const [notificationState, setNotificationState] = useState<{
        userId: string;
        items: AppNotification[];
        unreadCount: number;
    } | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const notifications =
        notificationState && notificationState.userId === userId ? notificationState.items : [];
    const unreadCount =
        notificationState && notificationState.userId === userId
            ? notificationState.unreadCount
            : 0;

    const refresh = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError("");
        try {
            setNotificationState({ userId, ...(await getNotifications()) });
        } catch (cause: unknown) {
            setError(errorText(cause));
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        let active = true;
        void getNotifications()
            .then((result) => {
                if (active) setNotificationState({ userId, ...result });
            })
            .catch((cause: unknown) => {
                if (active) setError(errorText(cause));
            });
        const unsubscribe = subscribeNotifications(
            (result) => {
                if (active) setNotificationState({ userId, ...result });
            },
            () => {
                if (active)
                    setError("A atualização em tempo real está temporariamente indisponível.");
            }
        );
        return () => {
            active = false;
            unsubscribe();
        };
    }, [userId]);

    async function markRead(notificationId: string) {
        try {
            await markNotificationRead(notificationId);
            setNotificationState((current) => {
                if (!current || current.userId !== userId) return current;
                const wasUnread = current.items.some(
                    (item) => item.id === notificationId && !item.lida
                );
                return {
                    ...current,
                    unreadCount: Math.max(0, current.unreadCount - Number(wasUnread)),
                    items: current.items.map((item) =>
                        item.id === notificationId ? { ...item, lida: true } : item
                    ),
                };
            });
        } catch (cause: unknown) {
            setError(errorText(cause));
        }
    }

    async function respond(notification: AppNotification, status: "ACEITO" | "RECUSADO") {
        if (!notification.convite?.podeResponder) return;
        setError("");
        try {
            await respondToRoomInvitation(notification.convite.id, status);
            if (status === "ACEITO") announceResidenceMembershipChanged();
            setNotificationState((current) => {
                if (!current || current.userId !== userId) return current;
                const wasUnread = current.items.some(
                    (item) => item.id === notification.id && !item.lida
                );
                return {
                    ...current,
                    unreadCount: Math.max(0, current.unreadCount - Number(wasUnread)),
                    items: current.items.map((item) =>
                        item.id === notification.id
                            ? {
                                  ...item,
                                  lida: true,
                                  convite: item.convite
                                      ? { ...item.convite, status, podeResponder: false }
                                      : null,
                              }
                            : item
                    ),
                };
            });
            await markNotificationRead(notification.id);
            await refresh();
        } catch (cause: unknown) {
            setError(errorText(cause));
        }
    }

    if (!userId) {
        return (
            <span
                aria-label="Notificações"
                className="grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"
            >
                <Bell size={19} />
            </span>
        );
    }

    return (
        <div className="relative">
            <button
                type="button"
                aria-label="Notificações"
                aria-expanded={open}
                onClick={() => {
                    const nextOpen = !open;
                    setOpen(nextOpen);
                    if (nextOpen) void refresh();
                }}
                className="relative grid size-10 place-items-center rounded-full border border-[#d8d1da] bg-white"
            >
                <Bell size={19} />
                {unreadCount > 0 && (
                    <span
                        aria-label={`${unreadCount} notificações não lidas`}
                        aria-live="polite"
                        className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#a33232] px-1 text-[10px] font-bold text-white"
                    >
                        {unreadCount}
                    </span>
                )}
            </button>
            {open && (
                <section
                    role="dialog"
                    aria-label="Notificações"
                    className="absolute right-0 z-30 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[#d8d1da] bg-white p-3 shadow-xl"
                >
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="font-semibold">Notificações</h2>
                        <button
                            type="button"
                            onClick={() => void refresh()}
                            className="text-xs text-[#315f35] underline"
                        >
                            Atualizar
                        </button>
                    </div>
                    {error && (
                        <p role="alert" className="mb-2 rounded bg-red-50 p-2 text-xs text-red-800">
                            {error}
                        </p>
                    )}
                    {loading ? (
                        <p role="status" className="py-4 text-center text-sm text-[#77717c]">
                            Carregando...
                        </p>
                    ) : notifications.length === 0 ? (
                        <p className="py-4 text-center text-sm text-[#77717c]">
                            Nenhuma notificação.
                        </p>
                    ) : (
                        <ul className="grid gap-2">
                            {notifications.map((notification) => (
                                <li
                                    key={notification.id}
                                    className={`rounded-lg border p-3 ${notification.lida ? "bg-white" : "bg-[#f3f8f2]"}`}
                                >
                                    {notification.negotiationId ? (
                                        <Link
                                            href={`/rooms/negotiations/${notification.negotiationId}`}
                                            onClick={() => void markRead(notification.id)}
                                            className="font-semibold hover:underline"
                                        >
                                            {notification.titulo}
                                        </Link>
                                    ) : (
                                        <p className="font-semibold">{notification.titulo}</p>
                                    )}
                                    {notification.mensagem && (
                                        <p className="mt-1 text-sm text-[#625c66]">
                                            {notification.mensagem}
                                        </p>
                                    )}
                                    {notification.convite?.podeResponder && (
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void respond(notification, "ACEITO")}
                                                className="rounded bg-[#2f6034] px-3 py-1.5 text-xs font-semibold text-white"
                                            >
                                                Aceitar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void respond(notification, "RECUSADO")
                                                }
                                                className="rounded border px-3 py-1.5 text-xs"
                                            >
                                                Recusar
                                            </button>
                                        </div>
                                    )}
                                    {!notification.lida && (
                                        <button
                                            type="button"
                                            onClick={() => void markRead(notification.id)}
                                            className="mt-2 block text-xs text-[#315f35] underline"
                                        >
                                            Marcar como lida
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </div>
    );
}
