import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ResidenceAccessService } from "./residence-access.service.js";

describe("ResidenceAccessService", () => {
    const residence = {
        id: "residence-1",
        participacao: [{ id: "member-1", papel: "MORADOR" }],
        configuracao_casa: { politica_criacao_edicao: "TODOS" },
    };
    let prisma: {
        casa: {
            findMany: ReturnType<typeof vi.fn>;
            findFirst: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
        };
        participacao: {
            findFirst: ReturnType<typeof vi.fn>;
            findMany: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
        };
        configuracao_casa: {
            upsert: ReturnType<typeof vi.fn>;
            findUnique: ReturnType<typeof vi.fn>;
        };
        preferencia_residencia: {
            findUnique: ReturnType<typeof vi.fn>;
            upsert: ReturnType<typeof vi.fn>;
        };
    };
    let service: ResidenceAccessService;

    beforeEach(() => {
        prisma = {
            casa: {
                findMany: vi.fn().mockResolvedValue([]),
                findFirst: vi.fn().mockResolvedValue(residence),
                update: vi.fn().mockResolvedValue({
                    id: "residence-1",
                    nome: "Casa Nova",
                    cidade: "Fortaleza",
                    bairro: null,
                    status: "ATIVA",
                }),
            },
            participacao: {
                findFirst: vi.fn().mockResolvedValue({ id: "member-2", usuario_id: "user-2" }),
                findMany: vi.fn(),
                update: vi.fn(),
            },
            configuracao_casa: {
                upsert: vi.fn().mockResolvedValue(undefined),
                findUnique: vi.fn(),
            },
            preferencia_residencia: {
                findUnique: vi.fn().mockResolvedValue(null),
                upsert: vi.fn(),
            },
        };
        service = new ResidenceAccessService(prisma as never);
    });

    it("requires an active membership and applies the all-members default", async () => {
        await expect(service.requireMembership("residence-1", "user-1")).resolves.toEqual({
            residenceId: "residence-1",
            memberId: "member-1",
            role: "MORADOR",
            creationEditPolicy: "TODOS",
        });
        expect(prisma.casa.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    id: "residence-1",
                    status: "ATIVA",
                    excluido_em: null,
                    participacao: { some: { usuario_id: "user-1", data_saida: null } },
                }),
            })
        );
    });

    it("does not resolve a membership if the residence or active participation is missing", async () => {
        prisma.casa.findFirst.mockResolvedValueOnce(null);
        await expect(service.requireMembership("residence-1", "user-1")).rejects.toBeInstanceOf(
            NotFoundException
        );

        prisma.casa.findFirst.mockResolvedValueOnce({ ...residence, participacao: [] });
        await expect(service.requireMembership("residence-1", "user-1")).rejects.toBeInstanceOf(
            NotFoundException
        );
    });

    it("enforces the residence create/edit policy while allowing either leadership role", async () => {
        prisma.casa.findFirst.mockResolvedValue({
            ...residence,
            configuracao_casa: { politica_criacao_edicao: "LIDERES" },
        });
        await expect(
            service.requireCreateEditPermission("residence-1", "user-1")
        ).rejects.toBeInstanceOf(ForbiddenException);

        prisma.casa.findFirst.mockResolvedValue({
            ...residence,
            participacao: [{ id: "leader-1", papel: "LIDER" }],
            configuracao_casa: { politica_criacao_edicao: "LIDERES" },
        });
        await expect(
            service.requireCreateEditPermission("residence-1", "user-1")
        ).resolves.toMatchObject({ memberId: "leader-1", role: "LIDER" });
    });

    it.each([
        ["TODOS", false, false],
        ["LIDERES", true, true],
        ["LIDERES", false, false],
    ] as const)(
        "applies a resident override over the residence policy (%s, override %s)",
        async (policy, override, allowed) => {
            prisma.casa.findFirst.mockResolvedValue({
                ...residence,
                participacao: [
                    { id: "member-1", papel: "MORADOR", edicao_conteudo_override: override },
                ],
                configuracao_casa: { politica_criacao_edicao: policy },
            });
            const permission = service.requireCreateEditPermission("residence-1", "user-1");
            if (allowed)
                await expect(permission).resolves.toMatchObject({ canEditContent: override });
            else await expect(permission).rejects.toBeInstanceOf(ForbiddenException);
        }
    );

    it("allows only leaders and administrators to update permission settings", async () => {
        await expect(
            service.updatePermissionSettings("residence-1", "user-1", "LIDERES")
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.configuracao_casa.upsert).not.toHaveBeenCalled();

        prisma.casa.findFirst.mockResolvedValue({
            ...residence,
            participacao: [{ id: "admin-1", papel: "ADMINISTRADOR" }],
        });
        await service.updatePermissionSettings("residence-1", "user-1", "LIDERES");
        expect(prisma.configuracao_casa.upsert).toHaveBeenCalledWith({
            where: { casa_id: "residence-1" },
            create: { casa_id: "residence-1", politica_criacao_edicao: "LIDERES" },
            update: { politica_criacao_edicao: "LIDERES" },
        });
    });

    it("validates that a selected member is currently active in the residence", async () => {
        await service.requireActiveMember("residence-1", "member-2");
        expect(prisma.participacao.findFirst).toHaveBeenCalledWith({
            where: { id: "member-2", casa_id: "residence-1", data_saida: null },
            select: { id: true, usuario_id: true, papel: true, edicao_conteudo_override: true },
        });
    });

    it("allows only managers to update the residence name", async () => {
        await expect(
            service.updateResidenceName("residence-1", "user-1", "Casa Nova")
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.casa.update).not.toHaveBeenCalled();

        prisma.casa.findFirst.mockResolvedValue({
            ...residence,
            participacao: [{ id: "leader-1", papel: "LIDER" }],
        });
        await expect(
            service.updateResidenceName("residence-1", "user-1", "Casa Nova")
        ).resolves.toEqual({
            id: "residence-1",
            name: "Casa Nova",
            city: "Fortaleza",
            neighborhood: null,
            status: "ATIVA",
        });
        expect(prisma.casa.update).toHaveBeenCalledWith({
            where: { id: "residence-1" },
            data: { nome: "Casa Nova" },
            select: { id: true, nome: true, cidade: true, bairro: true, status: true },
        });
    });

    it("returns complete defaults for preferences that have not been customized", async () => {
        await expect(service.getPreferences("residence-1", "user-1")).resolves.toEqual({
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
        expect(prisma.preferencia_residencia.findUnique).toHaveBeenCalledWith({
            where: { usuario_id_casa_id: { usuario_id: "user-1", casa_id: "residence-1" } },
        });
    });

    it("persists partial preference updates without overwriting omitted fields", async () => {
        const saved = {
            aviso_novas_tarefas: true,
            aviso_novas_despesas: true,
            aviso_vencimentos: true,
            aviso_convites: true,
            aviso_atualizacoes_casa: false,
            validade_aviso_dias: 14,
            mostrar_vencidos: false,
            financeiro_aviso_dias: 5,
            mostrar_atrasadas: true,
            lembrete_vacinas: true,
            lembrete_vermifugo: true,
            lembrete_consultas: true,
        };
        prisma.preferencia_residencia.upsert.mockResolvedValue(saved);

        const result = await service.updatePreferences("residence-1", "user-1", {
            pantry: { expirationNoticeDays: 14, showExpired: false },
        });

        expect(prisma.preferencia_residencia.upsert).toHaveBeenCalledWith({
            where: { usuario_id_casa_id: { usuario_id: "user-1", casa_id: "residence-1" } },
            create: {
                usuario_id: "user-1",
                casa_id: "residence-1",
                validade_aviso_dias: 14,
                mostrar_vencidos: false,
            },
            update: { validade_aviso_dias: 14, mostrar_vencidos: false },
        });
        expect(result.pantry).toEqual({ expirationNoticeDays: 14, showExpired: false });
    });

    it("rejects preference reads for non-members before querying their private settings", async () => {
        prisma.casa.findFirst.mockResolvedValueOnce(null);
        await expect(service.getPreferences("residence-1", "outsider")).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(prisma.preferencia_residencia.findUnique).not.toHaveBeenCalled();
    });
});
