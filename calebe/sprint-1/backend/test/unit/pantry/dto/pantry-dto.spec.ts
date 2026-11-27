import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreatePantryItemDto } from "../../../../src/pantry/dto/create-pantry-item.dto.js";
import { CreatePantryMovementDto } from "../../../../src/pantry/dto/create-pantry-movement.dto.js";
import { PantryItemListQueryDto } from "../../../../src/pantry/dto/pantry-item-list-query.dto.js";
import { UpdatePantryItemDto } from "../../../../src/pantry/dto/update-pantry-item.dto.js";

describe("Pantry DTO validation", () => {
    it("trims item text and converts valid quantity fields to numbers", async () => {
        const dto = plainToInstance(CreatePantryItemDto, {
            name: "  Arroz  ",
            category: " Grãos ",
            property: "COMUNITARIO",
            unit: "KG",
            initialQuantity: "2.5",
            minimumQuantity: "1",
        });

        await expect(validate(dto)).resolves.toHaveLength(0);
        expect(dto).toMatchObject({
            name: "Arroz",
            category: "Grãos",
            initialQuantity: 2.5,
            minimumQuantity: 1,
        });
    });

    it("rejects invalid item enums, malformed owners, and non-strict dates", async () => {
        const dto = plainToInstance(CreatePantryItemDto, {
            name: "Arroz",
            category: "Grãos",
            property: "PUBLICO",
            unit: "CAIXA",
            initialQuantity: 1,
            ownerMemberId: "not-a-uuid",
            expirationDate: "31/12/2026",
        });
        const errors = await validate(dto, { whitelist: true });
        expect(errors.map((error) => error.property)).toEqual(
            expect.arrayContaining(["property", "unit", "ownerMemberId", "expirationDate"])
        );
    });

    it("requires valid movement types and positive quantities with at most two decimals", async () => {
        const invalid = plainToInstance(CreatePantryMovementDto, { type: "REMOVE", quantity: "0" });
        const errors = await validate(invalid);
        expect(errors.map((error) => error.property)).toEqual(
            expect.arrayContaining(["type", "quantity"])
        );

        const valid = plainToInstance(CreatePantryMovementDto, {
            type: "CONSUMO",
            quantity: "0.25",
        });
        await expect(validate(valid)).resolves.toHaveLength(0);
        expect(valid.quantity).toBe(0.25);
    });

    it("allows only supported optional update fields and validates explicit values", async () => {
        const dto = plainToInstance(UpdatePantryItemDto, {
            name: "  ",
            category: 123,
            minimumQuantity: "1.234",
            property: "CASA",
            unexpected: "ignored by whitelist",
        });
        const errors = await validate(dto, { whitelist: true });
        expect(errors.map((error) => error.property)).toEqual(
            expect.arrayContaining(["name", "category", "minimumQuantity", "property"])
        );
        expect(dto).not.toHaveProperty("unexpected");
    });

    it("trims the optional list search and rejects non-string or overlong input", async () => {
        const valid = plainToInstance(PantryItemListQueryDto, { search: "  arroz  " });
        await expect(validate(valid)).resolves.toHaveLength(0);
        expect(valid.search).toBe("arroz");

        const invalid = plainToInstance(PantryItemListQueryDto, { search: "x".repeat(101) });
        expect((await validate(invalid)).map((error) => error.property)).toContain("search");

        const nonString = plainToInstance(PantryItemListQueryDto, { search: 10 });
        expect((await validate(nonString)).map((error) => error.property)).toContain("search");
    });
});
