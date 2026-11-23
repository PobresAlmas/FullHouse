import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HouseRulesRepository } from "../../../src/house-rules/house-rules.repository.js";
import { HouseRulesService } from "../../../src/house-rules/house-rules.service.js";
import { ResidenceAccessService } from "../../../src/residences/residence-access.service.js";

describe("HouseRulesService", () => {
    const homeId = "00000000-0000-4000-8000-000000000001";
    const userId = "00000000-0000-4000-8000-000000000002";
    const memberId = "00000000-0000-4000-8000-000000000003";
    const ruleId = "00000000-0000-4000-8000-000000000004";
    const rule = {
        id: ruleId,
        titulo: "Limpeza",
        descricao: "Revezar a limpeza semanal",
        criado_em: new Date("2026-01-01T00:00:00Z"),
        participacao_regra_convivencia_criada_por_participacao_idToparticipacao: {
            usuario: { nome: "Iago", apelido: null },
        },
        participacao_regra_convivencia_atualizada_por_participacao_idToparticipacao: null,
    };
    let repository: Record<string, ReturnType<typeof vi.fn>>;
    let access: {
        requireMembership: ReturnType<typeof vi.fn>;
        requireManager: ReturnType<typeof vi.fn>;
    };
    let service: HouseRulesService;

    beforeEach(() => {
        repository = {
            findAll: vi.fn().mockResolvedValue([rule]),
            create: vi.fn().mockResolvedValue(rule),
            update: vi.fn().mockResolvedValue({ count: 1 }),
            findOne: vi.fn().mockResolvedValue(rule),
        };
        access = {
            requireMembership: vi.fn().mockResolvedValue({ memberId }),
            requireManager: vi.fn().mockResolvedValue({ memberId }),
        };
        service = new HouseRulesService(
            repository as unknown as HouseRulesRepository,
            access as unknown as ResidenceAccessService
        );
    });

    it("lists only rules for an authorized residence and maps authorship", async () => {
        const result = await service.findAll(homeId, userId);
        expect(repository.findAll).toHaveBeenCalledWith(homeId);
        expect(result[0]).toMatchObject({ title: "Limpeza", createdBy: "Iago", updatedBy: "Iago" });
    });

    it("attributes new rules to the active authenticated membership", async () => {
        await service.create(homeId, { title: "Limpeza", description: "Revezar" }, userId);
        expect(repository.create).toHaveBeenCalledWith(homeId, memberId, {
            title: "Limpeza",
            description: "Revezar",
        });
    });

    it("records the member editing a rule and hides unavailable rules", async () => {
        await service.update(homeId, ruleId, { title: "Nova", description: "Detalhes" }, userId);
        expect(repository.update).toHaveBeenCalledWith(homeId, ruleId, memberId, {
            title: "Nova",
            description: "Detalhes",
        });
        repository.update.mockResolvedValue({ count: 0 });
        await expect(
            service.update(homeId, ruleId, { title: "Nova", description: "Detalhes" }, userId)
        ).rejects.toThrow(NotFoundException);
    });
});
