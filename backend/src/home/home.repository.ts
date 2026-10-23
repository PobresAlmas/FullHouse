import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

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
            where: {
                definicao_tarefa: { escopo: "INDIVIDUAL", usuario_id: userId },
                status: { not: "CANCELADA" },
            },
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
}
