import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/providers/AuthProvider";
import { NotificationBell } from "../NotificationBell";
import { getNotifications, markNotificationRead } from "../../api/notifications.api";
import { respondToRoomInvitation } from "@/features/rooms/api/rooms.api";
import { RESIDENCE_MEMBERSHIP_CHANGED_EVENT } from "@/features/residences/api/residences.api";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

vi.mock("../../api/notifications.api", () => ({
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    subscribeNotifications: vi.fn(() => () => undefined),
}));
vi.mock("@/features/rooms/api/rooms.api", () => ({
    respondToRoomInvitation: vi.fn(),
}));

const pendingInvite = {
    id: "notification-1",
    titulo: "Convite para morar na Casa",
    mensagem: "Acesse a negociação para responder.",
    lida: false,
    criadoEm: "2026-11-09T12:00:00.000Z",
    entidadeTipo: "CONVITE_CASA",
    entidadeId: "invitation-1",
    negotiationId: "negotiation-1",
    convite: {
        id: "invitation-1",
        status: "PENDENTE" as const,
        expiraEm: "2026-11-16T12:00:00.000Z",
        podeResponder: true,
    },
};

describe("NotificationBell", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        let answered = false;
        vi.mocked(getNotifications).mockImplementation(async () => ({
            items: [
                answered
                    ? {
                          ...pendingInvite,
                          lida: true,
                          convite: {
                              ...pendingInvite.convite,
                              status: "RECUSADO",
                              podeResponder: false,
                          },
                      }
                    : pendingInvite,
            ],
            unreadCount: answered ? 0 : 1,
        }));
        vi.mocked(respondToRoomInvitation).mockImplementation(async () => {
            answered = true;
            return { id: "invitation-1", status: "RECUSADO", membershipId: null };
        });
        vi.mocked(markNotificationRead).mockResolvedValue({
            id: "notification-1",
            lida: true,
        });
    });

    it("links a new room interest to the announcement in Moradores", async () => {
        vi.mocked(getNotifications).mockResolvedValue({
            items: [
                {
                    ...pendingInvite,
                    titulo: "Novo interesse em um quarto",
                    entidadeTipo: "INTERESSE_QUARTO",
                    entidadeId: "listing-1",
                    negotiationId: null,
                    convite: null,
                },
            ],
            unreadCount: 1,
        });
        render(
            <AuthContext.Provider
                value={{
                    user: { id: "author-1", email: "owner@example.com" },
                    loading: false,
                    logout: async () => undefined,
                    refreshUser: async () => undefined,
                }}
            >
                <NotificationBell />
            </AuthContext.Provider>
        );
        expect(await screen.findByLabelText("1 notificações não lidas")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Notificações" }));
        expect(
            await screen.findByRole("link", { name: "Novo interesse em um quarto" })
        ).toHaveAttribute("href", "/settings?section=members&listingId=listing-1#anuncios-da-casa");
    });

    it("provides invite actions and removes them after the recipient responds", async () => {
        const membershipChanged = vi.fn();
        window.addEventListener(RESIDENCE_MEMBERSHIP_CHANGED_EVENT, membershipChanged);
        render(
            <AuthContext.Provider
                value={{
                    user: { id: "seeker-1", email: "seeker@example.com" },
                    loading: false,
                    logout: async () => undefined,
                    refreshUser: async () => undefined,
                }}
            >
                <NotificationBell />
            </AuthContext.Provider>
        );

        expect(await screen.findByLabelText("1 notificações não lidas")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Notificações" }));
        fireEvent.click(await screen.findByRole("button", { name: "Recusar" }));

        await waitFor(() =>
            expect(respondToRoomInvitation).toHaveBeenCalledWith("invitation-1", "RECUSADO")
        );
        expect(markNotificationRead).toHaveBeenCalledWith("notification-1");
        expect(router.replace).not.toHaveBeenCalled();
        await waitFor(() =>
            expect(screen.queryByRole("button", { name: "Recusar" })).not.toBeInTheDocument()
        );
        expect(membershipChanged).not.toHaveBeenCalled();
        window.removeEventListener(RESIDENCE_MEMBERSHIP_CHANGED_EVENT, membershipChanged);
    });

    it("announces a residence membership change after accepting an invitation", async () => {
        const membershipChanged = vi.fn();
        const refreshUser = vi.fn(async () => undefined);
        window.addEventListener(RESIDENCE_MEMBERSHIP_CHANGED_EVENT, membershipChanged);
        vi.mocked(respondToRoomInvitation).mockResolvedValue({
            id: "invitation-1",
            status: "ACEITO",
            membershipId: "membership-1",
        });

        render(
            <AuthContext.Provider
                value={{
                    user: { id: "seeker-1", email: "seeker@example.com" },
                    loading: false,
                    logout: async () => undefined,
                    refreshUser,
                }}
            >
                <NotificationBell />
            </AuthContext.Provider>
        );

        fireEvent.click(await screen.findByRole("button", { name: "Notificações" }));
        fireEvent.click(await screen.findByRole("button", { name: "Aceitar" }));

        await waitFor(() => expect(membershipChanged).toHaveBeenCalledOnce());
        expect(respondToRoomInvitation).toHaveBeenCalledWith("invitation-1", "ACEITO");
        expect(refreshUser).toHaveBeenCalledOnce();
        expect(router.replace).toHaveBeenCalledWith("/");
        window.removeEventListener(RESIDENCE_MEMBERSHIP_CHANGED_EVENT, membershipChanged);
    });

    it("uses the unread total even when only a few recent notifications are returned", async () => {
        vi.mocked(getNotifications).mockResolvedValue({
            items: [pendingInvite],
            unreadCount: 12,
        });

        render(
            <AuthContext.Provider
                value={{
                    user: { id: "seeker-1", email: "seeker@example.com" },
                    loading: false,
                    logout: async () => undefined,
                    refreshUser: async () => undefined,
                }}
            >
                <NotificationBell />
            </AuthContext.Provider>
        );

        expect(await screen.findByLabelText("12 notificações não lidas")).toBeInTheDocument();
    });
});
