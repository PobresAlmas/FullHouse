import { Transform, Type } from "class-transformer";
import {
    IsIn,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";

const cleanText = ({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().replace(/\s+/gu, " ") : value;

export class CreateShoppingListItemDto {
    @IsString()
    @Transform(cleanText)
    @MinLength(1, { message: "Informe o nome do item." })
    @MaxLength(100, { message: "O nome deve ter no máximo 100 caracteres." })
    name!: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0.001)
    @Max(999999999.999)
    quantity?: number | null;

    @IsOptional()
    @IsIn(["UNIDADE", "KG", "G", "L", "ML", "PACOTE"])
    unit?: "UNIDADE" | "KG" | "G" | "L" | "ML" | "PACOTE" | null;

    @IsOptional()
    @IsString()
    @Transform(cleanText)
    @MaxLength(500, { message: "A observação deve ter no máximo 500 caracteres." })
    notes?: string | null;
}
