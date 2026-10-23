import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ResidenceAccessService } from "./residence-access.service.js";

describe("ResidenceAccessService", () => {
    const residence = {
        id: "residence-1",
        participacao: [{ id: "member-1", papel: "MORADOR" }],
        configuracao_casa: { politica_criacao_edicao: "TODOS" },
    };
    let prisma: {
        casa: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
        participacao: { findFirst: ReturnType<typeof vi.fn> };
        configuracao_casa: { upsert: ReturnType<typeof vi.fn> };
    };
    let service: ResidenceAccessService;

    beforeEach(() => {
        prisma = {
            casa: {
                findMany: vi.fn().mockResolvedValue([]),
                findFirst: vi.fn().mockResolvedValue(residence),
            },
            participacao: {
                findFirst: vi.fn().mockResolvedValue({ id: "member-2", usuario_id: "user-2" }),
            },
            configuracao_casa: { upsert: vi.fn().mockResolvedValue(undefined) },
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
            select: { id: true, usuario_id: true, papel: true },
        });
    });
});
