import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { TaskExchangeService } from "./task-exchange.service.js";

const residenceId = "residence-id";
const userId = "user-id";
const requesterMemberId = "requester-member-id";
const recipientMemberId = "recipient-member-id";
const offeredTaskId = "offered-task-id";
const targetTaskId = "target-task-id";
const requestId = "request-id";

function makeTask(
  id: string,
  ownerMemberId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    responsavel_participacao_id: ownerMemberId,
    status: "PENDENTE",
    definicao_tarefa: {
      titulo: `Tarefa ${id}`,
      casa_id: residenceId,
      escopo: "CASA",
      visibilidade: "PUBLICA",
    },
    ...overrides,
  };
}

function makeRequest() {
  return {
    id: requestId,
    status: "PENDENTE",
    instancia_tarefa_id: offeredTaskId,
    alvo_instancia_tarefa_id: targetTaskId,
    solicitante_participacao_id: requesterMemberId,
    instancia_tarefa: makeTask(offeredTaskId, requesterMemberId),
    instancia_tarefa_alvo: makeTask(targetTaskId, recipientMemberId),
  };
}

describe("TaskExchangeService", () => {
  let service: TaskExchangeService;
  let prisma: {
    solicitacao_troca_tarefa: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    instancia_tarefa: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let transaction: {
    solicitacao_troca_tarefa: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    instancia_tarefa: {
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let residenceAccess: {
    requireMembership: ReturnType<typeof vi.fn>;
    requireActiveMember: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    transaction = {
      solicitacao_troca_tarefa: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi
          .fn()
          .mockResolvedValue({ id: requestId, status: "PENDENTE" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      instancia_tarefa: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma = {
      solicitacao_troca_tarefa: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(makeRequest()),
      },
      instancia_tarefa: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(makeTask(offeredTaskId, requesterMemberId))
          .mockResolvedValue(makeTask(targetTaskId, recipientMemberId)),
      },
      $transaction: vi.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    };
    residenceAccess = {
      requireMembership: vi.fn().mockResolvedValue({
        residenceId,
        memberId: requesterMemberId,
        role: "MORADOR",
        creationEditPolicy: "TODOS",
      }),
      requireActiveMember: vi.fn().mockResolvedValue({ id: recipientMemberId }),
    };
    service = new TaskExchangeService(
      prisma as never,
      residenceAccess as never,
    );
  });

  function mockRecipientMembership() {
    residenceAccess.requireMembership.mockResolvedValueOnce({
      residenceId,
      memberId: recipientMemberId,
      role: "MORADOR",
      creationEditPolicy: "TODOS",
    });
  }

  it("lists incoming and outgoing requests with safe names and normalized task dates", async () => {
    const offeredDueAt = new Date("2099-10-20T18:00:00.000Z");
    const suggestedDate = new Date("2099-10-22T00:00:00.000Z");
    const incomingDate = new Date("2099-10-24T00:00:00.000Z");
    const outgoing = {
      ...makeRequest(),
      tipo: "PONTUAL",
      instancia_tarefa: {
        ...makeTask(offeredTaskId, requesterMemberId),
        prazo_limite: offeredDueAt,
        data_prevista: new Date("2099-10-20T00:00:00.000Z"),
      },
      instancia_tarefa_alvo: {
        ...makeTask(targetTaskId, recipientMemberId),
        prazo_limite: null,
        data_prevista: suggestedDate,
      },
      participacao_solicitacao_troca_tarefa_solicitante_participacao_idToparticipacao:
        {
          usuario: { nome: "Ana Souza", apelido: null },
        },
      participacao_solicitacao_troca_tarefa_destinatario_participacao_idToparticipacao:
        {
          usuario: { nome: "Bruno Lima", apelido: "Bru" },
        },
    };
    const incoming = {
      ...makeRequest(),
      id: "incoming-request-id",
      tipo: "PONTUAL",
      solicitante_participacao_id: recipientMemberId,
      destinatario_participacao_id: requesterMemberId,
      instancia_tarefa: {
        ...makeTask("incoming-task-id", recipientMemberId),
        prazo_limite: null,
        data_prevista: incomingDate,
      },
      instancia_tarefa_alvo: null,
      participacao_solicitacao_troca_tarefa_solicitante_participacao_idToparticipacao:
        {
          usuario: { nome: "Bruno Lima", apelido: "B" },
        },
      participacao_solicitacao_troca_tarefa_destinatario_participacao_idToparticipacao:
        {
          usuario: { nome: "Ana Souza", apelido: "Ana" },
        },
    };
    prisma.solicitacao_troca_tarefa.findMany.mockResolvedValue([
      outgoing,
      incoming,
    ]);

    await expect(service.list(residenceId, userId)).resolves.toEqual([
      {
        id: requestId,
        status: "PENDENTE",
        type: "PONTUAL",
        incoming: false,
        requester: "Ana Souza",
        recipient: "Bru",
        task: {
          id: offeredTaskId,
          title: `Tarefa ${offeredTaskId}`,
          dueAt: offeredDueAt.toISOString(),
        },
        targetTask: {
          id: targetTaskId,
          title: `Tarefa ${targetTaskId}`,
          dueAt: suggestedDate.toISOString(),
        },
      },
      {
        id: "incoming-request-id",
        status: "PENDENTE",
        type: "PONTUAL",
        incoming: true,
        requester: "B",
        recipient: "Ana",
        task: {
          id: "incoming-task-id",
          title: "Tarefa incoming-task-id",
          dueAt: incomingDate.toISOString(),
        },
        targetTask: null,
      },
    ]);
    expect(prisma.solicitacao_troca_tarefa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instancia_tarefa: {
            definicao_tarefa: { casa_id: residenceId, escopo: "CASA" },
          },
          OR: [
            { destinatario_participacao_id: requesterMemberId },
            { solicitante_participacao_id: requesterMemberId },
          ],
        },
      }),
    );
  });

  it("creates a pending exchange for an open task owned by the requester", async () => {
    await expect(
      service.create(
        residenceId,
        { taskId: offeredTaskId, recipientMemberId },
        userId,
      ),
    ).resolves.toEqual({ id: requestId, status: "PENDENTE" });

    expect(transaction.solicitacao_troca_tarefa.create).toHaveBeenCalledWith({
      data: {
        instancia_tarefa_id: offeredTaskId,
        alvo_instancia_tarefa_id: null,
        solicitante_participacao_id: requesterMemberId,
        destinatario_participacao_id: recipientMemberId,
        tipo: "PONTUAL",
      },
    });
  });

  it("rejects an open task assigned to another resident", async () => {
    prisma.instancia_tarefa.findFirst
      .mockReset()
      .mockResolvedValue(makeTask(offeredTaskId, "another-member"));

    await expect(
      service.create(
        residenceId,
        { taskId: offeredTaskId, recipientMemberId },
        userId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(["CONCLUIDA", "CANCELADA"])(
    "rejects a task in %s status",
    async (status) => {
      prisma.instancia_tarefa.findFirst
        .mockReset()
        .mockResolvedValue(
          makeTask(offeredTaskId, requesterMemberId, { status }),
        );

      await expect(
        service.create(
          residenceId,
          { taskId: offeredTaskId, recipientMemberId },
          userId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it.each(["EM_ANDAMENTO", "ATRASADA"])(
    "allows a task in open %s status",
    async (status) => {
      prisma.instancia_tarefa.findFirst
        .mockReset()
        .mockResolvedValue(
          makeTask(offeredTaskId, requesterMemberId, { status }),
        );

      await expect(
        service.create(
          residenceId,
          { taskId: offeredTaskId, recipientMemberId },
          userId,
        ),
      ).resolves.toEqual({ id: requestId, status: "PENDENTE" });
    },
  );

  it("rejects an unavailable task before checking the recipient", async () => {
    prisma.instancia_tarefa.findFirst.mockReset().mockResolvedValue(null);

    await expect(
      service.create(
        residenceId,
        { taskId: offeredTaskId, recipientMemberId },
        userId,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(residenceAccess.requireActiveMember).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not allow a resident to send an exchange request to themselves", async () => {
    await expect(
      service.create(
        residenceId,
        { taskId: offeredTaskId, recipientMemberId: requesterMemberId },
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(residenceAccess.requireActiveMember).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a recipient who is no longer an active residence member", async () => {
    residenceAccess.requireActiveMember.mockResolvedValue(null);

    await expect(
      service.create(
        residenceId,
        { taskId: offeredTaskId, recipientMemberId },
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects unavailable suggested tasks without creating a pending request", async () => {
    prisma.instancia_tarefa.findFirst
      .mockReset()
      .mockResolvedValueOnce(makeTask(offeredTaskId, requesterMemberId))
      .mockResolvedValueOnce(null);

    await expect(
      service.create(
        residenceId,
        { taskId: offeredTaskId, recipientMemberId, targetTaskId },
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("prevents a second pending request from using an already reserved task", async () => {
    transaction.solicitacao_troca_tarefa.findFirst.mockResolvedValue({
      id: "pending-id",
    });

    await expect(
      service.create(
        residenceId,
        { taskId: offeredTaskId, recipientMemberId },
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.solicitacao_troca_tarefa.create).not.toHaveBeenCalled();
  });

  it("also reserves a recipient's suggested task against another pending exchange", async () => {
    prisma.instancia_tarefa.findFirst
      .mockReset()
      .mockResolvedValueOnce(makeTask(offeredTaskId, requesterMemberId))
      .mockResolvedValueOnce(makeTask(targetTaskId, recipientMemberId));
    transaction.solicitacao_troca_tarefa.findFirst.mockResolvedValue({
      id: "pending-id",
    });

    await expect(
      service.create(
        residenceId,
        { taskId: offeredTaskId, recipientMemberId, targetTaskId },
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.solicitacao_troca_tarefa.findFirst).toHaveBeenCalledWith(
      {
        where: {
          status: "PENDENTE",
          OR: [
            { instancia_tarefa_id: { in: [offeredTaskId, targetTaskId] } },
            { alvo_instancia_tarefa_id: { in: [offeredTaskId, targetTaskId] } },
          ],
        },
      },
    );
    expect(transaction.solicitacao_troca_tarefa.create).not.toHaveBeenCalled();
  });

  it("converts a serialization conflict into a pending-request conflict", async () => {
    prisma.$transaction.mockRejectedValue({ code: "P2034" });

    await expect(
      service.create(
        residenceId,
        { taskId: offeredTaskId, recipientMemberId },
        userId,
      ),
    ).rejects.toThrow("Esta tarefa já possui uma solicitação pendente.");
  });

  it("accepts an exchange by atomically swapping both task assignees and the request status", async () => {
    const replacementTaskId = "replacement-task-id";
    mockRecipientMembership();
    prisma.instancia_tarefa.findFirst
      .mockReset()
      .mockResolvedValueOnce(makeTask(replacementTaskId, recipientMemberId));

    await expect(
      service.respond(
        residenceId,
        requestId,
        "ACEITA",
        replacementTaskId,
        userId,
      ),
    ).resolves.toEqual({ id: requestId, status: "ACEITA" });

    expect(transaction.instancia_tarefa.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          id: offeredTaskId,
          responsavel_participacao_id: requesterMemberId,
        }),
        data: {
          responsavel_participacao_id: recipientMemberId,
          responsavel_usuario_id: null,
        },
      }),
    );
    expect(transaction.instancia_tarefa.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          id: replacementTaskId,
          responsavel_participacao_id: recipientMemberId,
        }),
        data: {
          responsavel_participacao_id: requesterMemberId,
          responsavel_usuario_id: null,
        },
      }),
    );
    expect(
      transaction.solicitacao_troca_tarefa.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: requestId, status: "PENDENTE" },
      data: { status: "ACEITA", alvo_instancia_tarefa_id: replacementTaskId },
    });
  });

  it("uses the suggested task when the recipient does not replace it", async () => {
    mockRecipientMembership();
    prisma.instancia_tarefa.findFirst
      .mockReset()
      .mockResolvedValueOnce(makeTask(targetTaskId, recipientMemberId));

    await expect(
      service.respond(residenceId, requestId, "ACEITA", undefined, userId),
    ).resolves.toEqual({ id: requestId, status: "ACEITA" });

    expect(prisma.instancia_tarefa.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: targetTaskId }),
      }),
    );
    expect(
      transaction.solicitacao_troca_tarefa.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: requestId, status: "PENDENTE" },
      data: { status: "ACEITA", alvo_instancia_tarefa_id: targetTaskId },
    });
  });

  it("rejects an exchange without changing task ownership", async () => {
    mockRecipientMembership();

    await expect(
      service.respond(residenceId, requestId, "RECUSADA", undefined, userId),
    ).resolves.toEqual({ id: requestId, status: "RECUSADA" });

    expect(transaction.instancia_tarefa.updateMany).not.toHaveBeenCalled();
    expect(
      transaction.solicitacao_troca_tarefa.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: requestId, status: "PENDENTE" },
      data: { status: "RECUSADA" },
    });
  });

  it("does not respond to a request that is missing, already answered, or not addressed to the member", async () => {
    mockRecipientMembership();
    prisma.solicitacao_troca_tarefa.findFirst.mockResolvedValue(null);

    await expect(
      service.respond(residenceId, requestId, "RECUSADA", undefined, userId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("cannot accept an exchange without an available task of their own", async () => {
    mockRecipientMembership();
    prisma.solicitacao_troca_tarefa.findFirst.mockResolvedValue({
      ...makeRequest(),
      alvo_instancia_tarefa_id: null,
      instancia_tarefa_alvo: null,
    });

    await expect(
      service.respond(residenceId, requestId, "ACEITA", undefined, userId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.instancia_tarefa.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not accept a request when another pending exchange reserves either task", async () => {
    mockRecipientMembership();
    prisma.instancia_tarefa.findFirst
      .mockReset()
      .mockResolvedValueOnce(makeTask(targetTaskId, recipientMemberId));
    transaction.solicitacao_troca_tarefa.findFirst.mockResolvedValue({
      id: "other-pending",
    });

    await expect(
      service.respond(residenceId, requestId, "ACEITA", targetTaskId, userId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.instancia_tarefa.updateMany).not.toHaveBeenCalled();
    expect(
      transaction.solicitacao_troca_tarefa.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("keeps the request pending if the offered task changed before acceptance", async () => {
    mockRecipientMembership();
    prisma.instancia_tarefa.findFirst
      .mockReset()
      .mockResolvedValueOnce(makeTask(targetTaskId, recipientMemberId));
    transaction.instancia_tarefa.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.respond(residenceId, requestId, "ACEITA", targetTaskId, userId),
    ).rejects.toThrow("A responsabilidade da tarefa foi alterada.");
    expect(
      transaction.solicitacao_troca_tarefa.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("keeps the request pending if the reciprocal task is no longer available", async () => {
    mockRecipientMembership();
    prisma.instancia_tarefa.findFirst
      .mockReset()
      .mockResolvedValueOnce(makeTask(targetTaskId, recipientMemberId));
    transaction.instancia_tarefa.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(
      service.respond(residenceId, requestId, "ACEITA", targetTaskId, userId),
    ).rejects.toThrow("A tarefa oferecida não está mais disponível.");
    expect(
      transaction.solicitacao_troca_tarefa.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("keeps the request pending when its state changes before the response is saved", async () => {
    mockRecipientMembership();
    transaction.solicitacao_troca_tarefa.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      service.respond(residenceId, requestId, "RECUSADA", undefined, userId),
    ).rejects.toThrow("A solicitação já foi respondida.");
  });
});
