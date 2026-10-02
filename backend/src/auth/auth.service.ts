import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service.js";
import { RegisterDto } from "./dto/register.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { PasswordService } from "../crypto/password.service.js";
import { toUserResponse } from "../users/users.mapper.js";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";
import { PasswordResetService } from "../password-reset/password-reset.service.js";
import { ResetPasswordDto } from "./dto/reset-password.dto.js";

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly passwordService: PasswordService,
        private readonly passwordResetService: PasswordResetService,
        private readonly jwtService: JwtService
    ) {}

    async register(data: RegisterDto) {
        const user = await this.usersService.create(data);

        const token = this.jwtService.sign({
            sub: user.id,
            email: user.email,
        });

        return {
            access_token: token,
            user: toUserResponse(user),
        };
    }

    async login(data: LoginDto, _response: Response) {
        void _response;
        const user = await this.usersService.findByEmail(data.email);

        if (!user) throw new UnauthorizedException("E-mail ou senha inválidos.");

        const passwordValid = await this.passwordService.compare(data.password, user.senha_hash);

        if (!passwordValid) throw new UnauthorizedException("E-mail ou senha inválidos.");

        const token = this.jwtService.sign({
            sub: user.id,
            email: user.email,
        });

        return {
            access_token: token,
            user: toUserResponse(user),
        };
    }

    async forgotPassword(email: string) {
        const user = await this.usersService.findByEmail(email);

        if (!user)
            return {
                message: "Se o email existir, enviaremos um código.",
            };

        await this.passwordResetService.create(user.id, user.email);

        return {
            message: "Se o email existir, enviaremos um código.",
        };
    }

    async verifyResetCode(email: string, code: string) {
        const user = await this.usersService.findByEmail(email);

        if (!user) return { valid: false };

        const valid = await this.passwordResetService.verify(user.id, code);

        return { valid };
    }

    async resetPassword(data: ResetPasswordDto) {
        const user = await this.usersService.findByEmail(data.email);

        if (!user) throw new UnauthorizedException("Código inválido");

        const reset = await this.passwordResetService.verify(user.id, data.code);

        if (!reset) throw new UnauthorizedException("Código inválido ou expirado");

        const passwordHash = await this.passwordService.hash(data.password);

        await this.usersService.updatePassword(user.id, passwordHash);

        await this.passwordResetService.consume(reset.id);

        return { message: "Senha alterada com sucesso." };
    }
}
