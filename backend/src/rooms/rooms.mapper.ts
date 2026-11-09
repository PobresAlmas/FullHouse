import type { anuncio_quarto } from "../generated/prisma/client.js";

export type RoomListingResponseDto = {
    id: string;
    titulo: string;
    descricao: string | null;
    preco: number;
    cidade: string;
    bairro: string | null;
    enderecoCompleto: string | null;
    exibeEnderecoCompleto: boolean;
    contato: string | null;
    exibeContato: boolean;
    perfilConvivencia: string | null;
    tipoMoradia: string;
    aceitaPets: boolean;
    fotos: string[];
    status: string;
    criadoEm: string;
    atualizadoEm: string;
};

export function toRoomListingResponse(
    listing: anuncio_quarto,
    revealPrivate = false
): RoomListingResponseDto {
    return {
        id: listing.id,
        titulo: listing.titulo,
        descricao: listing.descricao,
        preco: Number(listing.valor_mensal),
        cidade: listing.cidade,
        bairro: listing.bairro,
        enderecoCompleto:
            revealPrivate || listing.exibeEnderecoCompleto ? listing.enderecoCompleto : null,
        exibeEnderecoCompleto: listing.exibeEnderecoCompleto,
        contato: revealPrivate || listing.exibeContato ? listing.contato : null,
        exibeContato: listing.exibeContato,
        perfilConvivencia: listing.perfilConvivencia,
        tipoMoradia: listing.tipoMoradia,
        aceitaPets: listing.aceitaPets,
        fotos: listing.fotos,
        status: listing.status,
        criadoEm: listing.criadoEm.toISOString(),
        atualizadoEm: listing.atualizadoEm.toISOString(),
    };
}
