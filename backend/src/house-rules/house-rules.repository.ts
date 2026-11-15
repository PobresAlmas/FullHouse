import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

const ruleInclude = {
    participacao_regra_convivencia_criada_por_participacao_idToparticipacao: {
        select: { usuario: { select: { nome: true, apelido: true } } },
    },
    participacao_regra_convivencia_atualizada_por_participacao_idToparticipacao: {
        select: { usuario: { select: { nome: true, apelido: true } } },
    },
} as const;

@Injectable()
export class HouseRulesRepository {
    constructor(private readonly prisma: PrismaService) {}

    findAll(residenceId: string) {
        return this.prisma.regra_convivencia.findMany({
            where: { casa_id: residenceId, escopo: "CASA", subgrupo_id: null, status: "VIGENTE" },
            include: ruleInclude,
            orderBy: [{ criado_em: "desc" }, { id: "asc" }],
        });
    }

    create(residenceId: string, memberId: string, data: { title: string; description: string }) {
        return this.prisma.regra_convivencia.create({
            data: {
                casa_id: residenceId,
                titulo: data.title,
                descricao: data.description,
                escopo: "CASA",
                criada_por_participacao_id: memberId,
            },
            include: ruleInclude,
        });
    }

    findOne(residenceId: string, ruleId: string) {
        return this.prisma.regra_convivencia.findFirst({
            where: {
                id: ruleId,
                casa_id: residenceId,
                escopo: "CASA",
                subgrupo_id: null,
                status: "VIGENTE",
            },
            include: ruleInclude,
        });
    }

    update(
        residenceId: string,
        ruleId: string,
        memberId: string,
        data: { title: string; description: string }
    ) {
        return this.prisma.regra_convivencia.updateMany({
            where: {
                id: ruleId,
                casa_id: residenceId,
                escopo: "CASA",
                subgrupo_id: null,
                status: "VIGENTE",
            },
            data: {
                titulo: data.title,
                descricao: data.description,
                atualizada_por_participacao_id: memberId,
            },
        });
    }
}
