import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
    @IsEmail({}, { message: "Digite um email válido" })
    email: string;
}
