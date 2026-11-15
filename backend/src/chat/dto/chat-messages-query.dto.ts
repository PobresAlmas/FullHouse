import { IsOptional, IsUUID } from "class-validator";

export class ChatMessagesQueryDto {
    @IsOptional()
    @IsUUID("4", { message: "O identificador da última mensagem é inválido." })
    afterId?: string;
}
