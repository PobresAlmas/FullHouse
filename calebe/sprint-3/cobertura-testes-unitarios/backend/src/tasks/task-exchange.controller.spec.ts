import { TaskExchangeController } from "./task-exchange.controller.js";
import { TaskExchangeService } from "./task-exchange.service.js";

describe("TaskExchangeController", () => {
  const service = {
    list: vi.fn(),
    create: vi.fn(),
    respond: vi.fn(),
  };
  const controller = new TaskExchangeController(
    service as unknown as TaskExchangeService,
  );
  const residenceId = "residence-id";
  const requestId = "request-id";
  const user = { id: "user-id" };

  beforeEach(() => vi.clearAllMocks());

  it("lists requests using the authenticated user", async () => {
    service.list.mockResolvedValue([]);
    await expect(controller.list(residenceId, user)).resolves.toEqual([]);
    expect(service.list).toHaveBeenCalledWith(residenceId, user.id);
  });

  it("creates a request with the authenticated user", async () => {
    const data = { taskId: "task-id", recipientMemberId: "member-id" };
    service.create.mockResolvedValue({ id: requestId, status: "PENDENTE" });

    await expect(
      controller.create(residenceId, data as never, user),
    ).resolves.toEqual({
      id: requestId,
      status: "PENDENTE",
    });
    expect(service.create).toHaveBeenCalledWith(residenceId, data, user.id);
  });

  it("passes response status and optional task selection to the service", async () => {
    const data = { status: "ACEITA" as const, targetTaskId: "target-task-id" };
    service.respond.mockResolvedValue({ id: requestId, status: "ACEITA" });

    await expect(
      controller.respond(residenceId, requestId, data, user),
    ).resolves.toEqual({
      id: requestId,
      status: "ACEITA",
    });
    expect(service.respond).toHaveBeenCalledWith(
      residenceId,
      requestId,
      "ACEITA",
      "target-task-id",
      user.id,
    );
  });
});
