import { beforeEach, describe, expect, it, vi } from "vitest";
import { HouseRulesRepository } from "../../../src/house-rules/house-rules.repository.js";
import { PrismaService } from "../../../src/prisma/prisma.service.js";

describe("HouseRulesRepository", () => {
    const homeId = "00000000-0000-4000-8000-000000000001";
    const ruleId = "00000000-0000-4000-8000-000000000002";
    let prisma: { regra_convivencia: Record<string, ReturnType<typeof vi.fn>> };
    let repository: HouseRulesRepository;

    beforeEach(() => {
        prisma = {
            regra_convivencia: {
                findMany: vi.fn().mockResolvedValue([]),
                findFirst: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue({ id: ruleId }),
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
        };
        repository = new HouseRulesRepository(prisma as unknown as PrismaService);
    });

    it("filters the board to vigente rules in the requested residence", async () => {
        await repository.findAll(homeId);
        expect(prisma.regra_convivencia.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { casa_id: homeId, escopo: "CASA", subgrupo_id: null, status: "VIGENTE" },
            })
        );
    });

    it("updates attribution only for a vigente rule within the same home", async () => {
        await repository.update(homeId, ruleId, "member-1", {
            title: "Título",
            description: "Descrição",
        });
        expect(prisma.regra_convivencia.updateMany).toHaveBeenCalledWith({
            where: {
                id: ruleId,
                casa_id: homeId,
                escopo: "CASA",
                subgrupo_id: null,
                status: "VIGENTE",
            },
            data: {
                titulo: "Título",
                descricao: "Descrição",
                atualizada_por_participacao_id: "member-1",
            },
        });
    });
});
