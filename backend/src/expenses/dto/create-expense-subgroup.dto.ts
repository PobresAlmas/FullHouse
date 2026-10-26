import { Transform } from "class-transformer";
import {
    ArrayNotEmpty,
    ArrayUnique,
    IsArray,
    IsNotEmpty,
    IsString,
    IsUUID,
    MaxLength,
} from "class-validator";

export class CreateExpenseSubgroupDto {
    @IsUUID("4", { message: "Selecione uma residência válida." })
    homeId!: string;

    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsNotEmpty({ message: "Informe o nome do subgrupo." })
    @MaxLength(150, { message: "O nome do subgrupo deve ter no máximo 150 caracteres." })
    name!: string;

    @IsArray({ message: "Selecione os participantes do subgrupo." })
    @ArrayNotEmpty({ message: "Selecione pelo menos um participante." })
    @ArrayUnique({ message: "Não repita participantes no subgrupo." })
    @IsUUID("4", { each: true, message: "A lista contém um participante inválido." })
    memberIds!: string[];
}
