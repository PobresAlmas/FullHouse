import { Transform } from "class-transformer";
import {
    IsDateString,
    IsOptional,
    IsString,
    IsUrl,
    Matches,
    MaxLength,
    MinLength,
} from "class-validator";

export class UpdatePetDto {
    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1, { message: "Informe o nome do pet." })
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1, { message: "Informe a espécie do pet." })
    @MaxLength(100)
    species?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MaxLength(100)
    breed?: string | null;

    @IsOptional()
    @IsDateString({ strict: true })
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    birthDate?: string | null;

    @IsOptional()
    @IsUrl()
    @MaxLength(500)
    photoUrl?: string | null;
}
