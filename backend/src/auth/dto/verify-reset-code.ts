import { Transform } from "class-transformer";
import { IsEmail, IsString, Matches } from "class-validator";

export class VerifyResetCodeDto {
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsEmail()
    email: string;

    @IsString()
    @Matches(/^\d{6}$/, { message: "O código deve ter 6 dígitos." })
    code: string;
}
