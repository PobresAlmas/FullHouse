import { IsUUID } from "class-validator";

export class MarkChatReadDto {
    @IsUUID("4", { message: "A mensagem informada é inválida." })
    messageId!: string;
}
