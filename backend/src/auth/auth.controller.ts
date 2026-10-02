import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { RegisterDto } from "./dto/register.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./guards/jwt-auth-guard.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import type { Response } from "express";
import { ForgotPasswordDto } from "./dto/forgot-password.dto.js";
import { VerifyResetCodeDto } from "./dto/verify-reset-code.js";
import { ResetPasswordDto } from "./dto/reset-password.dto.js";

@Controller("auth")
export class AuthController {
    constructor(private readonly service: AuthService) {}

    @Get("me")
    @UseGuards(JwtAuthGuard)
    me(
        @CurrentUser()
        user: any
    ) {
        return user;
    }

    @Post("register")
    async register(@Body() data: RegisterDto, @Res({ passthrough: true }) response: Response) {
        const result = await this.service.register(data);

        response.cookie("access_token", result.access_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
        });

        return {
            user: result.user,
        };
    }

    @Post("login")
    async login(@Body() data: LoginDto, @Res({ passthrough: true }) response: Response) {
        const result = await this.service.login(data, response);

        const maxAge = data.rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24;

        response.cookie("access_token", result.access_token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge,
        });

        return {
            user: result.user,
        };
    }

    @Post("logout")
    async logout(@Res({ passthrough: true }) response: Response) {
        response.clearCookie("access_token");

        return {
            message: "Logout realizado",
        };
    }

    @Post("forgot-password")
    forgotPassword(@Body() data: ForgotPasswordDto) {
        return this.service.forgotPassword(data.email);
    }

    @Post("verify-reset-code")
    verifyResetCode(@Body() data: VerifyResetCodeDto) {
        return this.service.verifyResetCode(data.email, data.code);
    }

    @Post("reset-password")
    resetPassword(@Body() data: ResetPasswordDto) {
        return this.service.resetPassword(data);
    }
}
