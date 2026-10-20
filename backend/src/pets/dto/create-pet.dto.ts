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

export class CreatePetDto {
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1, { message: "Informe o nome do pet." })
    @MaxLength(100, { message: "O nome deve ter no máximo 100 caracteres." })
    name!: string;

    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1, { message: "Informe a espécie do pet." })
    @MaxLength(100, { message: "A espécie deve ter no máximo 100 caracteres." })
    species!: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MaxLength(100, { message: "A raça deve ter no máximo 100 caracteres." })
    breed?: string | null;

    @IsOptional()
    @IsDateString({ strict: true }, { message: "Informe uma data de nascimento válida." })
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Informe a data no formato AAAA-MM-DD." })
    birthDate?: string | null;

    @IsOptional()
    @IsUrl({}, { message: "Informe uma URL de foto válida." })
    @MaxLength(500, { message: "A URL da foto deve ter no máximo 500 caracteres." })
    photoUrl?: string | null;
}
