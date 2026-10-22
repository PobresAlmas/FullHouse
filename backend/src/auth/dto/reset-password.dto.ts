import { Transform } from "class-transformer";
import { IsEmail, IsString, Matches, MinLength } from "class-validator";

export class ResetPasswordDto {
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsEmail()
    email: string;

    @IsString()
    @Matches(/^\d{6}$/, { message: "O código deve ter 6 dígitos." })
    code: string;

    @IsString()
    @MinLength(8, { message: "A senha deve ter pelo menos 8 caracteres." })
    password: string;
}
