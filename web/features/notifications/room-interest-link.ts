import type { AppNotification } from "./api/notifications.api";

export function notificationHref({ entidadeTipo, entidadeId, negotiationId }: AppNotification) {
    if (entidadeTipo === "INTERESSE_QUARTO" && entidadeId) {
        return `/settings?section=members&listingId=${encodeURIComponent(entidadeId)}#anuncios-da-casa`;
    }
    if (entidadeTipo === "REUNIAO") return "/meetings";
    if (entidadeTipo === "TROCA_TAREFA") return "/tasks";
    if (negotiationId) return `/rooms/negotiations/${encodeURIComponent(negotiationId)}`;
}
