import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreatePantryCategoryDto } from "../../../../src/pantry/dto/create-pantry-category.dto.js";
import { UpdatePantryCategoryDto } from "../../../../src/pantry/dto/update-pantry-category.dto.js";

describe("pantry category DTO validation", () => {
    it("trims names and collapses internal whitespace", async () => {
        const dto = plainToInstance(CreatePantryCategoryDto, { name: "  Frutas   e  verduras " });
        await expect(validate(dto)).resolves.toHaveLength(0);
        expect(dto.name).toBe("Frutas e verduras");
    });

    it.each(["", "   ", "x".repeat(81), 10, null])(
        "rejects an invalid category name: %j",
        async (name) => {
            const dto = plainToInstance(CreatePantryCategoryDto, { name });
            await expect(validate(dto)).resolves.not.toHaveLength(0);
        }
    );

    it("uses documented messages for empty and overlong names", async () => {
        const emptyErrors = await validate(
            plainToInstance(CreatePantryCategoryDto, { name: "  " })
        );
        expect(emptyErrors.flatMap((error) => Object.values(error.constraints ?? {}))).toContain(
            "Informe o nome da categoria."
        );
        const longErrors = await validate(
            plainToInstance(CreatePantryCategoryDto, { name: "x".repeat(81) })
        );
        expect(longErrors.flatMap((error) => Object.values(error.constraints ?? {}))).toContain(
            "O nome da categoria deve ter no máximo 80 caracteres."
        );
    });

    it("allows an empty patch but validates any provided name", async () => {
        await expect(validate(plainToInstance(UpdatePantryCategoryDto, {}))).resolves.toHaveLength(
            0
        );
        const invalid = plainToInstance(UpdatePantryCategoryDto, { name: "  " });
        await expect(validate(invalid)).resolves.not.toHaveLength(0);
    });
});
