import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdatePantryCategoryDto {
    @IsOptional()
    @IsString()
    @Transform(({ value }) =>
        typeof value === "string" ? value.trim().replace(/\s+/gu, " ") : value
    )
    @MinLength(1, { message: "Informe o nome da categoria." })
    @MaxLength(80, { message: "O nome da categoria deve ter no máximo 80 caracteres." })
    name?: string;
}
