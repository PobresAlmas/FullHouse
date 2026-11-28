import { TasksController } from "./tasks.controller.js";
import { TasksService } from "./tasks.service.js";

describe("TasksController", () => {
  const tasksService = {
    findMembers: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    complete: vi.fn(),
    remove: vi.fn(),
  };
  const controller = new TasksController(
    tasksService as unknown as TasksService,
  );
  const residenceId = "residence-id";
  const taskId = "task-id";
  const user = { id: "user-id" };

  beforeEach(() => vi.clearAllMocks());

  it("delegates residence member listing with the authenticated user", async () => {
    tasksService.findMembers.mockResolvedValue([]);
    await expect(controller.findMembers(residenceId, user)).resolves.toEqual(
      [],
    );
    expect(tasksService.findMembers).toHaveBeenCalledWith(residenceId, user.id);
  });

  it("delegates filtered task listing", async () => {
    const query = { status: "PENDENTE" };
    tasksService.findAll.mockResolvedValue([]);
    await expect(
      controller.findAll(residenceId, query as never, user),
    ).resolves.toEqual([]);
    expect(tasksService.findAll).toHaveBeenCalledWith(
      residenceId,
      user.id,
      query,
    );
  });

  it("delegates task creation with the authenticated user", async () => {
    const data = { title: "Clean kitchen" };
    tasksService.create.mockResolvedValue(taskId);
    await expect(
      controller.create(residenceId, data as never, user),
    ).resolves.toBe(taskId);
    expect(tasksService.create).toHaveBeenCalledWith(
      residenceId,
      data,
      user.id,
    );
  });

  it("delegates task detail lookup", async () => {
    tasksService.findOne.mockResolvedValue({ id: taskId });
    await expect(
      controller.findOne(residenceId, taskId, user),
    ).resolves.toEqual({
      id: taskId,
    });
    expect(tasksService.findOne).toHaveBeenCalledWith(
      residenceId,
      taskId,
      user.id,
    );
  });

  it("delegates task updates", async () => {
    const data = { title: "Sweep kitchen" };
    tasksService.update.mockResolvedValue({ id: taskId });
    await expect(
      controller.update(residenceId, taskId, data as never, user),
    ).resolves.toEqual({
      id: taskId,
    });
    expect(tasksService.update).toHaveBeenCalledWith(
      residenceId,
      taskId,
      data,
      user.id,
    );
  });

  it("delegates completion and deletion", async () => {
    tasksService.complete.mockResolvedValue({
      id: taskId,
      status: "CONCLUIDA",
    });
    tasksService.remove.mockResolvedValue({ id: taskId, deleted: true });

    await expect(
      controller.complete(residenceId, taskId, user),
    ).resolves.toEqual({
      id: taskId,
      status: "CONCLUIDA",
    });
    await expect(controller.remove(residenceId, taskId, user)).resolves.toEqual(
      {
        id: taskId,
        deleted: true,
      },
    );
    expect(tasksService.complete).toHaveBeenCalledWith(
      residenceId,
      taskId,
      user.id,
    );
    expect(tasksService.remove).toHaveBeenCalledWith(
      residenceId,
      taskId,
      user.id,
    );
  });
});
