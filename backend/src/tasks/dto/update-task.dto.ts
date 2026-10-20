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
import { TaskPeriodicity } from "./create-task.dto.js";

export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1)
    @MaxLength(150)
    title?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MaxLength(2000)
    description?: string | null;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @MaxLength(40, { each: true })
    tags?: string[];

    @IsOptional()
    @IsUUID("4")
    assigneeId?: string | null;

    @IsOptional()
    @IsDateString()
    dueAt?: string;

    @IsOptional()
    @IsBoolean()
    repeats?: boolean;

    @IsOptional()
    @IsEnum(TaskPeriodicity)
    periodicity?: TaskPeriodicity;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(43200)
    reminderMinutesBefore?: number | null;
}
