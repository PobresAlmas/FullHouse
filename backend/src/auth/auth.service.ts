import { BadGatewayException, Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service.js";
import { RegisterDto } from "./dto/register.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { PasswordService } from "../crypto/password.service.js";
import { toUserResponse } from "../users/users.mapper.js";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";
import { PasswordResetService } from "../password-reset/password-reset.service.js";
import { ResetPasswordDto } from "./dto/reset-password.dto.js";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly passwordService: PasswordService,
        private readonly passwordResetService: PasswordResetService,
        private readonly jwtService: JwtService
    ) {}

    async getCurrentUser(userId: string) {
        return toUserResponse(await this.usersService.findById(userId));
    }

    async register(data: RegisterDto) {
        const user = await this.usersService.create(data);

        const token = this.jwtService.sign({
            sub: user.id,
            email: user.email,
            name: user.apelido || user.nome,
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

        if (user.login_bloqueado_ate) {
            const now = new Date();
            if (user.login_bloqueado_ate > now) {
                throw new UnauthorizedException("E-mail ou senha inválidos.");
            }

            await this.usersService.clearExpiredLoginLock(user.id, now);
        }

        const passwordValid = await this.passwordService.compare(data.password, user.senha_hash);

        if (!passwordValid) {
            await this.usersService.recordFailedLogin(
                user.id,
                MAX_FAILED_LOGIN_ATTEMPTS,
                LOGIN_LOCKOUT_DURATION_MS
            );
            throw new UnauthorizedException("E-mail ou senha inválidos.");
        }

        await this.usersService.clearLoginFailures(user.id);

        const token = this.jwtService.sign({
            sub: user.id,
            email: user.email,
            name: user.apelido || user.nome,
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

        try {
            await this.passwordResetService.create(user.id, user.email);
        } catch {
            throw new BadGatewayException(
                "Não foi possível enviar o código agora. Verifique o serviço de e-mail e tente novamente."
            );
        }

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

        await this.passwordResetService.consumeAndUpdatePassword(reset.id, user.id, passwordHash);

        return { message: "Senha alterada com sucesso." };
    }
}
