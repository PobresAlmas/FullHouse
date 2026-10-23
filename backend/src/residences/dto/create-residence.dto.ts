import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateResidenceDto {
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsString({ message: "Informe um nome válido para a casa." })
    @MinLength(1, { message: "Informe o nome da casa." })
    @MaxLength(150, { message: "O nome da casa deve ter até 150 caracteres." })
    name!: string;
}
