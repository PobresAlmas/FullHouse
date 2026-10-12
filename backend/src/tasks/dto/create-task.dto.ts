import { Transform } from "class-transformer";
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";

export enum TaskPeriodicity {
    DIARIA = "DIARIA",
    SEMANAL = "SEMANAL",
    QUINZENAL = "QUINZENAL",
    MENSAL = "MENSAL",
    PERSONALIZADA = "PERSONALIZADA",
}

export class CreateTaskDto {
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1, { message: "Informe o tÃ­tulo da tarefa." })
    @MaxLength(150, { message: "O tÃ­tulo deve ter no mÃ¡ximo 150 caracteres." })
    title!: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MaxLength(2000, { message: "A descriÃ§Ã£o deve ter no mÃ¡ximo 2000 caracteres." })
    description?: string | null;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @MaxLength(40, { each: true })
    tags?: string[];

    @IsOptional()
    @IsUUID("4", { message: "Selecione um responsÃ¡vel vÃ¡lido." })
    assigneeId?: string | null;

    @IsDateString({}, { message: "Informe uma data e horÃ¡rio vÃ¡lidos." })
    dueAt!: string;

    @IsOptional()
    @IsBoolean()
    repeats?: boolean;

    @IsOptional()
    @IsEnum(TaskPeriodicity, { message: "Selecione uma frequÃªncia vÃ¡lida." })
    periodicity?: TaskPeriodicity;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(43200)
    reminderMinutesBefore?: number | null;
}
