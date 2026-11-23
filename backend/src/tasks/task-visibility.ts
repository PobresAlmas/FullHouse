import type { Prisma } from "../generated/prisma/client.js";

function assignedHouseTask(userId: string, residenceId?: string) {
    return {
        participacao_instancia_tarefa_responsavel_participacao_idToparticipacao: {
            usuario_id: userId,
            data_saida: null,
            ...(residenceId ? { casa_id: residenceId } : {}),
        },
    } satisfies Prisma.instancia_tarefaWhereInput;
}

export function visibleHouseTask(userId: string, residenceId: string) {
    return {
        OR: [
            { definicao_tarefa: { visibilidade: "PUBLICA" } },
            {
                definicao_tarefa: { visibilidade: "PRIVADA" },
                ...assignedHouseTask(userId, residenceId),
            },
        ],
    } satisfies Prisma.instancia_tarefaWhereInput;
}

export function personalTaskList(userId: string) {
    return {
        status: { not: "CANCELADA" },
        OR: [
            { definicao_tarefa: { escopo: "INDIVIDUAL", casa_id: null, usuario_id: userId } },
            {
                definicao_tarefa: {
                    escopo: "CASA",
                    casa: {
                        status: "ATIVA",
                        excluido_em: null,
                        participacao: { some: { usuario_id: userId, data_saida: null } },
                    },
                },
                ...assignedHouseTask(userId),
            },
        ],
    } satisfies Prisma.instancia_tarefaWhereInput;
}
