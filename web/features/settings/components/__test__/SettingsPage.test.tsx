import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "../SettingsPage";

const mocks = vi.hoisted(() => ({
    user: { id: "user-1", name: "Ana Silva", nickname: "Nina" },
    residences: vi.fn(),
    members: vi.fn(),
    permissionSettings: vi.fn(),
    updateResidenceName: vi.fn(),
    updatePermission: vi.fn(),
    updateMemberAccess: vi.fn(),
    preferences: vi.fn(),
    updatePreferences: vi.fn(),
    setTheme: vi.fn(),
    categories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    notifications: vi.fn(),
    markRead: vi.fn(),
    subscribeNotifications: vi.fn(() => () => undefined),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
    useAuth: () => ({ user: mocks.user, loading: false }),
}));
vi.mock("@/features/residences/api/residences.api", () => ({
    getResidences: mocks.residences,
    getResidenceMembers: mocks.members,
    getResidencePermissionSettings: mocks.permissionSettings,
    updateResidenceName: mocks.updateResidenceName,
    updateResidencePermissionSettings: mocks.updatePermission,
    updateResidenceMemberAccess: mocks.updateMemberAccess,
    RESIDENCE_MEMBERSHIP_CHANGED_EVENT: "fullhouse:residence-membership-changed",
}));
vi.mock("@/features/pantry/api/pantry.api", () => ({
    getPantryCategories: mocks.categories,
    createPantryCategory: mocks.createCategory,
    updatePantryCategory: mocks.updateCategory,
    deletePantryCategory: mocks.deleteCategory,
}));
vi.mock("@/features/settings/api/settings.api", () => ({
    getResidencePreferences: mocks.preferences,
    updateResidencePreferences: mocks.updatePreferences,
}));
vi.mock("@/providers/ThemeProvider", () => ({
    useTheme: () => ({ theme: "light", setTheme: mocks.setTheme }),
}));
vi.mock("@/features/notifications/api/notifications.api", () => ({
    getNotifications: mocks.notifications,
    markNotificationRead: mocks.markRead,
    subscribeNotifications: mocks.subscribeNotifications,
}));

const house = {
    id: "home-1",
    name: "Casa Verde",
    city: "Fortaleza",
    neighborhood: "Centro",
    status: "ATIVA",
    membership: { id: "member-1", role: "LIDER" as const },
    creationEditPolicy: "TODOS" as const,
};

describe("SettingsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.residences.mockResolvedValue([house]);
        mocks.members.mockResolvedValue([
            { id: "member-1", name: "Ana Silva", role: "LIDER" },
            { id: "member-2", name: "João Lima", role: "MORADOR" },
        ]);
        mocks.permissionSettings.mockResolvedValue({
            residenceId: "home-1",
            creationEditPolicy: "TODOS",
            canManage: true,
        });
        mocks.updateResidenceName.mockResolvedValue({ ...house, name: "Nova Casa" });
        mocks.updatePermission.mockResolvedValue({
            residenceId: "home-1",
            creationEditPolicy: "LIDERES",
            canManage: true,
        });
        mocks.preferences.mockResolvedValue({
            notifications: {
                newTasks: true,
                newExpenses: true,
                upcomingDueDates: true,
                residentInvitations: true,
                houseUpdates: false,
            },
            pantry: { expirationNoticeDays: 5, showExpired: true },
            finance: { dueNoticeDays: 5, showOverdue: true },
            pets: { vaccineReminders: true, dewormingReminders: true, appointmentReminders: true },
        });
        mocks.updatePreferences.mockImplementation(async (_id, update) => ({
            ...(await mocks.preferences()),
            ...update,
        }));
        mocks.categories.mockResolvedValue([{ id: "cat-1", name: "Bebidas" }]);
        mocks.createCategory.mockResolvedValue({ id: "cat-2", name: "Temperos" });
        mocks.notifications.mockResolvedValue({ items: [], unreadCount: 0, nextCursor: null });
        mocks.markRead.mockResolvedValue({ id: "notification-1", lida: true });
    });

    it("shows the inner navigation and real residence data, then saves the house name", async () => {
        const user = userEvent.setup();
        render(<SettingsPage section="house" tab="general" />);

        expect(await screen.findByDisplayValue("Casa Verde")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Minha conta" })).toHaveAttribute(
            "href",
            "/settings?section=account"
        );
        fireEvent.change(screen.getByLabelText("Nome da casa"), {
            target: { value: "Nova Casa" },
        });
        await user.click(screen.getByRole("button", { name: "Editar" }));

        await waitFor(() =>
            expect(mocks.updateResidenceName).toHaveBeenCalledWith("home-1", "Nova Casa")
        );
    });

    it("renders only real resident names and roles", async () => {
        render(<SettingsPage section="members" tab="general" />);

        expect(await screen.findByText("João Lima")).toBeInTheDocument();
        expect(screen.getByText("Líder")).toBeInTheDocument();
        expect(mocks.members).toHaveBeenCalledWith("home-1");
    });

    it("saves an individual resident's permission override", async () => {
        const user = userEvent.setup();
        mocks.members.mockResolvedValue([
            {
                id: "member-1",
                userId: "user-1",
                name: "Ana Silva",
                role: "LIDER",
                canManage: true,
                canEditContent: true,
            },
            {
                id: "member-2",
                userId: "user-2",
                name: "João Lima",
                role: "MORADOR",
                canManage: false,
                canEditContent: true,
            },
        ]);
        mocks.updateMemberAccess.mockResolvedValue({
            id: "member-2",
            userId: "user-2",
            name: "João Lima",
            role: "MORADOR",
            canManage: false,
            canEditContent: false,
        });
        render(<SettingsPage section="permissions" tab="general" />);
        await user.click(await screen.findByRole("combobox", { name: "Permissão de João Lima" }));
        await user.click(screen.getByRole("option", { name: "Somente leitura" }));
        await waitFor(() =>
            expect(mocks.updateMemberAccess).toHaveBeenCalledWith("home-1", "member-2", false)
        );
    });

    it("shows actual notifications and marks them as read", async () => {
        const user = userEvent.setup();
        mocks.notifications.mockResolvedValue({
            items: [
                {
                    id: "notification-1",
                    titulo: "Tarefa atribuída",
                    mensagem: "Uma tarefa foi atribuída a você.",
                    lida: false,
                    criadoEm: "2026-11-20T12:00:00.000Z",
                    entidadeTipo: "TAREFA",
                    entidadeId: "task-1",
                    negotiationId: null,
                    convite: null,
                },
            ],
            unreadCount: 1,
            nextCursor: "cursor-1",
        });
        render(<SettingsPage section="notifications" tab="general" />);

        expect(await screen.findByText("Tarefa atribuída")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Marcar como lida" }));
        await waitFor(() => expect(mocks.markRead).toHaveBeenCalledWith("notification-1"));
    });

    it("loads and creates pantry categories through the existing API", async () => {
        const user = userEvent.setup();
        render(<SettingsPage section="preferences" tab="categories" />);

        expect(await screen.findByText("Bebidas")).toBeInTheDocument();
        await user.click(screen.getAllByRole("button", { name: "Adicionar categoria" })[0]);
        await user.type(screen.getByLabelText("Nova categoria"), "Temperos");
        await user.click(screen.getAllByRole("button", { name: "Adicionar categoria" })[1]);

        await waitFor(() =>
            expect(mocks.createCategory).toHaveBeenCalledWith("home-1", "Temperos")
        );
        expect(await screen.findAllByText("Temperos")).not.toHaveLength(0);
    });

    it("marks the current settings section and preference tab", async () => {
        render(<SettingsPage section="preferences" tab="pantry" />);
        expect(await screen.findByRole("link", { name: "Preferências" })).toHaveAttribute(
            "aria-current",
            "page"
        );
        const tabs = screen.getByRole("navigation", { name: "Abas de preferências" });
        expect(within(tabs).getByRole("link", { name: "Despensa" })).toHaveAttribute(
            "aria-current",
            "page"
        );
    });

    it("applies the selected theme and persists notification changes through the settings API", async () => {
        const user = userEvent.setup();
        render(<SettingsPage section="preferences" tab="general" />);

        const themeGroup = await screen.findByRole("group", { name: "Tema da aplicação" });
        expect(within(themeGroup).getByRole("button", { name: "Claro" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
        await user.click(within(themeGroup).getByRole("button", { name: "Escuro" }));
        expect(mocks.setTheme).toHaveBeenCalledWith("dark");

        await user.click(await screen.findByRole("switch", { name: "Atualizações da casa" }));
        await waitFor(() =>
            expect(mocks.updatePreferences).toHaveBeenCalledWith("home-1", {
                notifications: {
                    newTasks: true,
                    newExpenses: true,
                    upcomingDueDates: true,
                    residentInvitations: true,
                    houseUpdates: true,
                },
            })
        );
        expect(await screen.findByText("Preferências salvas.")).toBeInTheDocument();
    });

    it("saves pantry values including false and boundary days", async () => {
        const user = userEvent.setup();
        render(<SettingsPage section="preferences" tab="pantry" />);

        await user.click(await screen.findByRole("combobox"));
        await user.click(screen.getByRole("option", { name: "14 dias" }));
        await waitFor(() =>
            expect(mocks.updatePreferences).toHaveBeenCalledWith("home-1", {
                pantry: { expirationNoticeDays: 14, showExpired: true },
            })
        );
        await user.click(screen.getByRole("switch", { name: "Mostrar itens vencidos" }));
        await waitFor(() =>
            expect(mocks.updatePreferences).toHaveBeenLastCalledWith("home-1", {
                pantry: { expirationNoticeDays: 14, showExpired: false },
            })
        );
    });
});
