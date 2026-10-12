import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { TaskPeriodicity } from "./create-task.dto.js";

export enum TaskStatusFilter {
    PENDENTE = "PENDENTE",
    EM_ANDAMENTO = "EM_ANDAMENTO",
    CONCLUIDA = "CONCLUIDA",
    ATRASADA = "ATRASADA",
    CANCELADA = "CANCELADA",
}

export class TaskListQueryDto {
    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MaxLength(100)
    search?: string;

    @IsOptional()
    @IsEnum(TaskStatusFilter)
    status?: TaskStatusFilter;

    @IsOptional()
    @IsUUID("4")
    assigneeId?: string;

    @IsOptional()
    @IsEnum(TaskPeriodicity)
    periodicity?: TaskPeriodicity;
}
