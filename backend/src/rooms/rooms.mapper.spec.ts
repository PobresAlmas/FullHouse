import { describe, expect, it } from "vitest";
import type { anuncio_quarto } from "../generated/prisma/client.js";
import { toRoomListingResponse } from "./rooms.mapper.js";

const listing = {
    id: "listing-1",
    casa_id: "house-1",
    titulo: "Quarto individual",
    descricao: null,
    valor_mensal: { toString: () => "450.00" },
    cidade: "Quixadá",
    bairro: "Centro",
    status: "ABERTO",
    exibeEnderecoCompleto: false,
    endereco_referencia: null,
    enderecoCompleto: "Rua A, 123",
    contato: "(88) 99999-9999",
    exibeContato: false,
    perfilConvivencia: null,
    tipoMoradia: "QUARTO_INDIVIDUAL",
    aceitaPets: false,
    fotos: [],
    criadoEm: new Date("2026-11-09T12:00:00.000Z"),
    atualizadoEm: new Date("2026-11-09T12:00:00.000Z"),
    criado_por_participacao_id: "member-1",
} as unknown as anuncio_quarto;

describe("toRoomListingResponse", () => {
    it("masks address and contact independently when public visibility is disabled", () => {
        const response = toRoomListingResponse(listing);
        expect(response.enderecoCompleto).toBeNull();
        expect(response.contato).toBeNull();
    });

    it("returns each value only when its matching flag is enabled", () => {
        const response = toRoomListingResponse({
            ...listing,
            exibeEnderecoCompleto: true,
            exibeContato: false,
        });
        expect(response.enderecoCompleto).toBe("Rua A, 123");
        expect(response.contato).toBeNull();
    });

    it("masks both values when both visibility flags are off", () => {
        const response = toRoomListingResponse({
            ...listing,
            exibeEnderecoCompleto: false,
            exibeContato: false,
        });
        expect(response).toMatchObject({ enderecoCompleto: null, contato: null });
    });

    it("discloses both values only when both visibility flags are on", () => {
        const response = toRoomListingResponse({
            ...listing,
            exibeEnderecoCompleto: true,
            exibeContato: true,
        });
        expect(response).toMatchObject({
            enderecoCompleto: "Rua A, 123",
            contato: "(88) 99999-9999",
        });
    });

    it("allows the authenticated owner-management route to see saved values", () => {
        const response = toRoomListingResponse(listing, true);
        expect(response.enderecoCompleto).toBe("Rua A, 123");
        expect(response.contato).toBe("(88) 99999-9999");
    });
});
