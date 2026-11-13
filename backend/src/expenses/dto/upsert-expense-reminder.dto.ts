import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertExpenseReminderDto {
    @IsDateString({}, { message: "Informe uma data e horário válidos." })
    remindAt!: string;

    @IsOptional()
    @IsString({ message: "A mensagem deve ser um texto." })
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MaxLength(200, { message: "A mensagem deve ter no máximo 200 caracteres." })
    message?: string;

    @IsBoolean({ message: "Informe se a notificação está ativada." })
    enabled!: boolean;
}
