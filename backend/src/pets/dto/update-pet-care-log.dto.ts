import { Transform, Type } from "class-transformer";
import {
    IsDateString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";
import { PetCareType } from "./create-pet-care-log.dto.js";

export class UpdatePetCareLogDto {
    @IsOptional()
    @IsEnum(PetCareType)
    type?: PetCareType;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1)
    @MaxLength(150)
    title?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    description?: string | null;

    @IsOptional()
    @IsDateString({ strict: true })
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    date?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    cost?: number | null;

    @IsOptional()
    @IsUUID("4")
    paidById?: string | null;

    @IsOptional()
    @IsUUID("4")
    expenseId?: string | null;
}
