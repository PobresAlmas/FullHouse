import { TaskAssignmentType, TaskPeriodicity } from "./dto/create-task.dto.js";
import { TasksRepository } from "./tasks.repository.js";

describe("TasksRepository", () => {
  type MockFunction = ReturnType<typeof vi.fn>;
  let repository: TasksRepository;
  let prisma: {
    $transaction: MockFunction;
    participacao: Record<string, MockFunction>;
    instancia_tarefa: Record<string, MockFunction>;
  };
  let transaction: {
    definicao_tarefa: Record<string, MockFunction>;
    fila_rodizio: Record<string, MockFunction>;
    instancia_tarefa: Record<string, MockFunction>;
    lembrete: Record<string, MockFunction>;
    participacao: Record<string, MockFunction>;
  };
  const dueAt = new Date("2026-12-10T18:30:00.000Z");

  beforeEach(() => {
    transaction = {
      definicao_tarefa: {
        create: vi.fn().mockResolvedValue({ id: "definition-1" }),
        update: vi.fn(),
      },
      fila_rodizio: { createMany: vi.fn(), deleteMany: vi.fn() },
      instancia_tarefa: {
        create: vi.fn().mockResolvedValue({
          id: "instance-1",
          definicao_tarefa_id: "definition-1",
        }),
        update: vi.fn().mockResolvedValue({
          id: "instance-1",
          definicao_tarefa_id: "definition-1",
        }),
        updateMany: vi.fn(),
      },
      lembrete: { create: vi.fn(), deleteMany: vi.fn() },
      participacao: {
        findUnique: vi.fn().mockResolvedValue({ usuario_id: "assignee-user" }),
      },
    };
    prisma = {
      $transaction: vi.fn((operation: unknown) =>
        Array.isArray(operation)
          ? Promise.all(operation)
          : (operation as (client: typeof transaction) => unknown)(transaction),
      ),
      participacao: { findMany: vi.fn(), findUnique: vi.fn() },
      instancia_tarefa: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    };
    repository = new TasksRepository(prisma as never);
  });

  it("lists active residence members with stable display-name ordering", async () => {
    await repository.findMembers("home-1");

    expect(prisma.participacao.findMany).toHaveBeenCalledWith({
      where: { casa_id: "home-1", data_saida: null },
      select: {
        id: true,
        papel: true,
        usuario: { select: { nome: true, apelido: true } },
      },
      orderBy: [{ usuario: { nome: "asc" } }, { id: "asc" }],
    });
  });

  it("builds task list visibility, status, assignee, search, and recurrence filters", async () => {
    const query = {
      search: "kitchen",
      status: "PENDENTE",
      assigneeId: "member-1",
      periodicity: TaskPeriodicity.SEMANAL,
    };
    await repository.findTasks("home-1", query as never, "user-1");

    const [findManyArgs] = prisma.instancia_tarefa.findMany.mock.calls[0];
    expect(findManyArgs.where).toEqual({
      definicao_tarefa: {
        casa_id: "home-1",
        escopo: "CASA",
        AND: [
          {
            OR: [
              { visibilidade: "PUBLICA" },
              {
                visibilidade: "PRIVADA",
                participacao: { usuario: { id: "user-1" } },
              },
            ],
          },
          { periodicidade: TaskPeriodicity.SEMANAL },
          {
            OR: [
              { titulo: { contains: "kitchen", mode: "insensitive" } },
              { descricao: { contains: "kitchen", mode: "insensitive" } },
              { tags: { has: "kitchen" } },
            ],
          },
        ],
      },
      status: "PENDENTE",
      responsavel_participacao_id: "member-1",
    });
    expect(findManyArgs.include).toMatchObject({
      definicao_tarefa: {
        include: { fila_rodizio: { where: { ativo: true } } },
      },
      lembrete: { where: { enviado: false }, take: 1 },
    });
    expect(findManyArgs.orderBy).toEqual([
      { prazo_limite: "asc" },
      { data_prevista: "asc" },
      { id: "asc" },
    ]);
  });

  it("hides canceled tasks by default and omits absent optional filters", async () => {
    await repository.findTasks("home-1", {} as never, "user-1");

    const [findManyArgs] = prisma.instancia_tarefa.findMany.mock.calls[0];
    expect(findManyArgs.where).toEqual({
      definicao_tarefa: {
        casa_id: "home-1",
        escopo: "CASA",
        AND: [
          {
            OR: [
              { visibilidade: "PUBLICA" },
              {
                visibilidade: "PRIVADA",
                participacao: { usuario: { id: "user-1" } },
              },
            ],
          },
        ],
      },
      status: { not: "CANCELADA" },
    });
  });

  it("finds residence tasks with privacy scoping and personal task queries", async () => {
    await repository.findTask("home-1", "task-1", "user-1");
    await repository.findPersonalTasks("user-1");
    await repository.findPersonalTask("user-1", "task-2");

    expect(prisma.instancia_tarefa.findFirst).toHaveBeenCalledWith({
      where: {
        id: "task-1",
        definicao_tarefa: {
          casa_id: "home-1",
          escopo: "CASA",
          OR: [
            { visibilidade: "PUBLICA" },
            {
              visibilidade: "PRIVADA",
              participacao: { usuario: { id: "user-1" } },
            },
          ],
        },
      },
      include: expect.any(Object),
    });
    expect(prisma.instancia_tarefa.findMany).toHaveBeenCalledWith({
      where: {
        definicao_tarefa: {
          escopo: "INDIVIDUAL",
          casa_id: null,
          usuario_id: "user-1",
        },
        status: { not: "CANCELADA" },
      },
      include: expect.any(Object),
      orderBy: [
        { prazo_limite: "asc" },
        { data_prevista: "asc" },
        { id: "asc" },
      ],
    });
    expect(prisma.instancia_tarefa.findFirst).toHaveBeenLastCalledWith({
      where: {
        id: "task-2",
        definicao_tarefa: {
          escopo: "INDIVIDUAL",
          casa_id: null,
          usuario_id: "user-1",
        },
      },
      include: expect.any(Object),
    });
  });

  it("creates a personal task and its optional reminder in one transaction", async () => {
    const taskId = await repository.createPersonal("user-1", {
      title: "Read",
      dueAt: dueAt.toISOString(),
      repeats: true,
      periodicity: TaskPeriodicity.SEMANAL,
      reminderMinutesBefore: 30,
    } as never);

    expect(taskId).toBe("instance-1");
    expect(transaction.definicao_tarefa.create).toHaveBeenCalledWith({
      data: {
        escopo: "INDIVIDUAL",
        usuario_id: "user-1",
        titulo: "Read",
        descricao: null,
        tags: [],
        cor: null,
        visibilidade: "PRIVADA",
        periodicidade: TaskPeriodicity.SEMANAL,
        regra_recorrencia: { repeats: true },
        tipo_atribuicao: TaskAssignmentType.FIXA,
        data_inicio: new Date("2026-12-10T00:00:00.000Z"),
        data_fim: null,
      },
    });
    expect(transaction.instancia_tarefa.create).toHaveBeenCalledWith({
      data: {
        definicao_tarefa_id: "definition-1",
        data_prevista: new Date("2026-12-10T00:00:00.000Z"),
        prazo_limite: dueAt,
        responsavel_usuario_id: "user-1",
      },
    });
    expect(transaction.lembrete.create).toHaveBeenCalledWith({
      data: {
        usuario_id: "user-1",
        titulo: "Read",
        lembrar_em: new Date(dueAt.getTime() - 30 * 60_000),
        instancia_tarefa_id: "instance-1",
      },
    });
  });

  it("updates personal recurrence and replaces reminder records", async () => {
    const existing = {
      definicao_tarefa_id: "definition-1",
      prazo_limite: dueAt,
      data_prevista: dueAt,
      definicao_tarefa: {
        titulo: "Old",
        periodicidade: TaskPeriodicity.SEMANAL,
        regra_recorrencia: { repeats: true },
      },
    };
    await repository.updatePersonal(
      "instance-1",
      existing as never,
      {
        title: "Updated",
        dueAt: "2026-12-11T18:30:00.000Z",
        repeats: false,
        reminderMinutesBefore: 15,
      } as never,
      "user-1",
    );

    expect(transaction.definicao_tarefa.update).toHaveBeenCalledWith({
      where: { id: "definition-1" },
      data: {
        titulo: "Updated",
        periodicidade: TaskPeriodicity.PERSONALIZADA,
        regra_recorrencia: { repeats: false },
        data_fim: new Date("2026-12-11T00:00:00.000Z"),
      },
    });
    expect(transaction.lembrete.deleteMany).toHaveBeenCalledWith({
      where: { instancia_tarefa_id: "instance-1" },
    });
    expect(transaction.lembrete.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuario_id: "user-1",
        titulo: "Updated",
      }),
    });
  });

  it("completes personal tasks and optionally creates the next occurrence", async () => {
    await repository.completePersonal(
      "instance-1",
      "user-1",
      new Date("2026-12-10T19:00:00Z"),
      dueAt,
      10,
      "Read",
    );

    expect(transaction.instancia_tarefa.update).toHaveBeenCalledWith({
      where: { id: "instance-1" },
      data: {
        status: "CONCLUIDA",
        concluida_em: new Date("2026-12-10T19:00:00Z"),
      },
    });
    expect(transaction.lembrete.deleteMany).toHaveBeenCalledWith({
      where: { instancia_tarefa_id: "instance-1" },
    });
    expect(transaction.instancia_tarefa.create).toHaveBeenCalledWith({
      data: {
        definicao_tarefa_id: "definition-1",
        data_prevista: new Date("2026-12-10T00:00:00.000Z"),
        prazo_limite: dueAt,
        responsavel_usuario_id: "user-1",
      },
    });
    expect(transaction.lembrete.create).toHaveBeenCalledOnce();
  });

  it("returns false when removing a missing personal task and cancels an existing definition", async () => {
    prisma.instancia_tarefa.findFirst.mockResolvedValueOnce(null);
    await expect(repository.removePersonal("user-1", "missing")).resolves.toBe(
      false,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.instancia_tarefa.findFirst.mockResolvedValueOnce({
      definicao_tarefa_id: "definition-1",
    });
    await expect(
      repository.removePersonal("user-1", "instance-1"),
    ).resolves.toBe(true);
    expect(transaction.lembrete.deleteMany).toHaveBeenCalledWith({
      where: { instancia_tarefa: { definicao_tarefa_id: "definition-1" } },
    });
    expect(transaction.instancia_tarefa.updateMany).toHaveBeenCalledWith({
      where: { definicao_tarefa_id: "definition-1" },
      data: { status: "CANCELADA" },
    });
  });

  it("creates a residence task with fixed assignment and a reminder", async () => {
    const result = await repository.create(
      "home-1",
      "creator-user",
      "creator-member",
      { id: "member-1", userId: "assignee-user" },
      {
        title: "Clean",
        dueAt: dueAt.toISOString(),
        reminderMinutesBefore: 20,
      } as never,
    );

    expect(result).toBe("instance-1");
    expect(transaction.definicao_tarefa.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        escopo: "CASA",
        casa_id: "home-1",
        tipo_atribuicao: TaskAssignmentType.FIXA,
        responsavel_fixo_participacao_id: "member-1",
        regra_recorrencia: { repeats: false },
      }),
    });
    expect(transaction.instancia_tarefa.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        responsavel_participacao_id: "member-1",
        ordem_rodizio: null,
      }),
    });
    expect(transaction.lembrete.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuario_id: "assignee-user",
        titulo: "Clean",
      }),
    });
  });

  it("creates a rotating task and persists its ordered members", async () => {
    await repository.create(
      "home-1",
      "creator-user",
      "creator-member",
      { id: "member-1", userId: "user-1" },
      {
        title: "Take out trash",
        dueAt: dueAt.toISOString(),
        repeats: true,
        assignmentType: TaskAssignmentType.RODIZIO,
        assigneeIds: ["member-1", "member-2"],
      } as never,
    );

    expect(transaction.fila_rodizio.createMany).toHaveBeenCalledWith({
      data: [
        {
          definicao_tarefa_id: "definition-1",
          participacao_id: "member-1",
          ordem: 0,
        },
        {
          definicao_tarefa_id: "definition-1",
          participacao_id: "member-2",
          ordem: 1,
        },
      ],
    });
    expect(transaction.instancia_tarefa.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        responsavel_participacao_id: "member-1",
        ordem_rodizio: 0,
      }),
    });
  });

  it("updates a task, replaces rotation members, and assigns its reminder to the next member", async () => {
    const existing = {
      definicao_tarefa_id: "definition-1",
      prazo_limite: dueAt,
      data_prevista: dueAt,
      responsavel_participacao_id: "member-old",
      definicao_tarefa: {
        titulo: "Old title",
        tipo_atribuicao: TaskAssignmentType.FIXA,
        periodicidade: TaskPeriodicity.SEMANAL,
        regra_recorrencia: { repeats: true },
        fila_rodizio: [],
      },
      participacao_instancia_tarefa_responsavel_participacao_idToparticipacao:
        null,
    };
    await repository.update(
      "instance-1",
      existing as never,
      {
        title: "New title",
        dueAt: "2026-12-11T18:30:00.000Z",
        repeats: true,
        periodicity: TaskPeriodicity.DIARIA,
        assignmentType: TaskAssignmentType.RODIZIO,
        assigneeIds: ["member-2", "member-3"],
        reminderMinutesBefore: 10,
      } as never,
      { id: "member-2", userId: "user-2" },
      10,
      "creator-user",
    );

    expect(transaction.fila_rodizio.deleteMany).toHaveBeenCalledWith({
      where: { definicao_tarefa_id: "definition-1" },
    });
    expect(transaction.fila_rodizio.createMany).toHaveBeenCalledWith({
      data: [
        {
          definicao_tarefa_id: "definition-1",
          participacao_id: "member-2",
          ordem: 0,
        },
        {
          definicao_tarefa_id: "definition-1",
          participacao_id: "member-3",
          ordem: 1,
        },
      ],
    });
    expect(transaction.participacao.findUnique).toHaveBeenCalledWith({
      where: { id: "member-2" },
      select: { usuario_id: true },
    });
    expect(transaction.lembrete.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuario_id: "assignee-user",
        titulo: "New title",
      }),
    });
  });

  it("completes a residence task and persists the provided next occurrence plan", async () => {
    const completedAt = new Date("2026-12-10T19:00:00Z");
    await repository.complete("instance-1", "member-1", {
      completedAt,
      nextOccurrence: {
        dueAt,
        assigneeId: "member-2",
        rotationOrder: 1,
        reminder: { userId: "user-2", title: "Clean", minutesBefore: 15 },
      },
    } as never);

    expect(transaction.instancia_tarefa.update).toHaveBeenCalledWith({
      where: { id: "instance-1" },
      data: {
        status: "CONCLUIDA",
        concluida_em: completedAt,
        concluida_por_participacao_id: "member-1",
      },
    });
    expect(transaction.instancia_tarefa.create).toHaveBeenCalledWith({
      data: {
        definicao_tarefa_id: "definition-1",
        data_prevista: new Date("2026-12-10T00:00:00.000Z"),
        prazo_limite: dueAt,
        responsavel_participacao_id: "member-2",
        ordem_rodizio: 1,
      },
    });
    expect(transaction.lembrete.create).toHaveBeenCalledWith({
      data: {
        usuario_id: "user-2",
        titulo: "Clean",
        lembrar_em: new Date(dueAt.getTime() - 15 * 60_000),
        instancia_tarefa_id: "instance-1",
      },
    });
  });

  it("removes reminders and cancels all instances for a task definition", async () => {
    await repository.remove("definition-1");

    expect(transaction.lembrete.deleteMany).toHaveBeenCalledWith({
      where: { instancia_tarefa: { definicao_tarefa_id: "definition-1" } },
    });
    expect(transaction.instancia_tarefa.updateMany).toHaveBeenCalledWith({
      where: { definicao_tarefa_id: "definition-1" },
      data: { status: "CANCELADA" },
    });
  });
});
