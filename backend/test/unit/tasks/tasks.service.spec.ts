import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { TasksService } from "../../../src/tasks/tasks.service.js";
import { TaskPeriodicity } from "../../../src/tasks/dto/create-task.dto.js";

const residenceId = "residence-id";
const userId = "user-id";
const taskId = "task-id";
const memberId = "member-id";
const dueAt = new Date("2099-10-20T18:00:00.000Z");

function makeTask(overrides: Record<string, unknown> = {}) {
    return {
        id: taskId,
        definicao_tarefa_id: "definition-id",
        prazo_limite: dueAt,
        data_prevista: new Date("2099-10-20T00:00:00.000Z"),
        responsavel_participacao_id: memberId,
        ordem_rodizio: 0,
        status: "PENDENTE",
        concluida_em: null,
        definicao_tarefa: {
            titulo: "Limpar cozinha",
            descricao: "Limpar bancada e pia",
            tags: ["cozinha"],
            cor: null,
            tipo_atribuicao: "FIXA",
            fila_rodizio: [],
            casa_id: residenceId,
            periodicidade: TaskPeriodicity.PERSONALIZADA,
            regra_recorrencia: { repeats: false },
        },
        participacao_instancia_tarefa_responsavel_participacao_idToparticipacao: {
            id: memberId,
            usuario: { nome: "Ana Souza", apelido: "Ana" },
        },
        lembrete: [{ lembrar_em: new Date("2099-10-20T17:30:00.000Z") }],
        ...overrides,
    };
}

describe("TasksService business rules", () => {
    let repository: {
        findMembers: ReturnType<typeof vi.fn>;
        findTasks: ReturnType<typeof vi.fn>;
        findTask: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        complete: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
    };
    let residenceAccess: {
        requireMembership: ReturnType<typeof vi.fn>;
        requireCreateEditPermission: ReturnType<typeof vi.fn>;
        requireManager: ReturnType<typeof vi.fn>;
        requireActiveMember: ReturnType<typeof vi.fn>;
    };
    let service: TasksService;

    beforeEach(() => {
        repository = {
            findMembers: vi.fn().mockResolvedValue([
                { id: memberId, papel: "MORADOR", usuario: { nome: "Ana Souza", apelido: "Ana" } },
                { id: "member-2", papel: "LIDER", usuario: { nome: "Bruno Lima", apelido: null } },
            ]),
            findTasks: vi.fn().mockResolvedValue([makeTask()]),
            findTask: vi.fn().mockResolvedValue(makeTask()),
            create: vi.fn().mockResolvedValue(taskId),
            update: vi.fn().mockResolvedValue(undefined),
            complete: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined),
        };
        const membership = {
            residenceId,
            memberId,
            role: "MORADOR",
            creationEditPolicy: "TODOS",
        };
        residenceAccess = {
            requireMembership: vi.fn().mockResolvedValue(membership),
            requireCreateEditPermission: vi.fn().mockResolvedValue(membership),
            requireManager: vi.fn().mockResolvedValue(membership),
            requireActiveMember: vi.fn().mockResolvedValue({ id: memberId, usuario_id: userId }),
        };
        service = new TasksService(repository as never, residenceAccess as never);
    });

    it("lists active residents with nickname fallback and maps task fields", async () => {
        await expect(service.findMembers(residenceId, userId)).resolves.toEqual([
            { id: memberId, name: "Ana", role: "MORADOR" },
            { id: "member-2", name: "Bruno Lima", role: "LIDER" },
        ]);
        await expect(service.findAll(residenceId, userId, {})).resolves.toEqual([
            {
                id: taskId,
                definitionId: "definition-id",
                title: "Limpar cozinha",
                description: "Limpar bancada e pia",
                tags: ["cozinha"],
                color: null,
                assignmentType: "FIXA",
                rotationMemberIds: [],
                residenceId,
                assignee: { id: memberId, name: "Ana" },
                dueAt: dueAt.toISOString(),
                periodicity: TaskPeriodicity.PERSONALIZADA,
                repeats: false,
                reminderAt: "2099-10-20T17:30:00.000Z",
                status: "PENDENTE",
                completedAt: null,
            },
        ]);
        expect(repository.findTasks).toHaveBeenCalledWith(residenceId, {});
    });

    it("does not expose tasks when the user has no active residence membership", async () => {
        residenceAccess.requireMembership.mockRejectedValue(new NotFoundException());

        await expect(service.findAll(residenceId, userId, {})).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(repository.findTasks).not.toHaveBeenCalled();
    });

    it("creates a task after validating its active assignee", async () => {
        const input = {
            title: "Lavar louça",
            dueAt: "2099-10-20T18:00:00.000Z",
            assigneeId: memberId,
            repeats: true,
            periodicity: TaskPeriodicity.SEMANAL,
            reminderMinutesBefore: 30,
        };

        await service.create(residenceId, input, userId);

        expect(residenceAccess.requireActiveMember).toHaveBeenCalledWith(residenceId, memberId);
        expect(repository.create).toHaveBeenCalledWith(
            residenceId,
            userId,
            memberId,
            { id: memberId, userId },
            input
        );
        expect(repository.findTask).toHaveBeenCalledWith(residenceId, taskId);
    });

    it("rejects recurring tasks without a supported frequency", async () => {
        await expect(
            service.create(
                residenceId,
                {
                    title: "Limpar cozinha",
                    dueAt: dueAt.toISOString(),
                    repeats: true,
                    periodicity: TaskPeriodicity.PERSONALIZADA,
                },
                userId
            )
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(repository.create).not.toHaveBeenCalled();
    });

    it("rejects an assignee who is not an active member of the residence", async () => {
        residenceAccess.requireActiveMember.mockResolvedValue(null);

        await expect(
            service.create(
                residenceId,
                {
                    title: "Limpar cozinha",
                    dueAt: dueAt.toISOString(),
                    assigneeId: "inactive-member",
                },
                userId
            )
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(repository.create).not.toHaveBeenCalled();
    });

    it.each(["CONCLUIDA", "CANCELADA"])("does not allow editing a %s task", async (status) => {
        repository.findTask.mockResolvedValue(makeTask({ status }));

        await expect(
            service.update(residenceId, taskId, { title: "Novo título" }, userId)
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("preserves an existing reminder when editing without a reminder change", async () => {
        await service.update(residenceId, taskId, { title: "Lavar a cozinha" }, userId);

        expect(repository.update).toHaveBeenCalledWith(
            taskId,
            makeTask(),
            { title: "Lavar a cozinha" },
            undefined,
            30,
            userId
        );
    });

    it("rejects recurring edits with a custom frequency", async () => {
        repository.findTask.mockResolvedValue(
            makeTask({
                definicao_tarefa: {
                    ...makeTask().definicao_tarefa,
                    periodicidade: TaskPeriodicity.PERSONALIZADA,
                    regra_recorrencia: { repeats: true },
                },
            })
        );

        await expect(
            service.update(residenceId, taskId, { title: "Novo título" }, userId)
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("completes a task and returns its refreshed state", async () => {
        const completedAt = new Date("2099-10-20T19:00:00.000Z");
        repository.findTask
            .mockResolvedValueOnce(makeTask())
            .mockResolvedValueOnce(makeTask({ status: "CONCLUIDA", concluida_em: completedAt }));

        await expect(service.complete(residenceId, taskId, userId)).resolves.toMatchObject({
            id: taskId,
            status: "CONCLUIDA",
            completedAt: completedAt.toISOString(),
        });
        expect(repository.complete).toHaveBeenCalledWith(
            taskId,
            memberId,
            expect.objectContaining({ nextOccurrence: null })
        );
    });

    it("plans the next recurring instance and reminder before persisting completion", async () => {
        const recurringTask = makeTask({
            definicao_tarefa: {
                ...makeTask().definicao_tarefa,
                periodicidade: TaskPeriodicity.MENSAL,
                tipo_atribuicao: "RODIZIO",
                regra_recorrencia: { repeats: true },
                fila_rodizio: [
                    { participacao_id: memberId, participacao: { usuario_id: userId } },
                    { participacao_id: "member-2", participacao: { usuario_id: "user-2" } },
                ],
            },
        });
        repository.findTask
            .mockResolvedValueOnce(recurringTask)
            .mockResolvedValueOnce(makeTask({ status: "CONCLUIDA" }));

        await service.complete(residenceId, taskId, userId);

        expect(repository.complete).toHaveBeenCalledWith(
            taskId,
            memberId,
            expect.objectContaining({
                nextOccurrence: {
                    dueAt: new Date("2099-11-20T18:00:00.000Z"),
                    assigneeId: "member-2",
                    rotationOrder: 1,
                    reminder: {
                        userId: "user-2",
                        title: "Limpar cozinha",
                        minutesBefore: 30,
                    },
                },
            })
        );
    });

    it.each(["CONCLUIDA", "CANCELADA"])("rejects completion for a %s task", async (status) => {
        repository.findTask.mockResolvedValue(makeTask({ status }));

        await expect(service.complete(residenceId, taskId, userId)).rejects.toBeInstanceOf(
            BadRequestException
        );
        expect(repository.complete).not.toHaveBeenCalled();
    });

    it("removes all instances through the task definition", async () => {
        await expect(service.remove(residenceId, taskId, userId)).resolves.toEqual({
            id: taskId,
            deleted: true,
        });

        expect(repository.remove).toHaveBeenCalledWith("definition-id");
    });

    it("allows only household leaders to delete tasks", async () => {
        residenceAccess.requireManager.mockRejectedValueOnce(new ForbiddenException());

        await expect(service.remove(residenceId, taskId, userId)).rejects.toBeInstanceOf(
            ForbiddenException
        );
        expect(repository.remove).not.toHaveBeenCalled();
    });

    it("rejects creating a task when the residence policy restricts editing", async () => {
        residenceAccess.requireCreateEditPermission.mockRejectedValueOnce(new ForbiddenException());

        await expect(
            service.create(
                residenceId,
                { title: "Limpar cozinha", dueAt: dueAt.toISOString() },
                userId
            )
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.create).not.toHaveBeenCalled();
    });
});
