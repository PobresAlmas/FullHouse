import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateShoppingListItemDto } from "../../../../src/shopping-list/dto/create-shopping-list-item.dto.js";
import { UpdateShoppingListItemDto } from "../../../../src/shopping-list/dto/update-shopping-list-item.dto.js";
import { UpdateShoppingListStatusDto } from "../../../../src/shopping-list/dto/update-shopping-list-status.dto.js";

describe("shopping list DTO validation", () => {
    it("trims and collapses text and converts a supported decimal quantity", async () => {
        const dto = plainToInstance(CreateShoppingListItemDto, {
            name: "  Leite   integral ",
            quantity: "1.125",
            unit: "L",
            notes: "  Sem   lactose ",
        });
        await expect(validate(dto)).resolves.toHaveLength(0);
        expect(dto).toMatchObject({
            name: "Leite integral",
            quantity: 1.125,
            unit: "L",
            notes: "Sem lactose",
        });
    });

    it.each([
        { name: "", unit: "KG" },
        { name: "x".repeat(101) },
        { name: "Arroz", quantity: "0", unit: "KG" },
        { name: "Arroz", quantity: "1.1234", unit: "KG" },
        { name: "Arroz", quantity: "1000000000", unit: "KG" },
        { name: "Arroz", quantity: 1, unit: "BOX" },
        { name: "Arroz", notes: "x".repeat(501) },
    ])("rejects invalid create values %#", async (payload) => {
        const dto = plainToInstance(CreateShoppingListItemDto, payload);
        await expect(validate(dto)).resolves.not.toHaveLength(0);
    });

    it("uses documented messages for empty names and overlong notes", async () => {
        const emptyNameErrors = await validate(
            plainToInstance(CreateShoppingListItemDto, { name: "  " })
        );
        expect(
            emptyNameErrors.flatMap((error) => Object.values(error.constraints ?? {}))
        ).toContain("Informe o nome do item.");
        const longNotesErrors = await validate(
            plainToInstance(CreateShoppingListItemDto, {
                name: "Arroz",
                notes: "x".repeat(501),
            })
        );
        expect(
            longNotesErrors.flatMap((error) => Object.values(error.constraints ?? {}))
        ).toContain("A observação deve ter no máximo 500 caracteres.");
    });

    it("accepts omitted quantity and unit and nullable optional fields", async () => {
        const dto = plainToInstance(CreateShoppingListItemDto, {
            name: "Detergente",
            quantity: null,
            unit: null,
            notes: null,
        });
        await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it("requires a positive integer version and validates optional update fields", async () => {
        const valid = plainToInstance(UpdateShoppingListItemDto, {
            version: 2,
            name: "Arroz",
            quantity: "1.5",
            unit: "KG",
            notes: null,
        });
        await expect(validate(valid)).resolves.toHaveLength(0);
        expect(valid.version).toBe(2);
        for (const version of [0, 1.5, "abc"]) {
            const invalid = plainToInstance(UpdateShoppingListItemDto, { version });
            await expect(validate(invalid)).resolves.not.toHaveLength(0);
        }
    });

    it("allows only the two supported status values", async () => {
        for (const status of ["PENDENTE", "COMPRADO"]) {
            const dto = plainToInstance(UpdateShoppingListStatusDto, { version: 1, status });
            await expect(validate(dto)).resolves.toHaveLength(0);
        }
        const invalid = plainToInstance(UpdateShoppingListStatusDto, {
            version: 1,
            status: "REMOVIDO",
        });
        await expect(validate(invalid)).resolves.not.toHaveLength(0);
    });
});
