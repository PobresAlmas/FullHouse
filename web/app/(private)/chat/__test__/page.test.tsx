import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatPage from "../page";
import {
    createChatEventSource,
    getChat,
    getChatMessages,
    sendChatMessage,
} from "@/features/house-collaboration/api/chat.api";
import { getResidences } from "@/features/residences/api/residences.api";
import { createResidenceFixture } from "@/test/fixtures/residence";

vi.mock("@/features/house-collaboration/api/chat.api", () => ({
    createChatEventSource: vi.fn(),
    getChat: vi.fn(),
    getChatMessages: vi.fn(),
    sendChatMessage: vi.fn(),
}));
vi.mock("@/features/residences/api/residences.api", () => ({ getResidences: vi.fn() }));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => ({ user: { name: "Ana" } }) }));

const residence = createResidenceFixture();
const message = {
    id: "m1",
    content: "Vamos conversar",
    sentAt: "2026-11-01T10:00:00.000Z",
    author: { memberId: "member-1", name: "Ana" },
};
const eventSource = {
    onopen: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    close: vi.fn(),
};

describe("ChatPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(eventSource, { onopen: null, onerror: null, onmessage: null });
        vi.mocked(getResidences).mockResolvedValue([residence]);
        vi.mocked(getChat).mockResolvedValue({
            id: "conversation-1",
            residenceId: residence.id,
            messages: [message],
        });
        vi.mocked(getChatMessages).mockResolvedValue([]);
        vi.mocked(sendChatMessage).mockResolvedValue({ ...message, id: "m2", content: "Olá" });
        vi.mocked(createChatEventSource).mockReturnValue(eventSource as unknown as EventSource);
    });

    it("shows history, reconnects by loading after last message, and appends live events", async () => {
        render(<ChatPage />);
        expect(await screen.findByText("Vamos conversar")).toBeInTheDocument();
        eventSource.onopen?.();
        await waitFor(() => expect(getChatMessages).toHaveBeenCalledWith(residence.id, "m1"));
        eventSource.onmessage?.({
            data: JSON.stringify({ ...message, id: "m2", content: "Cheguei" }),
        } as MessageEvent);
        expect(await screen.findByText("Cheguei")).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("Conectado");
    });

    it("sends non-empty messages and prevents an empty submission", async () => {
        const user = userEvent.setup();
        render(<ChatPage />);
        const send = await screen.findByRole("button", { name: "Enviar" });
        expect(send).toBeDisabled();
        await user.type(screen.getByRole("textbox", { name: "Mensagem" }), "Olá");
        await user.click(send);
        await waitFor(() => expect(sendChatMessage).toHaveBeenCalledWith(residence.id, "Olá"));
        expect(await screen.findByText("Olá")).toBeInTheDocument();
    });

    it("clears the previous home's messages when switching residence context", async () => {
        const user = userEvent.setup();
        const secondResidence = {
            ...residence,
            id: "00000000-0000-4000-8000-000000000099",
            name: "Outra casa",
        };
        vi.mocked(getResidences).mockResolvedValue([residence, secondResidence]);
        vi.mocked(getChat).mockImplementation(async (id) => ({
            id: `conversation-${id}`,
            residenceId: id,
            messages: [
                {
                    ...message,
                    id: `message-${id}`,
                    content:
                        id === residence.id
                            ? "Mensagem da primeira casa"
                            : "Mensagem da outra casa",
                },
            ],
        }));
        render(<ChatPage />);
        expect(await screen.findByText("Mensagem da primeira casa")).toBeInTheDocument();
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Residência" }),
            secondResidence.id
        );
        expect(await screen.findByText("Mensagem da outra casa")).toBeInTheDocument();
        expect(screen.queryByText("Mensagem da primeira casa")).not.toBeInTheDocument();
    });
});
