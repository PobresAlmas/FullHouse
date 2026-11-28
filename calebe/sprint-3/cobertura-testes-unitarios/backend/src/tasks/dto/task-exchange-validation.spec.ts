import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateTaskExchangeDto } from "./create-task-exchange.dto.js";
import { RespondTaskExchangeDto } from "./respond-task-exchange.dto.js";

const taskId = "821f394d-6215-48b4-89a9-0af953ba8a76";
const recipientMemberId = "bd0a2c6c-2436-4cf7-9fe3-61c28ab2b271";

describe("task exchange DTO validation", () => {
  it("accepts a required task and recipient with an optional suggested task", async () => {
    const withoutSuggestion = plainToInstance(CreateTaskExchangeDto, {
      taskId,
      recipientMemberId,
    });
    const withSuggestion = plainToInstance(CreateTaskExchangeDto, {
      taskId,
      recipientMemberId,
      targetTaskId: "4b46bc38-a83c-45df-898c-fc138131047e",
    });

    await expect(validate(withoutSuggestion)).resolves.toHaveLength(0);
    await expect(validate(withSuggestion)).resolves.toHaveLength(0);
  });

  it.each([
    { taskId: "not-a-uuid", recipientMemberId },
    { taskId, recipientMemberId: "not-a-uuid" },
    { taskId, recipientMemberId, targetTaskId: "not-a-uuid" },
  ])("rejects malformed task exchange identifiers: %j", async (payload) => {
    const dto = plainToInstance(CreateTaskExchangeDto, payload);
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it("accepts only accepted or refused response states and an optional task UUID", async () => {
    for (const status of ["ACEITA", "RECUSADA"] as const) {
      const dto = plainToInstance(RespondTaskExchangeDto, { status });
      await expect(validate(dto)).resolves.toHaveLength(0);
    }

    const withTask = plainToInstance(RespondTaskExchangeDto, {
      status: "ACEITA",
      targetTaskId: taskId,
    });
    await expect(validate(withTask)).resolves.toHaveLength(0);
  });

  it.each([
    { status: "PENDENTE" },
    { status: "ACEITA", targetTaskId: "not-a-uuid" },
  ])("rejects invalid response values: %j", async (payload) => {
    const dto = plainToInstance(RespondTaskExchangeDto, payload);
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
