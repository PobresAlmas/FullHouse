import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/providers/AuthProvider";
import { NotificationBell } from "../NotificationBell";
import { NotificationCenter } from "../NotificationCenter";
import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "../../api/notifications.api";
import { respondToRoomInvitation } from "@/features/rooms/api/rooms.api";
import { RESIDENCE_MEMBERSHIP_CHANGED_EVENT } from "@/features/residences/api/residences.api";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

vi.mock("../../api/notifications.api", () => ({
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
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

const auth = {
    user: { id: "seeker-1", email: "seeker@example.com" },
    loading: false,
    logout: async () => undefined,
    refreshUser: async () => undefined,
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

    it("treats the message as a link target and keeps read actions independent", async () => {
        const user = userEvent.setup();
        render(
            <AuthContext.Provider value={auth}>
                <NotificationBell />
            </AuthContext.Provider>
        );
        await user.click(screen.getByRole("button", { name: "Notificações" }));
        const dialog = screen.getByRole("dialog", { name: "Notificações" });
        const link = await within(dialog).findByRole("link", { name: pendingInvite.titulo });
        const message = within(dialog).getByText(pendingInvite.mensagem);
        expect(link).toContainElement(message);
        expect(link).toHaveAttribute("href", "/rooms/negotiations/negotiation-1");
        link.addEventListener("click", (event) => event.preventDefault(), { once: true });
        await user.click(within(dialog).getByRole("button", { name: "Marcar como lida" }));
        expect(dialog).toBeInTheDocument();
        expect(respondToRoomInvitation).not.toHaveBeenCalled();

        await user.click(message);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(markNotificationRead).toHaveBeenCalledWith(pendingInvite.id);
    });

    it("supports keyboard navigation and closes on Escape or outside pointer input", async () => {
        const user = userEvent.setup();
        render(
            <AuthContext.Provider value={auth}>
                <NotificationBell />
                <button type="button">Fora do painel</button>
            </AuthContext.Provider>
        );
        const bell = screen.getByRole("button", { name: "Notificações" });
        await user.click(bell);
        const dialog = screen.getByRole("dialog", { name: "Notificações" });
        const link = await within(dialog).findByRole("link", { name: pendingInvite.titulo });
        expect(dialog).toHaveFocus();
        await user.keyboard("{Escape}");
        expect(bell).toHaveFocus();
        expect(bell).toHaveAttribute("aria-expanded", "false");

        await user.click(bell);
        await user.click(screen.getByRole("button", { name: "Fora do painel" }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        await user.click(bell);
        const reopened = await screen.findByRole("link", { name: pendingInvite.titulo });
        expect(reopened).toHaveAttribute("href", link.getAttribute("href"));
        for (let tab = 0; tab < 4; tab++) await user.tab();
        expect(reopened).toHaveFocus();
        reopened.addEventListener("click", (event) => event.preventDefault(), { once: true });
        await user.keyboard("{Enter}");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("synchronizes bulk reading with the bell and preserves loaded cards and pending invitations", async () => {
        const user = userEvent.setup();
        let allRead = false;
        const older = {
            ...pendingInvite,
            id: "notification-older",
            titulo: "Notificação da segunda página",
            entidadeTipo: null,
            negotiationId: null,
            mensagem: null,
            convite: null,
        };
        vi.mocked(getNotifications).mockImplementation(async (_limit, cursor, unreadOnly) => ({
            items:
                allRead && unreadOnly
                    ? []
                    : [{ ...(cursor ? older : pendingInvite), lida: allRead }],
            nextCursor: cursor || (allRead && unreadOnly) ? null : pendingInvite.id,
            unreadCount: allRead ? 0 : 25,
        }));
        vi.mocked(markAllNotificationsRead).mockImplementation(async () => {
            allRead = true;
            return { updatedCount: 25 };
        });
        render(
            <AuthContext.Provider value={auth}>
                <NotificationBell />
                <NotificationCenter userId={auth.user.id} refreshUser={auth.refreshUser} />
            </AuthContext.Provider>
        );
        const center = within(screen.getByRole("region", { name: "Central de notificações" }));
        expect(await screen.findByLabelText("25 notificações não lidas")).toBeInTheDocument();
        await user.click(await center.findByRole("button", { name: "Carregar mais" }));
        expect(await center.findByText(older.titulo)).toBeInTheDocument();
        expect(center.getAllByText("Não lida")).toHaveLength(2);

        await user.click(center.getByRole("button", { name: "Marcar todas como lidas" }));
        await waitFor(() => {
            expect(center.getByText("0 não lida(s)")).toBeInTheDocument();
            expect(screen.queryByLabelText("25 notificações não lidas")).not.toBeInTheDocument();
        });
        expect(center.getAllByText("Lida")).toHaveLength(2);
        expect(center.getByText(older.titulo)).toBeInTheDocument();
        expect(center.getByRole("button", { name: "Aceitar" })).toBeEnabled();
        expect(center.getByRole("button", { name: "Recusar" })).toBeEnabled();
        expect(respondToRoomInvitation).not.toHaveBeenCalled();

        await user.click(center.getByRole("button", { name: "Não lidas" }));
        expect(await center.findByText("Não há notificações não lidas.")).toBeInTheDocument();
        expect(getNotifications).toHaveBeenCalledWith(20, undefined, true);
    });
});
