import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateExpenseSubgroupDto } from "../../../src/expenses/dto/create-expense-subgroup.dto.js";

const homeId = "f9d8d7a2-5144-42c0-93be-62e46d467b45";
const memberId = "ca655d03-4b64-4a9e-b9fc-066ac2e80c62";

describe("CreateExpenseSubgroupDto", () => {
    it("trims a valid name and accepts unique participant IDs", async () => {
        const dto = plainToInstance(CreateExpenseSubgroupDto, {
            homeId,
            name: "  Café  ",
            memberIds: [memberId],
        });

        await expect(validate(dto)).resolves.toHaveLength(0);
        expect(dto.name).toBe("Café");
    });

    it.each([
        ["blank name", { name: "   " }],
        ["name over the limit", { name: "a".repeat(151) }],
        ["empty member list", { memberIds: [] }],
        ["duplicate member IDs", { memberIds: [memberId, memberId] }],
        ["invalid member ID", { memberIds: ["not-a-uuid"] }],
    ])("rejects %s", async (_description, override) => {
        const dto = plainToInstance(CreateExpenseSubgroupDto, {
            homeId,
            name: "Café",
            memberIds: [memberId],
            ...override,
        });

        await expect(validate(dto)).resolves.not.toHaveLength(0);
    });
});
