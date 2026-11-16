import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { ResidenceAccessService } from "../residences/residence-access.service.js";
import { CreateHouseRuleDto } from "./dto/create-house-rule.dto.js";
import { HouseRulesRepository } from "./house-rules.repository.js";

type HouseRuleRecord = Prisma.regra_convivenciaGetPayload<{
    include: {
        participacao_regra_convivencia_criada_por_participacao_idToparticipacao: {
            select: { usuario: { select: { nome: true; apelido: true } } };
        };
        participacao_regra_convivencia_atualizada_por_participacao_idToparticipacao: {
            select: { usuario: { select: { nome: true; apelido: true } } };
        };
    };
}>;

@Injectable()
export class HouseRulesService {
    constructor(
        private readonly repository: HouseRulesRepository,
        private readonly residenceAccess: ResidenceAccessService
    ) {}

    async findAll(residenceId: string, userId: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        return (await this.repository.findAll(residenceId)).map((rule) => this.mapRule(rule));
    }

    async create(residenceId: string, data: CreateHouseRuleDto, userId: string) {
        const member = await this.residenceAccess.requireMembership(residenceId, userId);
        return this.mapRule(await this.repository.create(residenceId, member.memberId, data));
    }

    async update(residenceId: string, ruleId: string, data: CreateHouseRuleDto, userId: string) {
        const member = await this.residenceAccess.requireMembership(residenceId, userId);
        const updated = await this.repository.update(residenceId, ruleId, member.memberId, data);
        if (!updated.count) throw new NotFoundException("A regra não está disponível.");
        const rule = await this.repository.findOne(residenceId, ruleId);
        if (!rule) throw new NotFoundException("A regra não está disponível.");
        return this.mapRule(rule);
    }

    private mapRule(rule: HouseRuleRecord) {
        const creator =
            rule.participacao_regra_convivencia_criada_por_participacao_idToparticipacao.usuario;
        const editor =
            rule.participacao_regra_convivencia_atualizada_por_participacao_idToparticipacao
                ?.usuario;
        return {
            id: rule.id,
            title: rule.titulo,
            description: rule.descricao,
            createdAt: rule.criado_em,
            createdBy: creator.apelido || creator.nome,
            updatedBy: editor ? editor.apelido || editor.nome : creator.apelido || creator.nome,
        };
    }
}
