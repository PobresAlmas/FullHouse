import { randomUUID } from "node:crypto";
import { PrismaService } from "../../src/prisma/prisma.service.js";
import { ResidenceAccessService } from "../../src/residences/residence-access.service.js";
import { TaskExchangeService } from "../../src/tasks/task-exchange.service.js";
import { TasksRepository } from "../../src/tasks/tasks.repository.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("Task exchange PostgreSQL integration", () => {
    let prisma: PrismaService;
    let originalDatabaseUrl: string | undefined;
    let residenceId: string;
    let userIds: string[];
    let memberIds: string[];
    let offeredTaskId: string;
    let reciprocalTaskId: string;
    let taskExchangeService: TaskExchangeService;
    let rollbackConstraint: string | undefined;

    beforeAll(async () => {
        originalDatabaseUrl = process.env.DATABASE_URL;
        process.env.DATABASE_URL = testDatabaseUrl!;
        prisma = new PrismaService();
        await prisma.$connect();
    });

    beforeEach(async () => {
        const suffix = randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
        const users = await Promise.all(
            ["requester", "recipient", "other"].map((role, index) =>
                prisma.usuario.create({
                    data: {
                        codigo_pessoal: `${suffix.slice(0, 5)}${index}`,
                        nome: role,
                        email: `${role}-${randomUUID()}@example.test`,
                        senha_hash: "test-hash",
                    },
                })
            )
        );
        userIds = users.map((user) => user.id);
        const residence = await prisma.casa.create({
            data: { nome: `Exchange test ${suffix}`, criada_por_usuario_id: users[0].id },
        });
        residenceId = residence.id;
        const members = await Promise.all(
            users.map((user) =>
                prisma.participacao.create({
                    data: { casa_id: residence.id, usuario_id: user.id },
                })
            )
        );
        memberIds = members.map((member) => member.id);

        const offeredDefinition = await prisma.definicao_tarefa.create({
            data: {
                escopo: "CASA",
                casa_id: residence.id,
                titulo: "Offered task",
                periodicidade: "PERSONALIZADA",
                tipo_atribuicao: "FIXA",
                data_inicio: new Date("2026-12-01T00:00:00.000Z"),
            },
        });
        const reciprocalDefinition = await prisma.definicao_tarefa.create({
            data: {
                escopo: "CASA",
                casa_id: residence.id,
                titulo: "Reciprocal task",
                periodicidade: "PERSONALIZADA",
                tipo_atribuicao: "FIXA",
                data_inicio: new Date("2026-12-02T00:00:00.000Z"),
            },
        });
        const [offeredTask, reciprocalTask] = await Promise.all([
            prisma.instancia_tarefa.create({
                data: {
                    definicao_tarefa_id: offeredDefinition.id,
                    data_prevista: new Date("2026-12-01T00:00:00.000Z"),
                    responsavel_participacao_id: memberIds[0],
                },
            }),
            prisma.instancia_tarefa.create({
                data: {
                    definicao_tarefa_id: reciprocalDefinition.id,
                    data_prevista: new Date("2026-12-02T00:00:00.000Z"),
                    responsavel_participacao_id: memberIds[1],
                },
            }),
        ]);
        offeredTaskId = offeredTask.id;
        reciprocalTaskId = reciprocalTask.id;

        taskExchangeService = new TaskExchangeService(prisma, new ResidenceAccessService(prisma));
        rollbackConstraint = undefined;
    });

    afterEach(async () => {
        if (rollbackConstraint) {
            await prisma.$executeRawUnsafe(
                `ALTER TABLE "solicitacao_troca_tarefa" DROP CONSTRAINT IF EXISTS "${rollbackConstraint}"`
            );
            rollbackConstraint = undefined;
        }
        const taskIds = [offeredTaskId, reciprocalTaskId].filter(Boolean);
        if (taskIds.length > 0) {
            await prisma.solicitacao_troca_tarefa.deleteMany({
                where: {
                    OR: [
                        { instancia_tarefa_id: { in: taskIds } },
                        { alvo_instancia_tarefa_id: { in: taskIds } },
                    ],
                },
            });
        }
        if (residenceId) {
            await prisma.notificacao.deleteMany({ where: { casa_id: residenceId } });
            await prisma.casa.deleteMany({ where: { id: residenceId } });
        }
        if (userIds?.length) await prisma.usuario.deleteMany({ where: { id: { in: userIds } } });
    });

    afterAll(async () => {
        if (prisma) await prisma.$disconnect();
        if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = originalDatabaseUrl;
    });

    it("swaps both task assignments and marks the request accepted in PostgreSQL", async () => {
        const created = await taskExchangeService.create(
            residenceId,
            { taskId: offeredTaskId, recipientMemberId: memberIds[1] },
            userIds[0]
        );

        await expect(
            taskExchangeService.respond(
                residenceId,
                created.id,
                "ACEITA",
                reciprocalTaskId,
                userIds[1]
            )
        ).resolves.toEqual({ id: created.id, status: "ACEITA" });

        const [offered, reciprocal, savedRequest] = await Promise.all([
            prisma.instancia_tarefa.findUniqueOrThrow({ where: { id: offeredTaskId } }),
            prisma.instancia_tarefa.findUniqueOrThrow({ where: { id: reciprocalTaskId } }),
            prisma.solicitacao_troca_tarefa.findUniqueOrThrow({ where: { id: created.id } }),
        ]);
        expect(offered.responsavel_participacao_id).toBe(memberIds[1]);
        expect(reciprocal.responsavel_participacao_id).toBe(memberIds[0]);
        expect(savedRequest).toMatchObject({
            status: "ACEITA",
            alvo_instancia_tarefa_id: reciprocalTaskId,
        });
    });

    it("shows a private task only to the current assignee after a transfer", async () => {
        const repository = new TasksRepository(prisma);
        const offered = await prisma.instancia_tarefa.findUniqueOrThrow({
            where: { id: offeredTaskId },
        });
        await prisma.definicao_tarefa.update({
            where: { id: offered.definicao_tarefa_id },
            data: { visibilidade: "PRIVADA", responsavel_fixo_participacao_id: memberIds[0] },
        });

        await expect(repository.findPersonalTasks(userIds[0])).resolves.toMatchObject([
            { id: offeredTaskId },
        ]);
        await expect(
            repository.findTask(residenceId, offeredTaskId, userIds[1])
        ).resolves.toBeNull();

        const request = await taskExchangeService.create(
            residenceId,
            { taskId: offeredTaskId, recipientMemberId: memberIds[1] },
            userIds[0]
        );
        await taskExchangeService.respond(
            residenceId,
            request.id,
            "ACEITA",
            undefined,
            userIds[1],
            true
        );

        const currentAssigneeTasks = await repository.findPersonalTasks(userIds[1]);
        expect(currentAssigneeTasks.map((task) => task.id)).toEqual([
            offeredTaskId,
            reciprocalTaskId,
        ]);
        await expect(repository.findTasks(residenceId, {}, userIds[1])).resolves.toMatchObject([
            { id: offeredTaskId },
            { id: reciprocalTaskId },
        ]);
        await expect(
            repository.findTask(residenceId, offeredTaskId, userIds[1])
        ).resolves.toMatchObject({
            id: offeredTaskId,
        });
        await expect(repository.findPersonalTask(userIds[1], offeredTaskId)).resolves.toBeNull();

        for (const userId of [userIds[0], userIds[2]]) {
            await expect(repository.findPersonalTasks(userId)).resolves.toEqual([]);
            await expect(repository.findTasks(residenceId, {}, userId)).resolves.toMatchObject([
                { id: reciprocalTaskId },
            ]);
            await expect(
                repository.findTask(residenceId, offeredTaskId, userId)
            ).resolves.toBeNull();
        }
    });

    it("rolls back both assignments if saving the accepted request fails", async () => {
        const created = await taskExchangeService.create(
            residenceId,
            { taskId: offeredTaskId, recipientMemberId: memberIds[1] },
            userIds[0]
        );
        rollbackConstraint = `test_exchange_rollback_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "solicitacao_troca_tarefa"
            ADD CONSTRAINT "${rollbackConstraint}"
            CHECK ("id" <> '${created.id}'::uuid OR "status" <> 'ACEITA')
        `);

        await expect(
            taskExchangeService.respond(
                residenceId,
                created.id,
                "ACEITA",
                reciprocalTaskId,
                userIds[1]
            )
        ).rejects.toBeDefined();

        const [offered, reciprocal, savedRequest] = await Promise.all([
            prisma.instancia_tarefa.findUniqueOrThrow({ where: { id: offeredTaskId } }),
            prisma.instancia_tarefa.findUniqueOrThrow({ where: { id: reciprocalTaskId } }),
            prisma.solicitacao_troca_tarefa.findUniqueOrThrow({ where: { id: created.id } }),
        ]);
        expect(offered.responsavel_participacao_id).toBe(memberIds[0]);
        expect(reciprocal.responsavel_participacao_id).toBe(memberIds[1]);
        expect(savedRequest.status).toBe("PENDENTE");
    });

    it("allows only one pending exchange when competing requests reserve the same task", async () => {
        const results = await Promise.allSettled([
            taskExchangeService.create(
                residenceId,
                { taskId: offeredTaskId, recipientMemberId: memberIds[1] },
                userIds[0]
            ),
            taskExchangeService.create(
                residenceId,
                { taskId: offeredTaskId, recipientMemberId: memberIds[2] },
                userIds[0]
            ),
        ]);

        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
        const pendingRequests = await prisma.solicitacao_troca_tarefa.count({
            where: { instancia_tarefa_id: offeredTaskId, status: "PENDENTE" },
        });
        expect(pendingRequests).toBe(1);
    });
});
