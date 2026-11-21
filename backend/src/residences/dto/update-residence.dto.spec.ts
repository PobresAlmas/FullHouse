import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { UpdateResidenceDto } from "./update-residence.dto.js";

describe("UpdateResidenceDto", () => {
    it("trims valid names and enforces the documented 80 character limit", async () => {
        const valid = plainToInstance(UpdateResidenceDto, { name: "  Casa Nova  " });
        expect(await validate(valid)).toHaveLength(0);
        expect(valid.name).toBe("Casa Nova");

        const tooLong = plainToInstance(UpdateResidenceDto, { name: "x".repeat(81) });
        expect(await validate(tooLong)).not.toHaveLength(0);
    });

    it.each(["", "   ", 5, null])("rejects invalid names: %j", async (name) => {
        const dto = plainToInstance(UpdateResidenceDto, { name });
        expect(await validate(dto)).not.toHaveLength(0);
    });
});
