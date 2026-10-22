import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MinLength(3, { message: "Nome deve ter pelo menos 3 caracteres." })
    @MaxLength(150)
    name: string;

    @IsString()
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @MaxLength(100)
    nickname: string;

    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsEmail({}, { message: "Digite um email válido." })
    email: string;

    @IsString()
    @MinLength(8, { message: "A senha deve ter pelo menos 8 caracteres." })
    password: string;
}
