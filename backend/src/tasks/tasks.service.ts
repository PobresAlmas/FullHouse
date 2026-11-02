import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
    CreateTaskDto,
    TaskAssignmentType,
    TaskPeriodicity,
    TaskVisibility,
} from "./dto/create-task.dto.js";
import { TaskListQueryDto } from "./dto/task-list-query.dto.js";
import { UpdateTaskDto } from "./dto/update-task.dto.js";
import { TasksRepository } from "./tasks.repository.js";
import {
    isResidenceManager,
    ResidenceAccessService,
} from "../residences/residence-access.service.js";
import {
    getNextOccurrenceDate,
    getReminderLeadMinutes,
    planTaskCompletion,
} from "./task-completion.js";

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

    async findPersonal(userId: string) {
        return (await this.repository.findPersonalTasks(userId)).map((task) => this.mapTask(task));
    }

    async findPersonalOne(taskId: string, userId: string) {
        const task = await this.repository.findPersonalTask(userId, taskId);
        if (!task) throw new NotFoundException("A tarefa não está disponível.");
        return this.mapTask(task);
    }

    async createPersonal(data: CreateTaskDto, userId: string) {
        if (
            data.assigneeId ||
            data.assigneeIds?.length ||
            data.assignmentType === TaskAssignmentType.RODIZIO
        ) {
            throw new BadRequestException("Tarefas pessoais pertencem somente a você.");
        }
        if (
            data.repeats &&
            (!data.periodicity || data.periodicity === TaskPeriodicity.PERSONALIZADA)
        ) {
            throw new BadRequestException("Selecione uma frequência para a repetição.");
        }
        const taskId = await this.repository.createPersonal(userId, data);
        return this.findPersonalOne(taskId, userId);
    }

    async updatePersonal(taskId: string, data: UpdateTaskDto, userId: string) {
        if (
            data.assigneeId !== undefined ||
            data.assigneeIds !== undefined ||
            data.assignmentType !== undefined
        ) {
            throw new BadRequestException("Tarefas pessoais pertencem somente a você.");
        }
        const existing = await this.repository.findPersonalTask(userId, taskId);
        if (!existing) throw new NotFoundException("A tarefa não está disponível.");
        if (existing.status === "CONCLUIDA" || existing.status === "CANCELADA") {
            throw new BadRequestException(
                "Não é possível editar uma tarefa concluída ou cancelada."
            );
        }
        const repeats =
            data.repeats ??
            (existing.definicao_tarefa.regra_recorrencia as { repeats?: boolean } | null)
                ?.repeats ??
            false;
        const periodicity = data.periodicity ?? existing.definicao_tarefa.periodicidade;
        if (repeats && periodicity === TaskPeriodicity.PERSONALIZADA) {
            throw new BadRequestException("Selecione uma frequência para a repetição.");
        }
        await this.repository.updatePersonal(taskId, existing, data, userId);
        return this.findPersonalOne(taskId, userId);
    }

    async completePersonal(taskId: string, userId: string) {
        const task = await this.repository.findPersonalTask(userId, taskId);
        if (!task) throw new NotFoundException("A tarefa não está disponível.");
        if (task.status === "CONCLUIDA" || task.status === "CANCELADA") {
            throw new BadRequestException("Esta tarefa não pode ser concluída novamente.");
        }
        const recurrence = task.definicao_tarefa.regra_recorrencia as { repeats?: boolean } | null;
        const dueAt = task.prazo_limite ?? task.data_prevista;
        const nextDueAt = recurrence?.repeats
            ? getNextOccurrenceDate(dueAt, task.definicao_tarefa.periodicidade)
            : null;
        const reminderLead = getReminderLeadMinutes(dueAt, task.lembrete[0]?.lembrar_em);
        await this.repository.completePersonal(
            taskId,
            userId,
            new Date(),
            nextDueAt,
            reminderLead,
            task.definicao_tarefa.titulo
        );
        return this.findPersonalOne(taskId, userId);
    }

    async removePersonal(taskId: string, userId: string) {
        if (!(await this.repository.removePersonal(userId, taskId))) {
            throw new NotFoundException("A tarefa não está disponível.");
        }
        return { id: taskId, deleted: true };
    }

    async findAll(residenceId: string, userId: string, query: TaskListQueryDto) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        return (await this.repository.findTasks(residenceId, query, userId)).map((task) =>
            this.mapTask(task)
        );
    }

    async findOne(residenceId: string, taskId: string, userId: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        const task = await this.requireTask(residenceId, taskId, userId);
        return this.mapTask(task);
    }

    async create(residenceId: string, data: CreateTaskDto, userId: string) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const repeats = data.repeats ?? false;
        if (repeats && (!data.periodicity || data.periodicity === TaskPeriodicity.PERSONALIZADA)) {
            throw new BadRequestException("Selecione uma frequÃªncia para a repetiÃ§Ã£o.");
        }
        const mayAssignOthers =
            membership.creationEditPolicy !== "LIDERES" || isResidenceManager(membership.role);
        const rotationIds = data.assigneeIds ?? [];
        const assignmentType = data.assignmentType ?? TaskAssignmentType.FIXA;
        if (!mayAssignOthers) {
            if (
                data.assignmentType === TaskAssignmentType.RODIZIO ||
                (data.assigneeId && data.assigneeId !== membership.memberId)
            ) {
                throw new BadRequestException("Você só pode atribuir a tarefa a si mesmo.");
            }
        }
        const effectiveAssigneeId = mayAssignOthers ? data.assigneeId : membership.memberId;
        if (data.visibility === TaskVisibility.PRIVADA && assignmentType === TaskAssignmentType.RODIZIO) {
            throw new BadRequestException("Tarefas privadas precisam de um responsável fixo.");
        }
        const rotationIdsForTask = mayAssignOthers ? rotationIds : [];
        if (assignmentType === TaskAssignmentType.RODIZIO && rotationIdsForTask.length < 2) {
            throw new BadRequestException("Selecione pelo menos dois moradores para o rodízio.");
        }
        const validatedRotation = await Promise.all(
            rotationIdsForTask.map((memberId) => this.requireActiveMember(residenceId, memberId))
        );
        const assignee =
            assignmentType === TaskAssignmentType.RODIZIO
                ? (validatedRotation[0] ?? null)
                : effectiveAssigneeId
                  ? await this.requireActiveMember(residenceId, effectiveAssigneeId)
                  : null;
        if (!assignee) {
            throw new BadRequestException(
                mayAssignOthers
                    ? "Selecione um responsável pela tarefa."
                    : "Selecione você como responsável pela tarefa."
            );
        }
        if (data.visibility === TaskVisibility.PRIVADA && assignee?.id !== membership.memberId) {
            throw new BadRequestException("Tarefas privadas só podem ser atribuídas a você.");
        }
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
        const membership = await this.residenceAccess.requireCreateEditPermission(
            residenceId,
            userId
        );
        const existing = await this.requireTask(residenceId, taskId, userId);
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

        const assignmentType = data.assignmentType ?? existing.definicao_tarefa.tipo_atribuicao;
        const fallbackAssigneeId =
            data.assignmentType === TaskAssignmentType.FIXA
                ? (existing.responsavel_participacao_id ??
                  existing.definicao_tarefa.fila_rodizio[0]?.participacao_id ??
                  null)
                : undefined;
        const requestedAssigneeId =
            data.assigneeId === undefined && data.assignmentType === TaskAssignmentType.FIXA
                ? fallbackAssigneeId
                : data.assigneeId;
        const assignee =
            requestedAssigneeId === undefined
                ? undefined
                : requestedAssigneeId === null
                  ? null
                  : await this.requireActiveMember(residenceId, requestedAssigneeId);
        const rotationIds = data.assigneeIds;
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
        const effectiveAssigneeId =
            assignmentType === TaskAssignmentType.RODIZIO
                ? (rotationIds?.[0] ??
                  existing.responsavel_participacao_id ??
                  existing.definicao_tarefa.fila_rodizio[0]?.participacao_id ??
                  null)
                : assignee === undefined
                  ? existing.responsavel_participacao_id
                  : (assignee?.id ?? null);
        if (!effectiveAssigneeId) {
            throw new BadRequestException("Selecione um responsável pela tarefa.");
        }
        if (
            (data.visibility ?? existing.definicao_tarefa.visibilidade) ===
                TaskVisibility.PRIVADA &&
            (assignmentType === TaskAssignmentType.RODIZIO ||
                effectiveAssigneeId !== membership.memberId)
        ) {
            throw new BadRequestException(
                "Tarefas privadas só podem ser atribuídas a você sem rodízio."
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
        const task = await this.requireTask(residenceId, taskId, userId);
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
        const recurrence = task.definicao_tarefa.regra_recorrencia as {
            repeats?: boolean;
        } | null;
        const plan = planTaskCompletion({
            completedAt: new Date(),
            dueAt: task.prazo_limite ?? task.data_prevista,
            repeats: recurrence?.repeats ?? false,
            periodicity: task.definicao_tarefa.periodicidade,
            assignmentType: task.definicao_tarefa.tipo_atribuicao,
            rotation: task.definicao_tarefa.fila_rodizio.map((entry) => ({
                memberId: entry.participacao_id,
                userId: entry.participacao.usuario_id,
            })),
            currentRotationOrder: task.ordem_rodizio,
            currentAssigneeId: task.responsavel_participacao_id,
            currentAssigneeUserId:
                task.participacao_instancia_tarefa_responsavel_participacao_idToparticipacao
                    ?.usuario.id,
            reminderAt: task.lembrete[0]?.lembrar_em,
            title: task.definicao_tarefa.titulo,
            currentUserId: userId,
        });
        await this.repository.complete(taskId, membership.memberId, plan);
        return this.findOne(residenceId, taskId, userId);
    }

    async remove(residenceId: string, taskId: string, userId: string) {
        await this.residenceAccess.requireManager(residenceId, userId);
        const task = await this.requireTask(residenceId, taskId, userId);
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

    private async requireTask(residenceId: string, taskId: string, userId: string) {
        const task = await this.repository.findTask(residenceId, taskId, userId);
        if (!task) throw new NotFoundException("A tarefa nÃ£o estÃ¡ disponÃ­vel.");
        return task;
    }

    private mapTask(task: Awaited<ReturnType<TasksRepository["findTask"]>> & {}) {
        const dueAt = task.prazo_limite ?? task.data_prevista;
        const isOverdue =
            (task.status === "PENDENTE" || task.status === "EM_ANDAMENTO") &&
            dueAt.getTime() < Date.now();
        const memberAssignee =
            task.participacao_instancia_tarefa_responsavel_participacao_idToparticipacao;
        const userAssignee = task.usuario;
        const recurrence = task.definicao_tarefa.regra_recorrencia as { repeats?: boolean } | null;
        const reminder = task.lembrete[0] ?? null;

        return {
            id: task.id,
            definitionId: task.definicao_tarefa_id,
            title: task.definicao_tarefa.titulo,
            description: task.definicao_tarefa.descricao,
            tags: task.definicao_tarefa.tags,
            color: task.definicao_tarefa.cor,
            visibility: task.definicao_tarefa.visibilidade,
            scope: task.definicao_tarefa.escopo,
            assignmentType: task.definicao_tarefa.tipo_atribuicao,
            rotationMemberIds:
                task.definicao_tarefa.fila_rodizio?.map((entry) => entry.participacao_id) ?? [],
            residenceId: task.definicao_tarefa.casa_id,
            assignee: memberAssignee
                ? {
                      id: memberAssignee.id,
                      name: memberAssignee.usuario.apelido || memberAssignee.usuario.nome,
                  }
                : userAssignee
                  ? { id: userAssignee.id, name: userAssignee.apelido || userAssignee.nome }
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
