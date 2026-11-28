import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateTaskDto,
  TaskAssignmentType,
  TaskPeriodicity,
} from "./create-task.dto.js";
import { TaskListQueryDto } from "./task-list-query.dto.js";
import { UpdateTaskDto } from "./update-task.dto.js";

const memberId = "821f394d-6215-48b4-89a9-0af953ba8a76";

describe("task DTO validation", () => {
  it("accepts task creation data with recurrence, assignee, and reminder values", async () => {
    const dto = plainToInstance(CreateTaskDto, {
      title: "  Limpar cozinha  ",
      dueAt: "2026-12-01T18:00:00.000Z",
      assigneeId: memberId,
      assignmentType: TaskAssignmentType.FIXA,
      repeats: true,
      periodicity: TaskPeriodicity.SEMANAL,
      reminderMinutesBefore: 30,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.title).toBe("Limpar cozinha");
  });

  it.each([
    { title: "  ", dueAt: "2026-12-01T18:00:00.000Z" },
    { title: "task", dueAt: "not-a-date" },
    { title: "task", dueAt: "2026-12-01T18:00:00.000Z", assigneeId: "bad-id" },
    { title: "task", dueAt: "2026-12-01T18:00:00.000Z", color: "red" },
    {
      title: "task",
      dueAt: "2026-12-01T18:00:00.000Z",
      reminderMinutesBefore: 43201,
    },
  ])("rejects invalid task creation values: %j", async (payload) => {
    const dto = plainToInstance(CreateTaskDto, payload);
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it("validates partial task updates and rejects invalid recurrence and rotation fields", async () => {
    const valid = plainToInstance(UpdateTaskDto, {
      title: "New title",
      repeats: false,
    });
    const invalid = plainToInstance(UpdateTaskDto, {
      assigneeIds: [memberId, "not-a-uuid"],
      reminderMinutesBefore: -1,
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });

  it("trims task search filters and validates status, assignee, and periodicity", async () => {
    const valid = plainToInstance(TaskListQueryDto, {
      search: "  kitchen  ",
      status: "PENDENTE",
      assigneeId: memberId,
      periodicity: "SEMANAL",
    });
    const invalid = plainToInstance(TaskListQueryDto, {
      status: "UNKNOWN",
      assigneeId: "bad-id",
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    expect(valid.search).toBe("kitchen");
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });
});
