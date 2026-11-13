import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ResidenceAccessService } from "../residences/residence-access.service.js";
import { CreateTaskExchangeDto } from "./dto/create-task-exchange.dto.js";

const OPEN_STATUSES = ["PENDENTE", "EM_ANDAMENTO", "ATRASADA"] as const;

@Injectable()
export class TaskExchangeService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly residenceAccess: ResidenceAccessService
    ) {}

    async list(residenceId: string, userId: string) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const rows = await this.prisma.solicitacao_troca_tarefa.findMany({
            where: {
                instancia_tarefa: { definicao_tarefa: { casa_id: residenceId, escopo: "CASA" } },
                OR: [
                    { destinatario_participacao_id: membership.memberId },
                    { solicitante_participacao_id: membership.memberId },
                ],
            },
            include: {
                instancia_tarefa: { include: { definicao_tarefa: true } },
                instancia_tarefa_alvo: { include: { definicao_tarefa: true } },
                participacao_solicitacao_troca_tarefa_solicitante_participacao_idToparticipacao: {
                    include: { usuario: { select: { nome: true, apelido: true } } },
                },
                participacao_solicitacao_troca_tarefa_destinatario_participacao_idToparticipacao: {
                    include: { usuario: { select: { nome: true, apelido: true } } },
                },
            },
            orderBy: [{ status: "asc" }, { id: "desc" }],
        });
        return rows.map((row) => ({
            id: row.id,
            status: row.status,
            type: row.tipo,
            incoming: row.destinatario_participacao_id === membership.memberId,
            requester:
                row.participacao_solicitacao_troca_tarefa_solicitante_participacao_idToparticipacao
                    .usuario.apelido ||
                row.participacao_solicitacao_troca_tarefa_solicitante_participacao_idToparticipacao
                    .usuario.nome,
            recipient:
                row.participacao_solicitacao_troca_tarefa_destinatario_participacao_idToparticipacao
                    .usuario.apelido ||
                row.participacao_solicitacao_troca_tarefa_destinatario_participacao_idToparticipacao
                    .usuario.nome,
            task: {
                id: row.instancia_tarefa.id,
                title: row.instancia_tarefa.definicao_tarefa.titulo,
                dueAt: (
                    row.instancia_tarefa.prazo_limite ?? row.instancia_tarefa.data_prevista
                ).toISOString(),
            },
            targetTask: row.instancia_tarefa_alvo
                ? {
                      id: row.instancia_tarefa_alvo.id,
                      title: row.instancia_tarefa_alvo.definicao_tarefa.titulo,
                      dueAt: (
                          row.instancia_tarefa_alvo.prazo_limite ??
                          row.instancia_tarefa_alvo.data_prevista
                      ).toISOString(),
                  }
                : null,
        }));
    }

    async create(residenceId: string, data: CreateTaskExchangeDto, userId: string) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const task = await this.prisma.instancia_tarefa.findFirst({
            where: {
                id: data.taskId,
                definicao_tarefa: { casa_id: residenceId, escopo: "CASA" },
            },
            include: { definicao_tarefa: true },
        });
        if (!task) throw new NotFoundException("A tarefa não está disponível.");
        if (
            task.responsavel_participacao_id !== membership.memberId ||
            !OPEN_STATUSES.includes(task.status as (typeof OPEN_STATUSES)[number])
        ) {
            throw new ForbiddenException("Esta tarefa não permite solicitação de troca.");
        }
        if (data.recipientMemberId === membership.memberId) {
            throw new BadRequestException("Escolha outro morador como destinatário.");
        }
        const recipient = await this.residenceAccess.requireActiveMember(
            residenceId,
            data.recipientMemberId
        );
        if (!recipient)
            throw new BadRequestException("O destinatário não pertence à residência ativa.");
        const suggestedTask = data.targetTaskId
            ? await this.prisma.instancia_tarefa.findFirst({
                  where: {
                      id: data.targetTaskId,
                      responsavel_participacao_id: recipient.id,
                      status: { in: [...OPEN_STATUSES] },
                      definicao_tarefa: {
                          casa_id: residenceId,
                          escopo: "CASA",
                          visibilidade: "PUBLICA",
                      },
                  },
              })
            : null;
        if (data.targetTaskId && !suggestedTask) {
            throw new BadRequestException(
                "A tarefa sugerida precisa estar aberta, visível e atribuída ao destinatário."
            );
        }
        if (suggestedTask?.id === task.id) {
            throw new BadRequestException("Escolha uma tarefa diferente da tarefa oferecida.");
        }

        try {
            const request = await this.prisma.$transaction(
                async (transaction) => {
                    const pending = await transaction.solicitacao_troca_tarefa.findFirst({
                        where: {
                            status: "PENDENTE",
                            OR: [
                                { instancia_tarefa_id: { in: [task.id, ...(suggestedTask ? [suggestedTask.id] : [])] } },
                                { alvo_instancia_tarefa_id: { in: [task.id, ...(suggestedTask ? [suggestedTask.id] : [])] } },
                            ],
                        },
                    });
                    if (pending) {
                        throw new BadRequestException(
                            "Esta tarefa já possui uma solicitação pendente."
                        );
                    }
                    return transaction.solicitacao_troca_tarefa.create({
                        data: {
                            instancia_tarefa_id: task.id,
                            alvo_instancia_tarefa_id: suggestedTask?.id ?? null,
                            solicitante_participacao_id: membership.memberId,
                            destinatario_participacao_id: recipient.id,
                            tipo: "PONTUAL",
                        },
                    });
                },
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
            );
            return { id: request.id, status: request.status };
        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "P2034"
            ) {
                throw new BadRequestException(
                    "Esta tarefa já possui uma solicitação pendente. Atualize a lista e tente novamente."
                );
            }
            throw error;
        }
    }

    async respond(
        residenceId: string,
        requestId: string,
        status: "ACEITA" | "RECUSADA",
        targetTaskId: string | undefined,
        userId: string
    ) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const request = await this.prisma.solicitacao_troca_tarefa.findFirst({
            where: {
                id: requestId,
                destinatario_participacao_id: membership.memberId,
                status: "PENDENTE",
                instancia_tarefa: { definicao_tarefa: { casa_id: residenceId, escopo: "CASA" } },
            },
            include: {
                instancia_tarefa: { include: { definicao_tarefa: true } },
                instancia_tarefa_alvo: { include: { definicao_tarefa: true } },
            },
        });
        if (!request) throw new NotFoundException("A solicitação não está disponível.");
        const selectedTargetTaskId = targetTaskId ?? request.alvo_instancia_tarefa_id ?? undefined;
        const targetTask =
            status === "ACEITA" && selectedTargetTaskId
                ? await this.prisma.instancia_tarefa.findFirst({
                      where: {
                          id: selectedTargetTaskId,
                          responsavel_participacao_id: membership.memberId,
                          status: { in: [...OPEN_STATUSES] },
                          definicao_tarefa: { casa_id: residenceId, escopo: "CASA" },
                      },
                  })
                : null;
        if (status === "ACEITA" && !targetTask) {
            throw new BadRequestException("Escolha uma tarefa sua aberta para completar a troca.");
        }
        if (targetTask?.id === request.instancia_tarefa_id) {
            throw new BadRequestException("Escolha uma tarefa diferente da tarefa recebida.");
        }

        return this.prisma.$transaction(
            async (transaction) => {
                if (status === "ACEITA" && targetTask) {
                    const pending = await transaction.solicitacao_troca_tarefa.findFirst({
                        where: {
                            status: "PENDENTE",
                            id: { not: request.id },
                            OR: [
                                { instancia_tarefa_id: { in: [request.instancia_tarefa_id, targetTask.id] } },
                                { alvo_instancia_tarefa_id: { in: [request.instancia_tarefa_id, targetTask.id] } },
                            ],
                        },
                    });
                    if (pending) {
                        throw new BadRequestException("Uma das tarefas já possui outra solicitação pendente.");
                    }
                    const updatedTask = await transaction.instancia_tarefa.updateMany({
                        where: {
                            id: request.instancia_tarefa_id,
                            responsavel_participacao_id: request.solicitante_participacao_id,
                            status: { in: [...OPEN_STATUSES] },
                        },
                        data: {
                            responsavel_participacao_id: membership.memberId,
                            responsavel_usuario_id: null,
                        },
                    });
                    if (updatedTask.count !== 1) {
                        throw new BadRequestException("A responsabilidade da tarefa foi alterada.");
                    }
                    const updatedTargetTask = await transaction.instancia_tarefa.updateMany({
                        where: {
                            id: targetTask.id,
                            responsavel_participacao_id: membership.memberId,
                            status: { in: [...OPEN_STATUSES] },
                        },
                        data: {
                            responsavel_participacao_id: request.solicitante_participacao_id,
                            responsavel_usuario_id: null,
                        },
                    });
                    if (updatedTargetTask.count !== 1) {
                        throw new BadRequestException("A tarefa oferecida não está mais disponível.");
                    }
                }
                const updatedRequest = await transaction.solicitacao_troca_tarefa.updateMany({
                    where: { id: request.id, status: "PENDENTE" },
                    data: {
                        status,
                        ...(status === "ACEITA" && targetTask
                            ? { alvo_instancia_tarefa_id: targetTask.id }
                            : {}),
                    },
                });
                if (updatedRequest.count !== 1) {
                    throw new BadRequestException("A solicitação já foi respondida.");
                }
                return { id: request.id, status };
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
    }
}
