import { IsOptional, IsUUID } from "class-validator";

export class CreateTaskExchangeDto {
    @IsUUID("4")
    taskId!: string;

    @IsUUID("4")
    recipientMemberId!: string;

    @IsOptional()
    @IsUUID("4")
    targetTaskId?: string;
}
