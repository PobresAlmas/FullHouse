import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { personalTaskList } from "../tasks/task-visibility.js";

const taskSelect = {
    id: true,
    data_prevista: true,
    prazo_limite: true,
    status: true,
    concluida_em: true,
    definicao_tarefa: { select: { titulo: true } },
} as const;

@Injectable()
export class HomeRepository {
    constructor(private readonly prisma: PrismaService) {}

    findPersonalTasks(userId: string) {
        return this.prisma.instancia_tarefa.findMany({
            where: personalTaskList(userId),
            select: taskSelect,
            orderBy: [{ prazo_limite: "asc" }, { data_prevista: "asc" }],
        });
    }

    findPersonalExpenses(userId: string) {
        return this.prisma.despesa.findMany({
            where: { escopo: "INDIVIDUAL", usuario_id: userId, status: { not: "CANCELADA" } },
            select: {
                id: true,
                descricao: true,
                valor_total: true,
                data_vencimento: true,
                status: true,
                quitada_em: true,
            },
            orderBy: [{ data_vencimento: "asc" }, { id: "asc" }],
        });
    }

    findResidenceNotices(residenceId: string) {
        return this.prisma.aviso_casa.findMany({
            where: { casa_id: residenceId },
            select: {
                id: true,
                conteudo: true,
                criado_em: true,
                participacao: {
                    select: {
                        usuario: { select: { id: true, nome: true, apelido: true } },
                    },
                },
            },
            orderBy: [{ criado_em: "desc" }, { id: "desc" }],
            take: 8,
        });
    }

    createResidenceNotice(residenceId: string, memberId: string, content: string) {
        return this.prisma.aviso_casa.create({
            data: {
                casa_id: residenceId,
                participacao_id: memberId,
                conteudo: content,
            },
            select: {
                id: true,
                conteudo: true,
                criado_em: true,
                participacao: {
                    select: {
                        usuario: { select: { id: true, nome: true, apelido: true } },
                    },
                },
            },
        });
    }

    async updateResidenceNotice(
        residenceId: string,
        noticeId: string,
        memberId: string,
        content: string
    ) {
        const result = await this.prisma.aviso_casa.updateMany({
            where: { id: noticeId, casa_id: residenceId, participacao_id: memberId },
            data: { conteudo: content },
        });
        if (!result.count) return null;
        return this.prisma.aviso_casa.findFirst({
            where: { id: noticeId, casa_id: residenceId },
            select: {
                id: true,
                conteudo: true,
                criado_em: true,
                participacao: {
                    select: {
                        usuario: { select: { id: true, nome: true, apelido: true } },
                    },
                },
            },
        });
    }

    deleteResidenceNotice(residenceId: string, noticeId: string, memberId: string) {
        return this.prisma.aviso_casa.deleteMany({
            where: { id: noticeId, casa_id: residenceId, participacao_id: memberId },
        });
    }
}
