import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomsPage } from "../RoomsPage";
import { searchRoomListings } from "../../api/rooms.api";

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/features/rooms/api/rooms.api", () => ({
    createRoomListing: vi.fn(),
    deleteRoomListing: vi.fn(),
    expressRoomInterest: vi.fn(),
    getMyRoomListings: vi.fn(),
    getRoomInterests: vi.fn(),
    searchRoomListings: vi.fn(),
    updateRoomListing: vi.fn(),
    updateRoomInterest: vi.fn(),
    uploadRoomPhoto: vi.fn(),
}));
vi.mock("@/features/residences/api/residences.api", () => ({ getResidences: vi.fn() }));

const listing = {
    id: "listing-1",
    titulo: "Quarto perto do campus",
    descricao: "Quarto mobiliado",
    preco: 450,
    cidade: "Quixadá",
    bairro: "Centro",
    enderecoCompleto: null,
    exibeEnderecoCompleto: false,
    contato: null,
    exibeContato: false,
    perfilConvivencia: null,
    tipoMoradia: "QUARTO_INDIVIDUAL" as const,
    aceitaPets: true,
    fotos: [],
    status: "ABERTO" as const,
    criadoEm: "2026-11-09T12:00:00.000Z",
    atualizadoEm: "2026-11-09T12:00:00.000Z",
};

describe("RoomsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(searchRoomListings).mockResolvedValue({
            data: [listing],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });
    });

    it("renders API results and applies the contact/address privacy response", async () => {
        render(<RoomsPage />);
        expect(await screen.findByText("Quarto perto do campus")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Ver Detalhes do Anúncio" }));
        expect(screen.getByText("Contato: Oculto pelo anunciante")).toBeInTheDocument();
        expect(
            screen.getByText("Endereço: Compartilhado após autorização do anunciante")
        ).toBeInTheDocument();
    });

    it("submits location search and does not present a failed request as empty results", async () => {
        render(<RoomsPage />);
        await screen.findByText("Quarto perto do campus");
        fireEvent.change(screen.getByLabelText("Buscar por cidade ou bairro"), {
            target: { value: "Quixadá, Centro" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
        await waitFor(() =>
            expect(searchRoomListings).toHaveBeenLastCalledWith(
                expect.objectContaining({ cidade: "Quixadá", bairro: "Centro" })
            )
        );

        vi.mocked(searchRoomListings).mockRejectedValueOnce(new Error("API offline"));
        fireEvent.click(screen.getByRole("tab", { name: "Repúblicas" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("API offline");
        expect(screen.queryByText("Nenhum anúncio encontrado")).not.toBeInTheDocument();
    });
});
