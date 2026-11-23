import Link from "next/link";
import { useId } from "react";
import type { AppNotification } from "../api/notifications.api";
import { roomInterestHref } from "../room-interest-link";

const actionLinkClass =
    "rounded text-sm font-medium text-foreground underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

function notificationHref(notification: AppNotification) {
    const interest = roomInterestHref(notification);
    if (interest) return interest;
    if (notification.entidadeTipo === "REUNIAO") return "/meetings";
    if (notification.entidadeTipo === "TROCA_TAREFA") return "/tasks";
    if (notification.negotiationId)
        return `/rooms/negotiations/${encodeURIComponent(notification.negotiationId)}`;
}

type NotificationActions = {
    busy: boolean;
    onRead: (notification: AppNotification) => void;
    onRespond: (notification: AppNotification, status: "ACEITO" | "RECUSADO") => void;
    onOpen?: () => void;
};

function NotificationCard({
    notification,
    busy,
    onRead,
    onRespond,
    onOpen,
}: NotificationActions & { notification: AppNotification }) {
    const descriptionId = useId();
    const href = notificationHref(notification);
    const content = (
        <>
            <div className="flex flex-wrap items-start justify-between gap-1">
                <p className={notification.lida ? "font-medium" : "font-semibold"}>
                    {notification.titulo}
                </p>
                <span
                    className={
                        notification.lida
                            ? "rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            : "rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800"
                    }
                >
                    {notification.lida ? "Lida" : "Não lida"}
                </span>
            </div>
            {notification.mensagem && (
                <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                    {notification.mensagem}
                </p>
            )}
            <time
                className="mt-1 block text-xs text-muted-foreground"
                dateTime={notification.criadoEm}
            >
                {new Date(notification.criadoEm).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                })}
            </time>
        </>
    );

    return (
        <li
            className={`relative rounded-lg border p-3 text-sm text-card-foreground ${notification.lida ? "border-border bg-card" : "border-green-200 bg-green-50"}`}
        >
            {href ? (
                <Link
                    href={href}
                    aria-label={notification.titulo}
                    aria-describedby={notification.mensagem ? descriptionId : undefined}
                    onClick={() => {
                        onRead(notification);
                        onOpen?.();
                    }}
                    className="block hover:[&>div>p]:underline after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
                >
                    {content}
                </Link>
            ) : (
                content
            )}
            {(notification.convite?.podeResponder || !notification.lida) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    {notification.convite?.podeResponder && (
                        <>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onRespond(notification, "ACEITO")}
                                className="relative z-10 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                            >
                                Aceitar
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onRespond(notification, "RECUSADO")}
                                className="relative z-10 rounded-md border border-border bg-card px-3 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                            >
                                Recusar
                            </button>
                        </>
                    )}
                    {!notification.lida && (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onRead(notification)}
                            className={`relative z-10 ${actionLinkClass}`}
                        >
                            Marcar como lida
                        </button>
                    )}
                </div>
            )}
        </li>
    );
}

export function NotificationList({
    items,
    ...actions
}: NotificationActions & { items: AppNotification[] }) {
    return (
        <ul className="grid gap-2">
            {items.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} {...actions} />
            ))}
        </ul>
    );
}
