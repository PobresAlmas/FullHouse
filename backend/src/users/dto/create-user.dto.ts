import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
    @IsString()
    @MinLength(3)
    name: string;

    @IsOptional()
    @IsString()
    nickname: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;
}
