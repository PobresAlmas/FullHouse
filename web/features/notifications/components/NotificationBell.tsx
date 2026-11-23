"use client";

import Link from "next/link";
import { useContext, useEffect, useId, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { AuthContext } from "@/providers/AuthProvider";
import { useNotificationInbox } from "../hooks/useNotificationInbox";
import { NotificationList } from "./NotificationList";

const bellButtonClass =
    "grid size-10 place-items-center rounded-full border border-border bg-card text-card-foreground";

export function NotificationBell() {
    const auth = useContext(AuthContext);
    if (!auth?.user) {
        return (
            <span aria-label="Notificações" className={bellButtonClass}>
                <Bell size={19} />
            </span>
        );
    }

    return (
        <SignedInNotificationBell
            key={auth.user.id}
            userId={auth.user.id}
            refreshUser={auth.refreshUser}
        />
    );
}

function SignedInNotificationBell({
    userId,
    refreshUser,
}: {
    userId: string;
    refreshUser: () => Promise<void>;
}) {
    const inbox = useNotificationInbox(userId, refreshUser);
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLElement>(null);
    const panelId = useId();

    useEffect(() => {
        if (!open) return;
        panel.current?.focus();
        const onOutside = (event: PointerEvent) => {
            if (event.target instanceof Node && !root.current?.contains(event.target))
                setOpen(false);
        };
        const onEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || event.defaultPrevented) return;
            event.preventDefault();
            setOpen(false);
            trigger.current?.focus();
        };
        document.addEventListener("pointerdown", onOutside);
        document.addEventListener("keydown", onEscape);
        return () => {
            document.removeEventListener("pointerdown", onOutside);
            document.removeEventListener("keydown", onEscape);
        };
    }, [open]);

    return (
        <div ref={root} className="md:relative">
            <button
                ref={trigger}
                type="button"
                aria-label="Notificações"
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                onClick={() => {
                    if (!open) void inbox.refresh(true);
                    setOpen(!open);
                }}
                className={`relative ${bellButtonClass} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
            >
                <Bell size={19} aria-hidden="true" />
                {inbox.unreadCount > 0 && (
                    <span
                        aria-label={`${inbox.unreadCount} notificações não lidas`}
                        aria-live="polite"
                        className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#a33232] px-1 text-[10px] font-bold text-white"
                    >
                        {inbox.unreadCount}
                    </span>
                )}
            </button>
            {open && (
                <section
                    ref={panel}
                    id={panelId}
                    role="dialog"
                    aria-label="Notificações"
                    tabIndex={-1}
                    className="absolute inset-x-4 top-full z-40 mt-2 max-h-[70dvh] overflow-y-auto rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl sm:left-auto sm:w-[22rem] md:right-0"
                >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-semibold">Notificações</h2>
                        <Link
                            href="/settings?section=notifications"
                            onClick={() => setOpen(false)}
                            className="rounded text-xs font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                            Ver todas
                        </Link>
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <button
                            type="button"
                            onClick={() => void inbox.refresh()}
                            disabled={inbox.loading || inbox.busy}
                            className="rounded text-xs underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                        >
                            Atualizar
                        </button>
                        <button
                            type="button"
                            disabled={inbox.unreadCount === 0 || inbox.busy}
                            onClick={inbox.markAllRead}
                            className="rounded text-xs font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                        >
                            Marcar todas como lidas
                        </button>
                    </div>
                    {inbox.error && (
                        <p role="alert" className="mb-2 rounded bg-red-50 p-2 text-xs text-red-800">
                            {inbox.error}
                        </p>
                    )}
                    {inbox.loading ? (
                        <p role="status" className="py-4 text-center text-sm text-muted-foreground">
                            Carregando...
                        </p>
                    ) : inbox.items.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                            Nenhuma notificação.
                        </p>
                    ) : (
                        <NotificationList
                            items={inbox.items}
                            busy={inbox.busy}
                            onRead={inbox.markRead}
                            onRespond={(item, status) =>
                                inbox.respond(item, status, () => setOpen(false))
                            }
                            onOpen={() => setOpen(false)}
                        />
                    )}
                </section>
            )}
        </div>
    );
}
