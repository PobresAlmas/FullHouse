import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateProfileDto } from "./update-profile.dto.js";

describe("UpdateProfileDto avatar color", () => {
    const validateBody = (body: unknown) =>
        validate(plainToInstance(UpdateProfileDto, body), {
            whitelist: true,
            forbidNonWhitelisted: true,
        });

    it.each(["#2f7f6f", "#AABBCC"])("accepts a six-digit hex color %s", async (color) => {
        await expect(validateBody({ avatarBackgroundColor: color })).resolves.toHaveLength(0);
    });

    it.each(["#fff", "green", "#12FG00", "2f7f6f"])("rejects invalid color %s", async (color) => {
        expect(await validateBody({ avatarBackgroundColor: color })).not.toHaveLength(0);
    });

    it("trims profile text and still accepts sparse updates", async () => {
        const result = plainToInstance(UpdateProfileDto, { nickname: " Nina " });
        expect(result.nickname).toBe("Nina");
        await expect(validateBody({ nickname: " Nina " })).resolves.toHaveLength(0);
    });
});
