import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomsPage } from "../RoomsPage";
import {
    expressRoomInterest,
    getMyRoomInterests,
    getMyRoomListings,
    searchRoomListings,
} from "../../api/rooms.api";
import { getResidences } from "@/features/residences/api/residences.api";

const authState = vi.hoisted(() => ({
    user: null as { id: string; email: string; name?: string } | null,
    loading: false,
    push: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => authState }));
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: authState.push, replace: vi.fn() }),
}));
vi.mock("@/features/rooms/api/rooms.api", () => ({
    createRoomListing: vi.fn(),
    deleteRoomListing: vi.fn(),
    expressRoomInterest: vi.fn(),
    getMyRoomListings: vi.fn(),
    getMyRoomInterests: vi.fn(),
    getRoomInterests: vi.fn(),
    searchRoomListings: vi.fn(),
    updateRoomListing: vi.fn(),
    updateRoomInterest: vi.fn(),
    uploadRoomPhoto: vi.fn(),
}));
vi.mock("@/features/residences/api/residences.api", () => ({
    getResidences: vi.fn(),
    RESIDENCE_MEMBERSHIP_CHANGED_EVENT: "fullhouse:residence-membership-changed",
}));

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
        authState.user = null;
        authState.loading = false;
        vi.mocked(searchRoomListings).mockResolvedValue({
            data: [listing],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });
        vi.mocked(getResidences).mockResolvedValue([]);
        vi.mocked(getMyRoomListings).mockResolvedValue([]);
        vi.mocked(getMyRoomInterests).mockResolvedValue([]);
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

    it("hides public search from residents while keeping their own listings available", async () => {
        authState.user = { id: "resident-1", email: "resident@example.com" };
        vi.mocked(getResidences).mockResolvedValue([
            {
                id: "house-1",
                name: "Casa",
                city: null,
                neighborhood: null,
                status: "ATIVA",
                membership: { id: "member-1", role: "MORADOR" },
                creationEditPolicy: "TODOS",
            },
        ]);

        render(<RoomsPage />);

        expect(await screen.findByRole("tab", { name: "Meus anúncios" })).toBeInTheDocument();
        expect(screen.getByLabelText("Buscar por cidade ou bairro")).not.toBeVisible();
        expect(
            await screen.findByText(
                /A busca de quartos fica disponível para pessoas sem residência ativa/
            )
        ).toBeInTheDocument();
        expect(getMyRoomListings).toHaveBeenCalledWith("house-1");
        expect(searchRoomListings).not.toHaveBeenCalled();
    });

    it("switches from room search to residence listings after an accepted invitation", async () => {
        authState.user = { id: "seeker-1", email: "seeker@example.com" };
        vi.mocked(getResidences)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                {
                    id: "house-1",
                    name: "Casa",
                    city: null,
                    neighborhood: null,
                    status: "ATIVA",
                    membership: { id: "member-1", role: "MORADOR" },
                    creationEditPolicy: "TODOS",
                },
            ]);
        render(<RoomsPage />);

        expect(await screen.findByRole("tab", { name: "Todos os Quartos" })).toBeInTheDocument();
        window.dispatchEvent(new Event("fullhouse:residence-membership-changed"));

        expect(await screen.findByRole("tab", { name: "Meus anúncios" })).toBeInTheDocument();
        expect(screen.queryByRole("tab", { name: "Todos os Quartos" })).not.toBeInTheDocument();
        await waitFor(() => expect(getMyRoomListings).toHaveBeenCalledWith("house-1"));
    });

    it("does not allow search when active residence lookup fails", async () => {
        authState.user = { id: "resident-1", email: "resident@example.com" };
        vi.mocked(getResidences).mockRejectedValue(new Error("Residências indisponíveis"));

        render(<RoomsPage />);

        expect(await screen.findByRole("alert")).toHaveTextContent("Residências indisponíveis");
        expect(screen.getByLabelText("Buscar por cidade ou bairro")).not.toBeVisible();
        expect(searchRoomListings).not.toHaveBeenCalled();
    });

    it("opens the listing form in a dismissible modal", async () => {
        authState.user = { id: "resident-1", email: "resident@example.com" };
        vi.mocked(getResidences).mockResolvedValue([
            {
                id: "house-1",
                name: "Casa",
                city: "Quixadá",
                neighborhood: "Centro",
                status: "ATIVA",
                membership: { id: "member-1", role: "ADMINISTRADOR" },
                creationEditPolicy: "TODOS",
            },
        ]);
        render(<RoomsPage />);

        await screen.findByRole("tab", { name: "Meus anúncios" });
        fireEvent.click(screen.getByRole("button", { name: /Anunciar quarto/ }));

        const dialog = await screen.findByRole("dialog", { name: "Novo anúncio" });
        expect(dialog).toContainElement(screen.getByLabelText("Título"));
        expect(screen.getByRole("tablist", { name: "Categorias de quartos" })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Contato"), {
            target: { value: "85987654321" },
        });
        expect(screen.getByLabelText("Contato")).toHaveValue("(85) 98765-4321");

        fireEvent.keyDown(document, { key: "Escape" });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("shows only own listings for residents and hides publishing from non-managers", async () => {
        authState.user = { id: "resident-1", email: "resident@example.com" };
        vi.mocked(getResidences).mockResolvedValue([
            {
                id: "house-1",
                name: "Casa",
                city: null,
                neighborhood: null,
                status: "ATIVA",
                membership: { id: "member-1", role: "MORADOR" },
                creationEditPolicy: "TODOS",
            },
        ]);
        render(<RoomsPage />);

        expect(await screen.findByRole("tab", { name: "Meus anúncios" })).toBeInTheDocument();
        expect(screen.getAllByRole("tab")).toHaveLength(2);
        expect(screen.getByRole("tab", { name: "Meus interesses" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Anunciar quarto/ })).not.toBeInTheDocument();
        expect(screen.queryByRole("tab", { name: /Todos os quartos/i })).not.toBeInTheDocument();
    });

    it("does not offer publishing to users without a residence", async () => {
        authState.user = { id: "user-1", email: "user@example.com" };
        vi.mocked(getResidences).mockResolvedValue([]);
        render(<RoomsPage />);

        expect(await screen.findByRole("tab", { name: /Todos os quartos/i })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Anunciar quarto/ })).not.toBeInTheDocument();
    });

    it("shows submitted interests and opens accepted negotiations", async () => {
        authState.user = { id: "seeker-1", email: "seeker@example.com" };
        vi.mocked(getMyRoomInterests).mockResolvedValue([
            {
                id: "pending-1",
                status: "PENDENTE",
                mensagem: "Gostaria de saber mais.",
                negotiationId: null,
                anuncio: listing,
            },
            {
                id: "accepted-1",
                status: "ACEITO",
                mensagem: null,
                negotiationId: "negotiation-1",
                anuncio: { ...listing, id: "listing-accepted", titulo: "Quarto aceito" },
            },
            {
                id: "declined-1",
                status: "RECUSADO",
                mensagem: null,
                negotiationId: null,
                anuncio: { ...listing, id: "listing-declined", titulo: "Quarto recusado" },
            },
        ]);
        vi.mocked(getResidences).mockResolvedValue([]);

        render(<RoomsPage />);
        fireEvent.click(await screen.findByRole("tab", { name: "Meus interesses" }));

        await waitFor(() => expect(getMyRoomInterests).toHaveBeenCalled());
        expect(await screen.findByText(/Aguardando resposta/)).toBeInTheDocument();
        expect(screen.getByText(/Negociação aberta/)).toBeInTheDocument();
        expect(screen.getByText(/Estado: Recusado/)).toBeInTheDocument();
        expect(screen.getByText("Sua mensagem: Gostaria de saber mais.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Abrir conversa" }));
        expect(authState.push).toHaveBeenCalledWith("/rooms/negotiations/negotiation-1");
    });

    it("shows an accepted interest on its listing and links directly to the conversation", async () => {
        authState.user = { id: "seeker-1", email: "seeker@example.com" };
        vi.mocked(getResidences).mockResolvedValue([]);
        vi.mocked(getMyRoomInterests).mockResolvedValue([
            {
                id: "accepted-1",
                status: "ACEITO",
                mensagem: null,
                negotiationId: "negotiation-1",
                anuncio: listing,
            },
        ]);

        render(<RoomsPage />);

        expect(await screen.findByText("Interesse aceito · negociação aberta")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Abrir conversa" }));
        expect(authState.push).toHaveBeenCalledWith("/rooms/negotiations/negotiation-1");

        fireEvent.click(screen.getByRole("button", { name: "Ver Detalhes do Anúncio" }));
        const dialog = await screen.findByRole("dialog", { name: listing.titulo });
        expect(
            await within(dialog).findByText("Seu interesse foi aceito. A negociação está aberta.")
        ).toBeInTheDocument();
        expect(within(dialog).getByRole("button", { name: "Abrir conversa" })).toBeInTheDocument();
        expect(within(dialog).queryByRole("button", { name: "Tenho interesse" })).toBeNull();
    });

    it("updates the listing after sending an interest instead of returning to the interests tab", async () => {
        authState.user = { id: "seeker-1", email: "seeker@example.com" };
        vi.mocked(getResidences).mockResolvedValue([]);
        vi.mocked(getMyRoomInterests).mockResolvedValue([]);
        vi.mocked(expressRoomInterest).mockResolvedValue({
            id: "interest-1",
            anuncioId: listing.id,
            status: "PENDENTE",
        });

        render(<RoomsPage />);

        fireEvent.click(await screen.findByRole("button", { name: "Ver Detalhes do Anúncio" }));
        fireEvent.click(await screen.findByRole("button", { name: "Tenho interesse" }));

        expect(
            await screen.findByText("Interesse enviado · aguardando anunciante")
        ).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Todos os Quartos" })).toHaveAttribute(
            "aria-selected",
            "true"
        );
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
