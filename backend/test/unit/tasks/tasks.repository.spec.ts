import { TasksRepository } from "../../../src/tasks/tasks.repository.js";

describe("TasksRepository completion persistence", () => {
    it("persists completion and the next occurrence in one transaction", async () => {
        const completed = { id: "task-id", definicao_tarefa_id: "definition-id" };
        const transaction = {
            instancia_tarefa: {
                update: vi.fn().mockResolvedValue(completed),
                create: vi.fn().mockResolvedValue({ id: "next-task-id" }),
            },
            lembrete: {
                deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
                create: vi.fn().mockResolvedValue({}),
            },
        };
        const prisma = {
            $transaction: vi.fn((operation: (tx: typeof transaction) => unknown) =>
                operation(transaction)
            ),
        };
        const repository = new TasksRepository(prisma as never);
        const dueAt = new Date("2099-11-20T18:00:00.000Z");

        await expect(
            repository.complete("task-id", "member-id", {
                completedAt: new Date("2099-10-20T19:00:00.000Z"),
                nextOccurrence: {
                    dueAt,
                    assigneeId: "next-member-id",
                    rotationOrder: 1,
                    reminder: {
                        userId: "next-user-id",
                        title: "Limpar cozinha",
                        minutesBefore: 30,
                    },
                },
            })
        ).resolves.toBe(completed);

        expect(prisma.$transaction).toHaveBeenCalledOnce();
        expect(transaction.instancia_tarefa.update).toHaveBeenCalledWith({
            where: { id: "task-id" },
            data: {
                status: "CONCLUIDA",
                concluida_em: new Date("2099-10-20T19:00:00.000Z"),
                concluida_por_participacao_id: "member-id",
            },
        });
        expect(transaction.lembrete.deleteMany).toHaveBeenCalledWith({
            where: { instancia_tarefa_id: "task-id" },
        });
        expect(transaction.instancia_tarefa.create).toHaveBeenCalledWith({
            data: {
                definicao_tarefa_id: "definition-id",
                data_prevista: new Date("2099-11-20T00:00:00.000Z"),
                prazo_limite: dueAt,
                responsavel_participacao_id: "next-member-id",
                ordem_rodizio: 1,
            },
        });
        expect(transaction.lembrete.create).toHaveBeenCalledWith({
            data: {
                usuario_id: "next-user-id",
                titulo: "Limpar cozinha",
                lembrar_em: new Date("2099-11-20T17:30:00.000Z"),
                instancia_tarefa_id: "next-task-id",
            },
        });
    });

    it("does not create a next occurrence for a non-recurring task", async () => {
        const transaction = {
            instancia_tarefa: {
                update: vi.fn().mockResolvedValue({ id: "task-id" }),
                create: vi.fn(),
            },
            lembrete: {
                deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
                create: vi.fn(),
            },
        };
        const prisma = {
            $transaction: vi.fn((operation: (tx: typeof transaction) => unknown) =>
                operation(transaction)
            ),
        };
        const repository = new TasksRepository(prisma as never);

        await repository.complete("task-id", "member-id", {
            completedAt: new Date("2099-10-20T19:00:00.000Z"),
            nextOccurrence: null,
        });

        expect(transaction.instancia_tarefa.create).not.toHaveBeenCalled();
        expect(transaction.lembrete.create).not.toHaveBeenCalled();
    });
});
