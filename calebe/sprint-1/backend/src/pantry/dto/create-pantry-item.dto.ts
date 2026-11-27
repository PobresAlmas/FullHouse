import { Transform, Type } from "class-transformer";
import {
    IsDateString,
    IsIn,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
    IsUUID,
} from "class-validator";

export class CreatePantryItemDto {
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1)
    @MaxLength(150)
    name!: string;

    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1)
    @MaxLength(80)
    category!: string;

    @IsIn(["COMUNITARIO", "PRIVADO", "DONO_ESPECIFICO"])
    property!: "COMUNITARIO" | "PRIVADO" | "DONO_ESPECIFICO";

    @IsOptional()
    @IsUUID("4")
    ownerMemberId?: string | null;

    @IsIn(["UNIDADE", "KG", "G", "L", "ML", "PACOTE"])
    unit!: "UNIDADE" | "KG" | "G" | "L" | "ML" | "PACOTE";

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(99999999)
    initialQuantity!: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(99999999)
    minimumQuantity?: number | null;

    @IsOptional()
    @IsDateString({ strict: true })
    expirationDate?: string | null;
}
