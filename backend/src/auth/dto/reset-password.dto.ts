import { IsEmail, IsString } from "class-validator";

export class ResetPasswordDto {
    @IsEmail()
    email: string;

    @IsString()
    code: string;

    @IsString()
    password: string;
}
