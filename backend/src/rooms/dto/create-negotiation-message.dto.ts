import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateNegotiationMessageDto {
    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    conteudo!: string;
}
