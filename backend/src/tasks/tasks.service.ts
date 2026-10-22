import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateTaskDto, TaskPeriodicity } from "./dto/create-task.dto.js";
import { TaskListQueryDto } from "./dto/task-list-query.dto.js";
import { UpdateTaskDto } from "./dto/update-task.dto.js";
import { TasksRepository } from "./tasks.repository.js";

@Injectable()
export class TasksService {
    constructor(private readonly repository: TasksRepository) {}

    async findMembers(residenceId: string, userId: string) {
        await this.requireResidence(residenceId, userId);
        return (await this.repository.findMembers(residenceId)).map((member) => ({
            id: member.id,
            name: member.usuario.apelido || member.usuario.nome,
            role: member.papel,
        }));
    }

    async findAll(residenceId: string, userId: string, query: TaskListQueryDto) {
        await this.requireResidence(residenceId, userId);
        return (await this.repository.findTasks(residenceId, query)).map((task) =>
            this.mapTask(task)
        );
    }

    async findOne(residenceId: string, taskId: string, userId: string) {
        await this.requireResidence(residenceId, userId);
        const task = await this.requireTask(residenceId, taskId);
        return this.mapTask(task);
    }

    async create(residenceId: string, data: CreateTaskDto, userId: string) {
        const residence = await this.requireResidence(residenceId, userId);
        const repeats = data.repeats ?? false;
        if (repeats && (!data.periodicity || data.periodicity === TaskPeriodicity.PERSONALIZADA)) {
            throw new BadRequestException("Selecione uma frequÃªncia para a repetiÃ§Ã£o.");
        }
        const assignee = data.assigneeId
            ? await this.requireActiveMember(residenceId, data.assigneeId)
            : null;
        const taskId = await this.repository.create(
            residenceId,
            userId,
            residence.participacao[0].id,
            assignee,
            data
        );
        return this.findOne(residenceId, taskId, userId);
    }

    async update(residenceId: string, taskId: string, data: UpdateTaskDto, userId: string) {
        await this.requireResidence(residenceId, userId);
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
        const residence = await this.requireResidence(residenceId, userId);
        const task = await this.requireTask(residenceId, taskId);
        if (task.status === "CONCLUIDA") {
            throw new BadRequestException("A tarefa jÃ¡ foi concluÃ­da.");
        }
        if (task.status === "CANCELADA") {
            throw new BadRequestException("NÃ£o Ã© possÃ­vel concluir uma tarefa cancelada.");
        }
        await this.repository.complete(task, residence.participacao[0].id, userId);
        return this.findOne(residenceId, taskId, userId);
    }

    async remove(residenceId: string, taskId: string, userId: string) {
        await this.requireResidence(residenceId, userId);
        const task = await this.requireTask(residenceId, taskId);
        await this.repository.remove(task.definicao_tarefa_id);
        return { id: taskId, deleted: true };
    }

    private async requireResidence(residenceId: string, userId: string) {
        const residence = await this.repository.findResidenceMembership(residenceId, userId);
        if (!residence || residence.participacao.length === 0) {
            throw new NotFoundException("A residÃªncia nÃ£o estÃ¡ disponÃ­vel.");
        }
        return residence;
    }

    private async requireActiveMember(residenceId: string, memberId: string) {
        const member = await this.repository.findActiveMember(residenceId, memberId);
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
            status: task.status,
            completedAt: task.concluida_em?.toISOString() ?? null,
        };
    }
}
