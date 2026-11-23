import type { AppNotification } from "./api/notifications.api";

export function roomInterestHref({ entidadeTipo, entidadeId }: AppNotification) {
    if (entidadeTipo === "INTERESSE_QUARTO" && entidadeId) {
        return `/settings?section=members&listingId=${encodeURIComponent(entidadeId)}#anuncios-da-casa`;
    }
}
