import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomNegotiationPage } from "../RoomNegotiationPage";
import {
    getRoomNegotiation,
    sendRoomInvitation,
    sendRoomNegotiationMessage,
} from "../../api/rooms.api";

const authState = vi.hoisted(() => ({
    user: { id: "owner-1", email: "owner@example.com", name: "Owner" },
    replace: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
    useAuth: () => ({ ...authState, loading: false }),
}));
vi.mock("next/navigation", () => ({
    useParams: () => ({ id: "negotiation-1" }),
    useRouter: () => ({ replace: authState.replace }),
}));
vi.mock("@/components/layout/AppPageHeader", () => ({ AppPageHeader: () => null }));
vi.mock("@/components/layout/AppSidebar", () => ({
    AppSidebar: () => <aside data-testid="app-sidebar" />,
}));
vi.mock("../../api/rooms.api", () => ({
    getRoomNegotiation: vi.fn(),
    sendRoomInvitation: vi.fn(),
    sendRoomNegotiationMessage: vi.fn(),
}));

const negotiation = {
    id: "negotiation-1",
    interestId: "interest-1",
    status: "ACEITO" as const,
    casaId: "house-1",
    podeConvidar: true,
    anuncio: {
        id: "listing-1",
        titulo: "Quarto perto do campus",
        descricao: null,
        preco: 450,
        cidade: "Quixadá",
        bairro: null,
        enderecoCompleto: null,
        exibeEnderecoCompleto: false,
        contato: null,
        exibeContato: false,
        perfilConvivencia: null,
        tipoMoradia: "QUARTO_INDIVIDUAL" as const,
        aceitaPets: false,
        fotos: [],
        status: "ABERTO" as const,
        criadoEm: "2026-11-09T12:00:00.000Z",
        atualizadoEm: "2026-11-09T12:00:00.000Z",
    },
    mensagens: [
        {
            id: "message-1",
            autorId: "seeker-1",
            autorNome: "Seeker",
            autorFotoUrl: null,
            conteudo: "Ainda está disponível?",
            enviadaEm: "2026-11-09T12:00:00.000Z",
        },
    ],
    hasMore: false,
    nextCursor: null,
};

describe("RoomNegotiationPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authState.user = { id: "owner-1", email: "owner@example.com", name: "Owner" };
        vi.mocked(getRoomNegotiation).mockResolvedValue(negotiation);
        vi.mocked(sendRoomInvitation).mockResolvedValue({
            id: "invitation-1",
            status: "PENDENTE",
            expiraEm: "2026-11-16T12:00:00.000Z",
        });
        vi.mocked(sendRoomNegotiationMessage).mockResolvedValue({
            id: "message-2",
            autorId: "owner-1",
            autorNome: "Owner",
            autorFotoUrl: null,
            conteudo: "Sim, está disponível.",
            enviadaEm: "2026-11-09T12:01:00.000Z",
        });
    });

    it("keeps the negotiation open for messages and offers invitations only when permitted", async () => {
        render(<RoomNegotiationPage />);

        expect(await screen.findByText("Ainda está disponível?")).toBeInTheDocument();
        expect(screen.getByTestId("app-sidebar").parentElement).toHaveClass("md:sticky");
        expect(screen.getByRole("region", { name: "Histórico de mensagens" })).toHaveClass(
            "overflow-y-auto"
        );
        fireEvent.change(screen.getByLabelText("Sua mensagem"), {
            target: { value: "Sim, está disponível." },
        });
        fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
        expect(await screen.findByText("Sim, está disponível.")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Enviar convite para a casa" }));
        await waitFor(() => expect(sendRoomInvitation).toHaveBeenCalledWith("negotiation-1"));
        expect(await screen.findByText(/Convite enviado/)).toBeInTheDocument();

        vi.mocked(getRoomNegotiation).mockResolvedValueOnce({
            ...negotiation,
            podeConvidar: false,
        });
        fireEvent.click(screen.getByRole("button", { name: "Atualizar conversa" }));
        await waitFor(() =>
            expect(
                screen.queryByRole("button", { name: "Enviar convite para a casa" })
            ).not.toBeInTheDocument()
        );
    });

    it("loads older messages at the top and preserves the visible scroll position", async () => {
        const initialPage = {
            ...negotiation,
            hasMore: true,
            nextCursor: "message-1",
        };
        const olderMessage = {
            id: "message-0",
            autorId: "owner-1",
            autorNome: "Owner",
            autorFotoUrl: null,
            conteudo: "Mensagem mais antiga.",
            enviadaEm: "2026-11-09T11:59:00.000Z",
        };
        vi.mocked(getRoomNegotiation)
            .mockResolvedValueOnce(initialPage)
            .mockResolvedValueOnce({
                ...initialPage,
                mensagens: [olderMessage],
                hasMore: false,
                nextCursor: null,
            });

        render(<RoomNegotiationPage />);

        const history = await screen.findByRole("region", { name: "Histórico de mensagens" });
        Object.defineProperty(history, "scrollHeight", {
            configurable: true,
            get: () => (screen.queryByText("Mensagem mais antiga.") ? 700 : 500),
        });
        history.scrollTop = 35;
        fireEvent.scroll(history, { target: { scrollTop: 35 } });

        expect(await screen.findByText("Mensagem mais antiga.")).toBeInTheDocument();
        expect(getRoomNegotiation).toHaveBeenLastCalledWith("negotiation-1", {
            before: "message-1",
            limit: 30,
        });
        expect(history.scrollTop).toBe(235);
        const messages = screen.getAllByRole("article");
        expect(messages[0]).toHaveTextContent("Mensagem mais antiga.");
        expect(messages[1]).toHaveTextContent("Ainda está disponível?");
    });

    it("offers a retry when loading older messages fails", async () => {
        vi.mocked(getRoomNegotiation)
            .mockResolvedValueOnce({ ...negotiation, hasMore: true, nextCursor: "message-1" })
            .mockRejectedValueOnce(new Error("Falha ao carregar página"))
            .mockResolvedValueOnce({
                ...negotiation,
                mensagens: [],
                hasMore: false,
                nextCursor: null,
            });

        render(<RoomNegotiationPage />);

        fireEvent.click(
            await screen.findByRole("button", { name: "Carregar mensagens anteriores" })
        );
        expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao carregar página");

        fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
        await waitFor(() => {
            expect(getRoomNegotiation).toHaveBeenLastCalledWith("negotiation-1", {
                before: "message-1",
                limit: 30,
            });
        });
    });
});
