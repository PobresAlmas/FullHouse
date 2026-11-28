import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import {
  completePersonalTask,
  completeTask,
  createPersonalTask,
  createTask,
  createTaskExchangeRequest,
  deletePersonalTask,
  deleteTask,
  getPersonalTasks,
  getTask,
  getTaskExchangeRequests,
  getTaskMembers,
  getTaskResidences,
  getTasks,
  respondToTaskExchange,
  updatePersonalTask,
  updateTask,
} from "../tasks.api";

vi.mock("@/services/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("tasks API client", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads residences, members, task lists, and task detail", async () => {
    const data = [{ id: "task-1" }];
    vi.mocked(api.get).mockResolvedValue({ data });

    await expect(getTaskResidences()).resolves.toEqual(data);
    expect(api.get).toHaveBeenLastCalledWith("/residences");
    await expect(getTaskMembers("home-1")).resolves.toEqual(data);
    expect(api.get).toHaveBeenLastCalledWith(
      "/residences/home-1/tasks/members",
    );
    await expect(
      getTasks("home-1", { status: "PENDENTE", search: "kitchen" }),
    ).resolves.toEqual(data);
    expect(api.get).toHaveBeenLastCalledWith("/residences/home-1/tasks", {
      params: { status: "PENDENTE", search: "kitchen" },
    });
    vi.mocked(api.get).mockResolvedValueOnce({ data: data[0] });
    await expect(getTask("home-1", "task-1")).resolves.toEqual(data[0]);
    expect(api.get).toHaveBeenLastCalledWith("/residences/home-1/tasks/task-1");
  });

  it("creates, updates, completes, and deletes residence tasks", async () => {
    const task = { id: "task-1" };
    const input = { title: "Clean", dueAt: "2026-12-10T18:00:00.000Z" };
    vi.mocked(api.post).mockResolvedValue({ data: task });
    vi.mocked(api.patch).mockResolvedValue({ data: task });
    vi.mocked(api.delete).mockResolvedValue({ data: undefined });

    await expect(createTask("home-1", input)).resolves.toEqual(task);
    expect(api.post).toHaveBeenCalledWith("/residences/home-1/tasks", input);
    await expect(
      updateTask("home-1", "task-1", { title: "Sweep" }),
    ).resolves.toEqual(task);
    expect(api.patch).toHaveBeenCalledWith("/residences/home-1/tasks/task-1", {
      title: "Sweep",
    });
    await expect(completeTask("home-1", "task-1")).resolves.toEqual(task);
    expect(api.patch).toHaveBeenCalledWith(
      "/residences/home-1/tasks/task-1/complete",
    );
    await expect(deleteTask("home-1", "task-1")).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith("/residences/home-1/tasks/task-1");
  });

  it("supports personal task routes", async () => {
    const task = { id: "local-task" };
    vi.mocked(api.get).mockResolvedValue({ data: [task] });
    vi.mocked(api.post).mockResolvedValue({ data: task });
    vi.mocked(api.patch).mockResolvedValue({ data: task });
    vi.mocked(api.delete).mockResolvedValue({ data: undefined });

    await expect(getPersonalTasks()).resolves.toEqual([task]);
    expect(api.get).toHaveBeenCalledWith("/tasks/personal");
    await expect(
      createPersonalTask({ title: "Read", dueAt: "2026-12-10" }),
    ).resolves.toEqual(task);
    expect(api.post).toHaveBeenCalledWith("/tasks/personal", {
      title: "Read",
      dueAt: "2026-12-10",
    });
    await expect(
      updatePersonalTask("local-task", { title: "Write" }),
    ).resolves.toEqual(task);
    expect(api.patch).toHaveBeenCalledWith("/tasks/personal/local-task", {
      title: "Write",
    });
    await expect(completePersonalTask("local-task")).resolves.toEqual(task);
    expect(api.patch).toHaveBeenCalledWith(
      "/tasks/personal/local-task/complete",
    );
    await expect(deletePersonalTask("local-task")).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith("/tasks/personal/local-task");
  });

  it("loads and creates task exchange requests with optional target IDs", async () => {
    const requests = [{ id: "request-1" }];
    vi.mocked(api.get).mockResolvedValue({ data: requests });
    vi.mocked(api.post).mockResolvedValue({ data: undefined });

    await expect(getTaskExchangeRequests("home-1")).resolves.toEqual(requests);
    expect(api.get).toHaveBeenCalledWith(
      "/residences/home-1/task-exchange-requests",
    );
    await createTaskExchangeRequest("home-1", "task-1", "member-1");
    expect(api.post).toHaveBeenCalledWith(
      "/residences/home-1/task-exchange-requests",
      {
        taskId: "task-1",
        recipientMemberId: "member-1",
      },
    );
    await createTaskExchangeRequest("home-1", "task-1", "member-1", "task-2");
    expect(api.post).toHaveBeenLastCalledWith(
      "/residences/home-1/task-exchange-requests",
      {
        taskId: "task-1",
        recipientMemberId: "member-1",
        targetTaskId: "task-2",
      },
    );
  });

  it("responds to exchanges with or without choosing a reciprocal task", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: undefined });

    await respondToTaskExchange("home-1", "request-1", "RECUSADA");
    expect(api.patch).toHaveBeenCalledWith(
      "/residences/home-1/task-exchange-requests/request-1",
      { status: "RECUSADA" },
    );
    await respondToTaskExchange("home-1", "request-1", "ACEITA", "task-2");
    expect(api.patch).toHaveBeenLastCalledWith(
      "/residences/home-1/task-exchange-requests/request-1",
      { status: "ACEITA", targetTaskId: "task-2" },
    );
  });
});
