import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateRoomInterestDto {
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    mensagem?: string;
}
