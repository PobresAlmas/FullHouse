import { IsIn, IsOptional, IsUUID } from "class-validator";

export class RespondTaskExchangeDto {
    @IsIn(["ACEITA", "RECUSADA"])
    status!: "ACEITA" | "RECUSADA";

    @IsOptional()
    @IsUUID("4")
    targetTaskId?: string;
}
