import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateMemberAccessDto } from "./update-member-access.dto.js";

describe("UpdateMemberAccessDto", () => {
    const validateBody = (body: unknown) =>
        validate(plainToInstance(UpdateMemberAccessDto, body), {
            whitelist: true,
            forbidNonWhitelisted: true,
        });

    it.each([true, false, null])("accepts the %s access override", async (canEditContent) => {
        await expect(validateBody({ canEditContent })).resolves.toHaveLength(0);
    });

    it.each(["true", 1, "inherit"])("rejects invalid override %s", async (canEditContent) => {
        expect(await validateBody({ canEditContent })).not.toHaveLength(0);
    });

    it("does not accept unknown fields", async () => {
        expect(
            await validateBody({ canEditContent: true, role: "ADMINISTRADOR" })
        ).not.toHaveLength(0);
    });
});
