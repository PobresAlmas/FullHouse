import { Transform, Type } from "class-transformer";
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, MinLength } from "class-validator";

export enum PetCareType {
    VACCINE = "VACCINE",
    FOOD = "FOOD",
    VET_VISIT = "VET_VISIT",
    MEDICATION = "MEDICATION",
    OTHER = "OTHER",
}

export class CreatePetCareLogDto {
    @IsEnum(PetCareType, { message: "Selecione um tipo de cuidado válido." })
    type!: PetCareType;

    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1)
    @MaxLength(150)
    title!: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    description?: string | null;

    @IsDateString({ strict: true }, { message: "Informe uma data válida." })
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    date!: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 }, { message: "Informe um valor numérico com até duas casas decimais." })
    @Min(0, { message: "O valor não pode ser negativo." })
    cost?: number | null;

    @IsOptional()
    @IsUUID("4", { message: "O morador pagador informado é inválido." })
    paidById?: string | null;

    @IsOptional()
    @IsUUID("4", { message: "A despesa informada é inválida." })
    expenseId?: string | null;
}
