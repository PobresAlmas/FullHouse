import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateTaskDto, TaskAssignmentType, TaskPeriodicity } from "./dto/create-task.dto.js";
import { TaskListQueryDto } from "./dto/task-list-query.dto.js";
import { UpdateTaskDto } from "./dto/update-task.dto.js";
import { TasksRepository } from "./tasks.repository.js";
import {
    isResidenceManager,
    ResidenceAccessService,
} from "../residences/residence-access.service.js";

@Injectable()
export class TasksService {
    constructor(
        private readonly repository: TasksRepository,
        private readonly residenceAccess: ResidenceAccessService
    ) {}

    async findMembers(residenceId: string, userId: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        return (await this.repository.findMembers(residenceId)).map((member) => ({
            id: member.id,
            name: member.usuario.apelido || member.usuario.nome,
            role: member.papel,
        }));
    }

    async findAll(residenceId: string, userId: string, query: TaskListQueryDto) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        return (await this.repository.findTasks(residenceId, query)).map((task) =>
            this.mapTask(task)
        );
    }

    async findOne(residenceId: string, taskId: string, userId: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        const task = await this.requireTask(residenceId, taskId);
        return this.mapTask(task);
    }

    async create(residenceId: string, data: CreateTaskDto, userId: string) {
        const membership = await this.residenceAccess.requireCreateEditPermission(
            residenceId,
            userId
        );
        const repeats = data.repeats ?? false;
        if (repeats && (!data.periodicity || data.periodicity === TaskPeriodicity.PERSONALIZADA)) {
            throw new BadRequestException("Selecione uma frequÃªncia para a repetiÃ§Ã£o.");
        }
        const rotationIds = data.assigneeIds ?? [];
        if (data.assignmentType === TaskAssignmentType.RODIZIO && rotationIds.length < 2) {
            throw new BadRequestException("Selecione pelo menos dois moradores para o rodízio.");
        }
        const validatedRotation = await Promise.all(
            rotationIds.map((memberId) => this.requireActiveMember(residenceId, memberId))
        );
        const assignee =
            data.assignmentType === TaskAssignmentType.RODIZIO
                ? (validatedRotation[0] ?? null)
                : data.assigneeId
                  ? await this.requireActiveMember(residenceId, data.assigneeId)
                  : null;
        const taskId = await this.repository.create(
            residenceId,
            userId,
            membership.memberId,
            assignee,
            data
        );
        return this.findOne(residenceId, taskId, userId);
    }

    async update(residenceId: string, taskId: string, data: UpdateTaskDto, userId: string) {
        await this.residenceAccess.requireCreateEditPermission(residenceId, userId);
        const existing = await this.requireTask(residenceId, taskId);
        if (existing.status === "CONCLUIDA" || existing.status === "CANCELADA") {
            throw new BadRequestException(
                "NÃ£o Ã© possÃ­vel editar uma tarefa concluÃ­da ou cancelada."
            );
        }

        const currentRecurrence = existing.definicao_tarefa.regra_recorrencia as {
            repeats?: boolean;
        } | null;
        const willRepeat = data.repeats ?? currentRecurrence?.repeats ?? false;
        const frequency = data.periodicity ?? existing.definicao_tarefa.periodicidade;
        if (willRepeat && frequency === TaskPeriodicity.PERSONALIZADA) {
            throw new BadRequestException("Selecione uma frequÃªncia para a repetiÃ§Ã£o.");
        }

        const assignee =
            data.assigneeId === undefined
                ? undefined
                : data.assigneeId === null
                  ? null
                  : await this.requireActiveMember(residenceId, data.assigneeId);
        const rotationIds = data.assigneeIds;
        const assignmentType = data.assignmentType ?? existing.definicao_tarefa.tipo_atribuicao;
        if (assignmentType === TaskAssignmentType.RODIZIO) {
            const ids =
                rotationIds ??
                existing.definicao_tarefa.fila_rodizio.map((entry) => entry.participacao_id);
            if (ids.length < 2) {
                throw new BadRequestException(
                    "Selecione pelo menos dois moradores para o rodízio."
                );
            }
            await Promise.all(
                ids.map((memberId) => this.requireActiveMember(residenceId, memberId))
            );
        }
        const previousReminderMinutes = existing.lembrete[0]
            ? Math.max(
                  0,
                  Math.round(
                      ((existing.prazo_limite ?? existing.data_prevista).getTime() -
                          existing.lembrete[0].lembrar_em.getTime()) /
                          60_000
                  )
              )
            : null;
        const reminderMinutesBefore =
            data.reminderMinutesBefore === undefined
                ? previousReminderMinutes
                : data.reminderMinutesBefore;

        await this.repository.update(
            taskId,
            existing,
            data,
            assignee,
            reminderMinutesBefore,
            userId
        );
        return this.findOne(residenceId, taskId, userId);
    }

    async complete(residenceId: string, taskId: string, userId: string) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const task = await this.requireTask(residenceId, taskId);
        if (task.status === "CONCLUIDA") {
            throw new BadRequestException("A tarefa jÃ¡ foi concluÃ­da.");
        }
        if (task.status === "CANCELADA") {
            throw new BadRequestException("NÃ£o Ã© possÃ­vel concluir uma tarefa cancelada.");
        }
        if (
            !isResidenceManager(membership.role) &&
            task.responsavel_participacao_id !== membership.memberId
        ) {
            throw new BadRequestException(
                "Somente o responsável, um líder ou um administrador pode concluir esta tarefa."
            );
        }
        await this.repository.complete(task, membership.memberId, userId);
        return this.findOne(residenceId, taskId, userId);
    }

    async remove(residenceId: string, taskId: string, userId: string) {
        await this.residenceAccess.requireManager(residenceId, userId);
        const task = await this.requireTask(residenceId, taskId);
        await this.repository.remove(task.definicao_tarefa_id);
        return { id: taskId, deleted: true };
    }

    private async requireActiveMember(residenceId: string, memberId: string) {
        const member = await this.residenceAccess.requireActiveMember(residenceId, memberId);
        if (!member) {
            throw new BadRequestException("O responsÃ¡vel nÃ£o pertence a esta residÃªncia ativa.");
        }
        return { id: member.id, userId: member.usuario_id };
    }

    private async requireTask(residenceId: string, taskId: string) {
        const task = await this.repository.findTask(residenceId, taskId);
        if (!task) throw new NotFoundException("A tarefa nÃ£o estÃ¡ disponÃ­vel.");
        return task;
    }

    private mapTask(task: Awaited<ReturnType<TasksRepository["findTask"]>> & {}) {
        const dueAt = task.prazo_limite ?? task.data_prevista;
        const isOverdue =
            (task.status === "PENDENTE" || task.status === "EM_ANDAMENTO") &&
            dueAt.getTime() < Date.now();
        const assignee =
            task.participacao_instancia_tarefa_responsavel_participacao_idToparticipacao;
        const recurrence = task.definicao_tarefa.regra_recorrencia as { repeats?: boolean } | null;
        const reminder = task.lembrete[0] ?? null;

        return {
            id: task.id,
            definitionId: task.definicao_tarefa_id,
            title: task.definicao_tarefa.titulo,
            description: task.definicao_tarefa.descricao,
            tags: task.definicao_tarefa.tags,
            color: task.definicao_tarefa.cor,
            assignmentType: task.definicao_tarefa.tipo_atribuicao,
            rotationMemberIds:
                task.definicao_tarefa.fila_rodizio?.map((entry) => entry.participacao_id) ?? [],
            residenceId: task.definicao_tarefa.casa_id,
            assignee: assignee
                ? {
                      id: assignee.id,
                      name: assignee.usuario.apelido || assignee.usuario.nome,
                  }
                : null,
            dueAt: dueAt.toISOString(),
            periodicity: task.definicao_tarefa.periodicidade,
            repeats: recurrence?.repeats ?? false,
            reminderAt: reminder?.lembrar_em.toISOString() ?? null,
            status: isOverdue ? "ATRASADA" : task.status,
            completedAt: task.concluida_em?.toISOString() ?? null,
        };
    }
}
