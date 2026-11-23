"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { respondToRoomInvitation } from "@/features/rooms/api/rooms.api";
import { enterInvitedResidence } from "@/features/rooms/enter-invited-residence";
import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    subscribeNotifications,
} from "../api/notifications.api";
import type { AppNotification, NotificationsResponse } from "../api/notifications.api";

const changeEvent = "fullhouse:notifications-changed";
const pageLimit = 20;
const emptyInbox: NotificationsResponse = { items: [], unreadCount: 0, nextCursor: null };

function errorText(error: unknown, fallback: string) {
    return typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : fallback;
}

export function useNotificationInbox(
    userId: string,
    refreshUser: () => Promise<void>,
    unreadOnly = false
) {
    const router = useRouter();
    const [inbox, setInbox] = useState<{ unreadOnly: boolean; data: NotificationsResponse }>();
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [busy, setBusy] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const request = useRef({ version: 0, pages: 1, appending: false });
    const actionInFlight = useRef(false);
    const mounted = useRef(false);
    const data = inbox?.unreadOnly === unreadOnly ? inbox.data : emptyInbox;

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const refresh = useCallback(
        async (quiet = false) => {
            const version = ++request.current.version;
            const pages = request.current.pages;
            request.current.appending = false;
            setLoadingMore(false);
            if (!quiet) {
                setLoading(true);
                setActionError("");
            }
            try {
                const firstPage = await getNotifications(pageLimit, undefined, unreadOnly);
                const items = [...firstPage.items];
                let nextCursor = firstPage.nextCursor;
                for (let page = 1; page < pages && nextCursor; page++) {
                    if (request.current.version !== version) return;
                    const nextPage = await getNotifications(pageLimit, nextCursor, unreadOnly);
                    items.push(...nextPage.items);
                    nextCursor = nextPage.nextCursor;
                }
                if (request.current.version !== version) return;
                setInbox({ unreadOnly, data: { ...firstPage, items, nextCursor } });
                setLoadError("");
            } catch (error) {
                if (request.current.version === version)
                    setLoadError(errorText(error, "Não foi possível carregar as notificações."));
            } finally {
                if (request.current.version === version) setLoading(false);
            }
        },
        [unreadOnly]
    );

    useEffect(() => {
        const currentRequest = request.current;
        currentRequest.pages = 1;
        let active = true;
        let streamSnapshot: string | undefined;
        queueMicrotask(() => {
            if (active) void refresh();
        });
        const unsubscribe = subscribeNotifications((update) => {
            const nextSnapshot = JSON.stringify(update);
            if (!active || currentRequest.appending || streamSnapshot === nextSnapshot) return;
            streamSnapshot = nextSnapshot;
            void refresh(true);
        });
        const sync = (event: Event) => {
            if ((event as CustomEvent<string>).detail === userId) void refresh(true);
        };
        window.addEventListener(changeEvent, sync);
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible" && !currentRequest.appending)
                void refresh(true);
        }, 30_000);
        return () => {
            active = false;
            currentRequest.version++;
            window.removeEventListener(changeEvent, sync);
            window.clearInterval(timer);
            unsubscribe();
        };
    }, [refresh, userId]);

    async function loadMore() {
        const cursor = data.nextCursor;
        if (!cursor || request.current.appending || loading) return;
        const version = ++request.current.version;
        request.current.appending = true;
        setLoadingMore(true);
        try {
            const page = await getNotifications(pageLimit, cursor, unreadOnly);
            if (request.current.version !== version) return;
            const ids = new Set(data.items.map((item) => item.id));
            const items = [...data.items, ...page.items.filter((item) => !ids.has(item.id))];
            request.current.pages++;
            setInbox({ unreadOnly, data: { ...page, items } });
            setLoadError("");
        } catch (error) {
            if (request.current.version === version)
                setLoadError(errorText(error, "Não foi possível carregar as notificações."));
        } finally {
            if (request.current.version === version) {
                request.current.appending = false;
                setLoadingMore(false);
            }
        }
    }

    async function mutate(action: () => Promise<unknown>) {
        if (actionInFlight.current) return;
        actionInFlight.current = true;
        setBusy(true);
        setActionError("");
        try {
            await action();
        } catch (error) {
            if (mounted.current)
                setActionError(errorText(error, "Não foi possível atualizar as notificações."));
        } finally {
            actionInFlight.current = false;
            window.dispatchEvent(new CustomEvent(changeEvent, { detail: userId }));
            if (mounted.current) setBusy(false);
        }
    }

    function markRead(notification: AppNotification) {
        if (!notification.lida) void mutate(() => markNotificationRead(notification.id));
    }

    function markAllRead() {
        void mutate(markAllNotificationsRead);
    }

    function respond(
        notification: AppNotification,
        status: "ACEITO" | "RECUSADO",
        onEnter?: () => void
    ) {
        const invite = notification.convite;
        if (!invite?.podeResponder) return;
        void mutate(async () => {
            const decision = await respondToRoomInvitation(invite.id, status);
            try {
                if (!notification.lida) await markNotificationRead(notification.id);
            } finally {
                if (decision.status === "ACEITO" && mounted.current) {
                    const entered = enterInvitedResidence(decision, refreshUser, () => {
                        onEnter?.();
                        router.replace("/");
                    });
                    if (!entered)
                        throw new Error("O servidor não confirmou sua participação na casa.");
                }
            }
        });
    }

    return {
        ...data,
        loading: loading || (inbox?.unreadOnly !== unreadOnly && !loadError),
        loadingMore,
        busy,
        error: actionError || loadError,
        refresh,
        loadMore,
        markRead,
        markAllRead,
        respond,
    };
}
