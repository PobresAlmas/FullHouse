import { Type } from "class-transformer";
import { IsIn, IsNumber, Max, Min } from "class-validator";

export class CreatePantryMovementDto {
    @IsIn(["ENTRADA", "CONSUMO", "DESCARTE"])
    type!: "ENTRADA" | "CONSUMO" | "DESCARTE";

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(99999999)
    quantity!: number;
}
