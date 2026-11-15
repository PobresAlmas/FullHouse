import { Transform } from "class-transformer";
import { IsDateString, IsString, MaxLength, MinLength, Matches } from "class-validator";

export class CreateMeetingDto {
    @IsDateString()
    @Matches(/(Z|[+-]\d{2}:\d{2})$/, { message: "Informe a data com fuso horário explícito." })
    dateTime!: string;

    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1, { message: "Informe a pauta da reunião." })
    @MaxLength(5000)
    agenda!: string;
}
