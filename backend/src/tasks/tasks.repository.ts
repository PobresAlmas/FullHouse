import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateTaskDto, TaskAssignmentType, TaskPeriodicity } from "./dto/create-task.dto.js";
import { TaskListQueryDto } from "./dto/task-list-query.dto.js";
import { UpdateTaskDto } from "./dto/update-task.dto.js";

const taskInclude = {
    definicao_tarefa: {
        include: {
            fila_rodizio: { where: { ativo: true }, orderBy: { ordem: "asc" as const } },
            participacao: {
                select: { id: true, usuario: { select: { id: true, nome: true, apelido: true } } },
            },
        },
    },
    participacao_instancia_tarefa_responsavel_participacao_idToparticipacao: {
        select: { id: true, usuario: { select: { id: true, nome: true, apelido: true } } },
    },
    usuario: { select: { id: true, nome: true, apelido: true } },
    lembrete: { where: { enviado: false }, orderBy: { lembrar_em: "asc" as const }, take: 1 },
} as const;

function dateFromIso(value: string) {
    return new Date(value);
}

function dateOnly(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function recurrenceRule(repeats: boolean) {
    return { repeats };
}

@Injectable()
export class TasksRepository {
    constructor(private readonly prisma: PrismaService) {}

    findMembers(residenceId: string) {
        return this.prisma.participacao.findMany({
            where: { casa_id: residenceId, data_saida: null },
            select: {
                id: true,
                papel: true,
                usuario: { select: { nome: true, apelido: true } },
            },
            orderBy: [{ usuario: { nome: "asc" } }, { id: "asc" }],
        });
    }

    findTasks(residenceId: string, query: TaskListQueryDto) {
        return this.prisma.instancia_tarefa.findMany({
            where: {
                definicao_tarefa: {
                    casa_id: residenceId,
                    escopo: "CASA",
                    ...(query.periodicity ? { periodicidade: query.periodicity } : {}),
                    ...(query.search
                        ? {
                              OR: [
                                  { titulo: { contains: query.search, mode: "insensitive" } },
                                  { descricao: { contains: query.search, mode: "insensitive" } },
                                  { tags: { has: query.search } },
                              ],
                          }
                        : {}),
                },
                ...(query.status ? { status: query.status } : { status: { not: "CANCELADA" } }),
                ...(query.assigneeId ? { responsavel_participacao_id: query.assigneeId } : {}),
            },
            include: taskInclude,
            orderBy: [{ prazo_limite: "asc" }, { data_prevista: "asc" }, { id: "asc" }],
        });
    }

    findTask(residenceId: string, taskId: string) {
        return this.prisma.instancia_tarefa.findFirst({
            where: { id: taskId, definicao_tarefa: { casa_id: residenceId, escopo: "CASA" } },
            include: taskInclude,
        });
    }

    async create(
        residenceId: string,
        creatorUserId: string,
        creatorMemberId: string,
        assignee: { id: string; userId: string } | null,
        data: CreateTaskDto
    ) {
        const dueAt = dateFromIso(data.dueAt);
        const repeats = data.repeats ?? false;
        const reminderMinutesBefore = data.reminderMinutesBefore;

        return this.prisma.$transaction(async (transaction) => {
            const definition = await transaction.definicao_tarefa.create({
                data: {
                    escopo: "CASA",
                    casa_id: residenceId,
                    titulo: data.title,
                    descricao: data.description ?? null,
                    tags: data.tags ?? [],
                    cor: data.color ?? null,
                    periodicidade: repeats
                        ? (data.periodicity ?? TaskPeriodicity.SEMANAL)
                        : TaskPeriodicity.PERSONALIZADA,
                    intervalo_dias: null,
                    regra_recorrencia: recurrenceRule(repeats),
                    tipo_atribuicao: data.assignmentType ?? TaskAssignmentType.FIXA,
                    responsavel_fixo_participacao_id:
                        data.assignmentType === TaskAssignmentType.RODIZIO
                            ? null
                            : (assignee?.id ?? null),
                    data_inicio: dateOnly(dueAt),
                    data_fim: repeats ? null : dateOnly(dueAt),
                },
            });
            if (data.assignmentType === TaskAssignmentType.RODIZIO && data.assigneeIds?.length) {
                await transaction.fila_rodizio.createMany({
                    data: data.assigneeIds.map((memberId, ordem) => ({
                        definicao_tarefa_id: definition.id,
                        participacao_id: memberId,
                        ordem,
                    })),
                });
            }
            const instance = await transaction.instancia_tarefa.create({
                data: {
                    definicao_tarefa_id: definition.id,
                    data_prevista: dateOnly(dueAt),
                    prazo_limite: dueAt,
                    responsavel_participacao_id:
                        data.assignmentType === TaskAssignmentType.RODIZIO
                            ? (data.assigneeIds?.[0] ?? null)
                            : (assignee?.id ?? null),
                    ordem_rodizio: data.assignmentType === TaskAssignmentType.RODIZIO ? 0 : null,
                },
            });

            if (reminderMinutesBefore !== undefined && reminderMinutesBefore !== null) {
                await transaction.lembrete.create({
                    data: {
                        usuario_id: assignee?.userId ?? creatorUserId,
                        titulo: data.title,
                        lembrar_em: new Date(dueAt.getTime() - reminderMinutesBefore * 60_000),
                        instancia_tarefa_id: instance.id,
                    },
                });
            }

            return instance.id;
        });
    }

    async update(
        taskId: string,
        existing: NonNullable<Awaited<ReturnType<TasksRepository["findTask"]>>>,
        data: UpdateTaskDto,
        assignee: { id: string; userId: string } | null | undefined,
        reminderMinutesBefore: number | null | undefined,
        currentUserId: string
    ) {
        const dueAt = data.dueAt
            ? dateFromIso(data.dueAt)
            : (existing.prazo_limite ?? existing.data_prevista);
        const recurrence = existing.definicao_tarefa.regra_recorrencia as {
            repeats?: boolean;
        } | null;
        const repeats = data.repeats ?? recurrence?.repeats ?? false;
        const periodicity = data.periodicity ?? existing.definicao_tarefa.periodicidade;
        const title = data.title ?? existing.definicao_tarefa.titulo;
        const assignmentType = data.assignmentType ?? existing.definicao_tarefa.tipo_atribuicao;
        const rotationIds = data.assigneeIds;
        const nextAssigneeId =
            assignmentType === TaskAssignmentType.RODIZIO
                ? (rotationIds?.[0] ??
                  existing.definicao_tarefa.fila_rodizio?.[0]?.participacao_id ??
                  null)
                : assignee === undefined
                  ? undefined
                  : (assignee?.id ?? null);

        await this.prisma.$transaction(async (transaction) => {
            await transaction.definicao_tarefa.update({
                where: { id: existing.definicao_tarefa_id },
                data: {
                    ...(data.title !== undefined ? { titulo: data.title } : {}),
                    ...(data.description !== undefined ? { descricao: data.description } : {}),
                    ...(data.tags !== undefined ? { tags: data.tags } : {}),
                    ...(data.color !== undefined ? { cor: data.color } : {}),
                    ...(data.assignmentType !== undefined
                        ? {
                              tipo_atribuicao: data.assignmentType,
                              responsavel_fixo_participacao_id:
                                  data.assignmentType === TaskAssignmentType.FIXA
                                      ? (nextAssigneeId ?? null)
                                      : null,
                          }
                        : {}),
                    ...(data.repeats !== undefined || data.periodicity !== undefined
                        ? {
                              periodicidade: repeats ? periodicity : TaskPeriodicity.PERSONALIZADA,
                              intervalo_dias: null,
                              regra_recorrencia: recurrenceRule(repeats),
                              data_fim: repeats ? null : dateOnly(dueAt),
                          }
                        : {}),
                    ...(data.dueAt !== undefined && !repeats
                        ? { data_inicio: dateOnly(dueAt), data_fim: dateOnly(dueAt) }
                        : {}),
                    ...(assignee !== undefined && assignmentType === TaskAssignmentType.FIXA
                        ? { responsavel_fixo_participacao_id: assignee?.id ?? null }
                        : {}),
                },
            });
            if (rotationIds !== undefined) {
                await transaction.fila_rodizio.deleteMany({
                    where: { definicao_tarefa_id: existing.definicao_tarefa_id },
                });
                if (assignmentType === TaskAssignmentType.RODIZIO) {
                    await transaction.fila_rodizio.createMany({
                        data: rotationIds.map((memberId, ordem) => ({
                            definicao_tarefa_id: existing.definicao_tarefa_id,
                            participacao_id: memberId,
                            ordem,
                        })),
                    });
                }
            }
            await transaction.instancia_tarefa.update({
                where: { id: taskId },
                data: {
                    ...(data.dueAt !== undefined
                        ? { data_prevista: dateOnly(dueAt), prazo_limite: dueAt }
                        : {}),
                    ...(assignee !== undefined ||
                    rotationIds !== undefined ||
                    data.assignmentType !== undefined
                        ? {
                              responsavel_participacao_id: nextAssigneeId,
                              ordem_rodizio:
                                  assignmentType === TaskAssignmentType.RODIZIO ? 0 : null,
                          }
                        : {}),
                },
            });

            if (
                data.reminderMinutesBefore !== undefined ||
                data.dueAt !== undefined ||
                assignee !== undefined ||
                rotationIds !== undefined ||
                data.assignmentType !== undefined
            ) {
                await transaction.lembrete.deleteMany({ where: { instancia_tarefa_id: taskId } });
                if (reminderMinutesBefore !== null && reminderMinutesBefore !== undefined) {
                    await transaction.lembrete.create({
                        data: {
                            usuario_id:
                                (assignmentType === TaskAssignmentType.RODIZIO
                                    ? rotationIds?.[0]
                                        ? await transaction.participacao
                                              .findUnique({
                                                  where: { id: rotationIds[0] },
                                                  select: { usuario_id: true },
                                              })
                                              .then((member) => member?.usuario_id)
                                        : undefined
                                    : assignee?.userId) ??
                                existing
                                    .participacao_instancia_tarefa_responsavel_participacao_idToparticipacao
                                    ?.usuario.id ??
                                currentUserId,
                            titulo: title,
                            lembrar_em: new Date(dueAt.getTime() - reminderMinutesBefore * 60_000),
                            instancia_tarefa_id: taskId,
                        },
                    });
                }
            }
        });
    }

    complete(
        task: NonNullable<Awaited<ReturnType<TasksRepository["findTask"]>>>,
        memberId: string,
        currentUserId: string
    ) {
        return this.prisma.$transaction(async (transaction) => {
            const dueAt = task.prazo_limite ?? task.data_prevista;
            const reminders = await transaction.lembrete.findMany({
                where: { instancia_tarefa_id: task.id, enviado: false },
                orderBy: { lembrar_em: "asc" },
                take: 1,
            });
            await transaction.lembrete.deleteMany({ where: { instancia_tarefa_id: task.id } });
            const completed = await transaction.instancia_tarefa.update({
                where: { id: task.id },
                data: {
                    status: "CONCLUIDA",
                    concluida_em: new Date(),
                    concluida_por_participacao_id: memberId,
                },
            });

            const recurrence = task.definicao_tarefa.regra_recorrencia as {
                repeats?: boolean;
            } | null;
            if (recurrence?.repeats) {
                const nextDueAt = new Date(dueAt);
                if (task.definicao_tarefa.periodicidade === "DIARIA") {
                    nextDueAt.setUTCDate(nextDueAt.getUTCDate() + 1);
                } else if (task.definicao_tarefa.periodicidade === "SEMANAL") {
                    nextDueAt.setUTCDate(nextDueAt.getUTCDate() + 7);
                } else if (task.definicao_tarefa.periodicidade === "QUINZENAL") {
                    nextDueAt.setUTCDate(nextDueAt.getUTCDate() + 14);
                } else if (task.definicao_tarefa.periodicidade === "MENSAL") {
                    nextDueAt.setUTCMonth(nextDueAt.getUTCMonth() + 1);
                }

                const rotation =
                    task.definicao_tarefa.tipo_atribuicao === TaskAssignmentType.RODIZIO
                        ? task.definicao_tarefa.fila_rodizio
                        : [];
                const currentOrder = task.ordem_rodizio ?? 0;
                const nextOrder = rotation.length ? (currentOrder + 1) % rotation.length : 0;
                const nextAssigneeId =
                    rotation[nextOrder]?.participacao_id ?? task.responsavel_participacao_id;
                const nextAssignee = nextAssigneeId
                    ? await transaction.participacao.findUnique({
                          where: { id: nextAssigneeId },
                          select: { usuario_id: true },
                      })
                    : null;
                const nextInstance = await transaction.instancia_tarefa.create({
                    data: {
                        definicao_tarefa_id: task.definicao_tarefa_id,
                        data_prevista: dateOnly(nextDueAt),
                        prazo_limite: nextDueAt,
                        responsavel_participacao_id: nextAssigneeId,
                        ordem_rodizio: rotation.length ? nextOrder : null,
                    },
                });
                if (reminders[0]) {
                    const reminderMinutesBefore = Math.max(
                        0,
                        Math.round((dueAt.getTime() - reminders[0].lembrar_em.getTime()) / 60_000)
                    );
                    await transaction.lembrete.create({
                        data: {
                            usuario_id:
                                nextAssignee?.usuario_id ??
                                task
                                    .participacao_instancia_tarefa_responsavel_participacao_idToparticipacao
                                    ?.usuario.id ??
                                currentUserId,
                            titulo: task.definicao_tarefa.titulo,
                            lembrar_em: new Date(
                                nextDueAt.getTime() - reminderMinutesBefore * 60_000
                            ),
                            instancia_tarefa_id: nextInstance.id,
                        },
                    });
                }
            }
            return completed;
        });
    }

    async remove(definitionId: string) {
        await this.prisma.$transaction(async (transaction) => {
            await transaction.lembrete.deleteMany({
                where: { instancia_tarefa: { definicao_tarefa_id: definitionId } },
            });
            await transaction.instancia_tarefa.updateMany({
                where: { definicao_tarefa_id: definitionId },
                data: { status: "CANCELADA" },
            });
        });
    }
}
