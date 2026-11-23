import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    houseRules: vi.fn(),
    createListing: vi.fn(),
    uploadPhoto: vi.fn(),
    houseListings: vi.fn(),
    updateListing: vi.fn(),
    roomInterests: vi.fn(),
    updateInterest: vi.fn(),
    replaceRoute: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replaceRoute }) }));

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
vi.mock("@/features/house-collaboration/api/house-rules.api", () => ({
    getHouseRules: mocks.houseRules,
}));
vi.mock("@/features/rooms/api/rooms.api", () => ({
    createRoomListing: mocks.createListing,
    uploadRoomPhoto: mocks.uploadPhoto,
    getHouseRoomListings: mocks.houseListings,
    updateRoomListing: mocks.updateListing,
    getRoomInterests: mocks.roomInterests,
    updateRoomInterest: mocks.updateInterest,
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

describe("Publicar quarto em Moradores", () => {
    let previewCount = 0;
    const createPreview = vi.fn(() => `blob:foto-${++previewCount}`);
    const revokePreview = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.residences.mockResolvedValue([house]);
        mocks.members.mockResolvedValue([]);
        mocks.houseRules.mockReset().mockResolvedValue([]);
        mocks.createListing.mockReset().mockResolvedValue({ status: "ABERTO" });
        mocks.uploadPhoto.mockReset().mockResolvedValue("https://storage.example/foto.png");
        mocks.houseListings.mockReset().mockResolvedValue([]);
        vi.stubGlobal(
            "URL",
            class extends URL {
                static createObjectURL = createPreview;
                static revokeObjectURL = revokePreview;
            }
        );
    });

    afterEach(() => vi.unstubAllGlobals());

    async function openListing() {
        const user = userEvent.setup({ applyAccept: false });
        render(<SettingsPage section="members" tab="general" />);
        const trigger = await screen.findByRole("button", { name: "Anunciar quarto" });
        await user.click(trigger);
        const dialog = within(await screen.findByRole("dialog", { name: "Anunciar quarto" }));
        return { user, dialog, trigger };
    }

    function fillListing(dialog: ReturnType<typeof within>, profile = "Convivência tranquila.") {
        fireEvent.change(dialog.getByLabelText("Título"), {
            target: { value: "Quarto individual" },
        });
        fireEvent.change(dialog.getByLabelText("Descrição"), {
            target: { value: "Quarto com janela." },
        });
        fireEvent.change(dialog.getByLabelText("Preço mensal (R$)"), {
            target: { value: "450.50" },
        });
        fireEvent.change(dialog.getByLabelText("Contato"), { target: { value: "85999999999" } });
        fireEvent.change(dialog.getByLabelText("Regras e perfil de convivência"), {
            target: { value: profile },
        });
    }

    it("permite ao administrador abrir a ação no cabeçalho vazio e cancelar com Escape", async () => {
        mocks.residences.mockResolvedValue([
            { ...house, membership: { ...house.membership, role: "ADMINISTRADOR" } },
        ]);
        const { user, dialog, trigger } = await openListing();
        expect(trigger.closest("header")).toHaveTextContent("Moradores da casa");
        expect(dialog.getByText("Casa: Casa Verde")).toBeInTheDocument();
        expect(dialog.getByLabelText("Cidade")).toHaveValue("Fortaleza");
        expect(dialog.getByLabelText("Bairro")).toHaveValue("Centro");
        await waitFor(() => expect(dialog.getByLabelText("Título")).toHaveFocus());
        await user.keyboard("{Escape}");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        await waitFor(() => expect(trigger).toHaveFocus());
        expect(mocks.createListing).not.toHaveBeenCalled();
    });

    it.each(["house", "permissions"] as const)("omite a ação na aba %s", async (section) => {
        render(<SettingsPage section={section} tab="general" />);
        await screen.findByText("Nenhum morador ativo encontrado.");
        expect(screen.queryByRole("button", { name: "Anunciar quarto" })).not.toBeInTheDocument();
    });

    it("omite a ação para morador comum com permissão de editar conteúdo", async () => {
        mocks.residences.mockResolvedValue([
            { ...house, membership: { id: "member-1", role: "MORADOR", canEditContent: true } },
        ]);
        render(<SettingsPage section="members" tab="general" />);
        await screen.findByText("Nenhum morador ativo encontrado.");
        expect(screen.queryByRole("button", { name: "Anunciar quarto" })).not.toBeInTheDocument();
    });

    it("omite a ação sem residência ativa", async () => {
        mocks.residences.mockResolvedValue([]);
        render(<SettingsPage section="members" tab="general" />);
        await screen.findByText("Você ainda não pertence a uma casa");
        expect(screen.queryByRole("button", { name: "Anunciar quarto" })).not.toBeInTheDocument();
    });

    it("publica para a casa exibida usando a foto, as regras revisadas e as opções escolhidas", async () => {
        mocks.houseRules.mockResolvedValue([
            {
                id: "rule-1",
                title: "Visitas",
                description: "Avisar antes de receber",
                createdBy: "Nome interno",
            },
            { id: "rule-2", title: "Silêncio", description: "A partir das 22h" },
        ]);
        const { user, dialog } = await openListing();
        fillListing(dialog);
        await user.click(await dialog.findByRole("checkbox", { name: /Visitas/ }));
        await user.click(dialog.getByRole("button", { name: "Incluir regras selecionadas" }));
        const profile = dialog.getByLabelText("Regras e perfil de convivência");
        expect(profile).toHaveValue("Convivência tranquila.\n\nVisitas: Avisar antes de receber");
        fireEvent.change(profile, { target: { value: "Visitas: combinar com antecedência." } });
        await user.click(dialog.getByRole("radio", { name: "Sim" }));
        const address = dialog.getByRole("checkbox", {
            name: "Exibir endereço completo publicamente",
        });
        const contact = dialog.getByRole("checkbox", { name: "Exibir contato publicamente" });
        expect(address).not.toBeChecked();
        expect(contact).not.toBeChecked();
        await user.click(contact);
        const kept = new File(["image"], "quarto.png", { type: "image/png" });
        const removed = new File(["image"], "remover.jpg", { type: "image/jpeg" });
        await user.upload(dialog.getByLabelText("Selecionar fotos do quarto"), [kept, removed]);
        expect(dialog.getByText("2/8 fotos")).toBeInTheDocument();
        await user.click(dialog.getByRole("button", { name: "Remover remover.jpg" }));
        await user.click(dialog.getByRole("button", { name: "Publicar anúncio" }));

        expect(await screen.findByText("Anúncio publicado.")).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(mocks.houseRules).toHaveBeenCalledWith("home-1");
        expect(mocks.uploadPhoto).toHaveBeenCalledExactlyOnceWith("home-1", kept);
        expect(mocks.createListing).toHaveBeenCalledExactlyOnceWith({
            casaId: "home-1",
            titulo: "Quarto individual",
            descricao: "Quarto com janela.",
            preco: 450.5,
            cidade: "Fortaleza",
            bairro: "Centro",
            enderecoCompleto: "",
            contato: "(85) 99999-9999",
            tipoMoradia: "QUARTO_INDIVIDUAL",
            aceitaPets: true,
            perfilConvivencia: "Visitas: combinar com antecedência.",
            exibeEnderecoCompleto: false,
            exibeContato: true,
            fotos: ["https://storage.example/foto.png"],
        });
        expect(revokePreview).toHaveBeenCalledTimes(2);
    });

    it("mantém seleção e dados após falhas e reaproveita uploads concluídos", async () => {
        const { user, dialog } = await openListing();
        fillListing(dialog);
        const first = new File(["image"], "primeira.png", { type: "image/png" });
        const second = new File(["image"], "segunda.webp", { type: "image/webp" });
        const firstUpload = Promise.withResolvers<string>();
        mocks.uploadPhoto
            .mockReturnValueOnce(firstUpload.promise)
            .mockRejectedValueOnce(new Error("Armazenamento indisponível"));
        mocks.createListing.mockRejectedValueOnce(new Error("Publicação indisponível"));
        await user.upload(dialog.getByLabelText("Selecionar fotos do quarto"), [first, second]);
        const submit = dialog.getByRole("button", { name: "Publicar anúncio" });
        await user.click(submit);
        expect(submit).toBeDisabled();
        await user.keyboard("{Escape}");
        expect(submit).toBeInTheDocument();
        fireEvent.submit(submit.closest("form")!);
        expect(mocks.uploadPhoto).toHaveBeenCalledTimes(1);
        firstUpload.resolve("https://storage.example/primeira.png");
        expect(await dialog.findByText("Armazenamento indisponível")).toBeInTheDocument();
        expect(mocks.createListing).not.toHaveBeenCalled();
        await user.click(submit);
        expect(await dialog.findByText("Publicação indisponível")).toBeInTheDocument();
        expect(dialog.getByLabelText("Descrição")).toHaveValue("Quarto com janela.");
        await user.click(submit);
        expect(await screen.findByText("Anúncio publicado.")).toBeInTheDocument();
        expect(mocks.uploadPhoto.mock.calls).toEqual([
            ["home-1", first],
            ["home-1", second],
            ["home-1", second],
        ]);
        expect(mocks.createListing).toHaveBeenLastCalledWith(
            expect.objectContaining({
                fotos: ["https://storage.example/primeira.png", "https://storage.example/foto.png"],
            })
        );
    });

    it("sinaliza arquivos inválidos e impede o envio até a correção", async () => {
        const { user, dialog } = await openListing();
        fillListing(dialog);
        const valid = Array.from(
            { length: 9 },
            (_, index) => new File(["image"], `${index + 1}.png`, { type: "image/png" })
        );
        const pdf = new File(["pdf"], "documento.pdf", { type: "application/pdf" });
        const large = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "grande.jpg", {
            type: "image/jpeg",
        });
        await user.upload(dialog.getByLabelText("Selecionar fotos do quarto"), [
            ...valid,
            pdf,
            large,
        ]);
        expect(dialog.getByText("8/8 fotos")).toBeInTheDocument();
        expect(dialog.getByText("O anúncio permite até oito fotos.")).toBeInTheDocument();
        expect(dialog.getByText("Selecione uma imagem JPEG, PNG ou WebP.")).toBeInTheDocument();
        expect(dialog.getByText("A imagem deve ter até 8 MiB.")).toBeInTheDocument();
        await user.click(dialog.getByRole("button", { name: "Publicar anúncio" }));
        expect(
            dialog.getByText("Remova os arquivos inválidos da seleção antes de publicar.")
        ).toBeInTheDocument();
        expect(mocks.uploadPhoto).not.toHaveBeenCalled();
        expect(mocks.createListing).not.toHaveBeenCalled();
    });

    it("trata falha e mural vazio, preserva texto manual e publica sem fotos", async () => {
        mocks.houseRules.mockRejectedValueOnce(new Error("Falha no mural"));
        const { user, dialog } = await openListing();
        fillListing(dialog, "   ");
        const submit = dialog.getByRole("button", { name: "Publicar anúncio" });
        expect(
            await dialog.findByText(/Não foi possível carregar as regras da casa/)
        ).toBeInTheDocument();
        await user.click(submit);
        expect(dialog.getByText("Preencha e revise o perfil de convivência.")).toBeInTheDocument();
        expect(mocks.createListing).not.toHaveBeenCalled();
        fireEvent.change(dialog.getByLabelText("Regras e perfil de convivência"), {
            target: { value: "Silêncio após as 22h." },
        });
        await user.click(dialog.getByRole("button", { name: "Tentar novamente" }));
        expect(
            await dialog.findByText(/A casa ainda não tem regras registradas/)
        ).toBeInTheDocument();
        expect(dialog.getByLabelText("Regras e perfil de convivência")).toHaveValue(
            "Silêncio após as 22h."
        );
        await user.click(submit);
        expect(await screen.findByText("Anúncio publicado.")).toBeInTheDocument();
        expect(mocks.uploadPhoto).not.toHaveBeenCalled();
        expect(mocks.createListing).toHaveBeenCalledWith(
            expect.objectContaining({
                fotos: [],
                aceitaPets: false,
                exibeContato: false,
                exibeEnderecoCompleto: false,
            })
        );
    });

    it("encerra a publicação quando o gestor perde acesso durante o upload", async () => {
        const photoUpload = Promise.withResolvers<string>();
        mocks.uploadPhoto.mockReturnValueOnce(photoUpload.promise);
        const { user, dialog } = await openListing();
        fillListing(dialog);
        await user.upload(
            dialog.getByLabelText("Selecionar fotos do quarto"),
            new File(["image"], "quarto.png", { type: "image/png" })
        );
        await user.click(dialog.getByRole("button", { name: "Publicar anúncio" }));
        expect(mocks.uploadPhoto).toHaveBeenCalled();
        mocks.residences.mockResolvedValue([]);
        fireEvent(window, new Event("fullhouse:residence-membership-changed"));
        expect(await screen.findByText(/A casa ou sua permissão mudou/)).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByRole("heading", { name: "Moradores" })).toHaveFocus()
        );
        photoUpload.resolve("https://storage.example/quarto.png");
        await photoUpload.promise;
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(mocks.createListing).not.toHaveBeenCalled();
    });
});

describe("SettingsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.houseListings.mockReset().mockResolvedValue([]);
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

describe("Anúncios da casa em Moradores", () => {
    const listing = {
        id: "listing-1",
        titulo: "Quarto com varanda",
        descricao: "Quarto mobiliado.",
        preco: 450,
        cidade: "Fortaleza",
        bairro: "Centro",
        enderecoCompleto: "Rua oculta",
        exibeEnderecoCompleto: false,
        contato: "(85) 99999-9999",
        exibeContato: false,
        perfilConvivencia: "Silêncio após as 22h.",
        tipoMoradia: "QUARTO_INDIVIDUAL",
        aceitaPets: true,
        fotos: ["https://storage.example/foto.png"],
        status: "ABERTO",
        autorNome: "Ana",
        canManage: true,
        pendingInterestCount: 1,
    };
    const interest = {
        id: "interest-1",
        status: "PENDENTE",
        mensagem: "Posso conhecer o quarto?",
        usuario: { nome: "João" },
        negotiationId: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.residences.mockResolvedValue([house]);
        mocks.members.mockResolvedValue([]);
        mocks.houseRules.mockResolvedValue([]);
        mocks.houseListings.mockReset().mockResolvedValue([listing]);
        mocks.updateListing.mockReset().mockResolvedValue(listing);
        mocks.roomInterests.mockReset().mockResolvedValue([interest]);
        mocks.updateInterest.mockReset().mockResolvedValue({
            id: "interest-1",
            status: "ACEITO",
            negotiationId: "negotiation-1",
        });
    });

    it("shows the public preview and saves an edit while preserving photos and privacy settings", async () => {
        const user = userEvent.setup();
        mocks.houseListings
            .mockResolvedValueOnce([listing])
            .mockResolvedValue([{ ...listing, titulo: "Quarto reformado" }]);
        render(<SettingsPage section="members" tab="general" />);
        const panel = within(await screen.findByRole("region", { name: "Anúncios da casa" }));
        const card = within(await panel.findByRole("article"));
        expect(
            card.getByRole("img", { name: `Foto do anúncio ${listing.titulo}` })
        ).toBeInTheDocument();
        expect(card.getByText("Disponível")).toBeInTheDocument();
        expect(card.getByText("Aceita Pets")).toBeInTheDocument();
        await user.click(await panel.findByRole("button", { name: "Ver anúncio" }));
        const preview = within(await screen.findByRole("dialog", { name: listing.titulo }));
        expect(preview.getAllByText("Oculto")).toHaveLength(2);
        expect(preview.queryByText("Rua oculta")).not.toBeInTheDocument();
        await user.click(preview.getByRole("button", { name: "Fechar" }));
        await user.click(panel.getByRole("button", { name: "Editar" }));
        const edit = within(await screen.findByRole("dialog", { name: "Editar anúncio" }));
        expect(edit.getByLabelText("Regras e perfil de convivência")).toHaveValue(
            listing.perfilConvivencia
        );
        expect(edit.getByRole("radio", { name: "Sim" })).toBeChecked();
        expect(edit.getByRole("img", { name: "Foto atual 1" })).toBeInTheDocument();
        fireEvent.change(edit.getByLabelText("Título"), { target: { value: "Quarto reformado" } });
        await user.click(edit.getByRole("button", { name: "Salvar alterações" }));
        expect(await panel.findByText("Quarto reformado")).toBeInTheDocument();
        expect(mocks.houseListings).toHaveBeenLastCalledWith("home-1");
        expect(mocks.updateListing).toHaveBeenCalledWith(
            "listing-1",
            expect.objectContaining({
                titulo: "Quarto reformado",
                fotos: listing.fotos,
                exibeContato: false,
                aceitaPets: true,
            })
        );
        expect(mocks.updateListing.mock.calls[0][1]).not.toHaveProperty("casaId");
    });

    it("opens the notified listing at its interested people and shows the conversation after accepting", async () => {
        const user = userEvent.setup();
        render(<SettingsPage section="members" tab="general" requestedListingId="listing-1" />);
        const dialog = within(await screen.findByRole("dialog", { name: "Pessoas interessadas" }));
        expect(await dialog.findByText("João")).toBeInTheDocument();
        await user.click(dialog.getByRole("button", { name: "Aceitar" }));
        expect(await dialog.findByRole("link", { name: "Abrir conversa" })).toHaveAttribute(
            "href",
            "/rooms/negotiations/negotiation-1"
        );
        expect(mocks.updateInterest).toHaveBeenCalledWith("listing-1", "interest-1", "ACEITO");
        await user.click(dialog.getByRole("button", { name: "Fechar" }));
        expect(mocks.replaceRoute).toHaveBeenCalledWith(
            "/settings?section=members#anuncios-da-casa",
            { scroll: false }
        );
    });

    it("allows a housemate to see an announcement without opening the interest or edit actions", async () => {
        mocks.houseListings.mockResolvedValue([
            { ...listing, canManage: false, pendingInterestCount: null, fotos: [] },
        ]);
        render(<SettingsPage section="members" tab="general" requestedListingId="listing-1" />);
        const panel = within(await screen.findByRole("region", { name: "Anúncios da casa" }));
        expect(await panel.findByRole("button", { name: "Ver anúncio" })).toBeInTheDocument();
        expect(panel.getByText("Anúncio sem foto")).toBeInTheDocument();
        expect(panel.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
        expect(panel.queryByRole("button", { name: /Interessados/ })).not.toBeInTheDocument();
        expect(mocks.roomInterests).not.toHaveBeenCalled();
    });
});
