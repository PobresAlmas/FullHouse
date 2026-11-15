import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class SendMessageDto {
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(1, { message: "Escreva uma mensagem antes de enviar." })
    @MaxLength(4000)
    content!: string;
}
