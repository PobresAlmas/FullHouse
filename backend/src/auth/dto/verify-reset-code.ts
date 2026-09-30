import { IsEmail, IsString } from "class-validator";

export class VerifyResetCodeDto {
    @IsEmail()
    email: string;

    @IsString()
    code: string;
}