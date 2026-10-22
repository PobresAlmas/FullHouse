import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsEmail({}, { message: "Digite um email válido." })
    email: string;

    @IsString()
    @MinLength(8, { message: "A senha deve ter pelo menos 8 caracteres." })
    password: string;

    @IsOptional()
    @Transform(({ value }) =>
        typeof value === "string" && /^(true|false)$/i.test(value)
            ? value.toLowerCase() === "true"
            : value
    )
    @IsBoolean({ message: "A opção lembrar de mim deve ser verdadeira ou falsa." })
    rememberMe?: boolean;
}
