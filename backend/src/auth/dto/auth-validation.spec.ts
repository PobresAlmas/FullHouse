import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { LoginDto } from "./login.dto.js";
import { RegisterDto } from "./register.dto.js";
import { ResetPasswordDto } from "./reset-password.dto.js";

describe("authentication DTO validation", () => {
    const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    });

    it("validates login fields and converts string rememberMe values", async () => {
        const result = await pipe.transform(
            {
                email: " person@example.com ",
                password: "password123",
                rememberMe: "false",
            },
            { type: "body", metatype: LoginDto }
        );

        expect(result).toMatchObject({
            email: "person@example.com",
            password: "password123",
            rememberMe: false,
        });
    });

    it("rejects invalid login fields and unknown properties", async () => {
        await expect(
            pipe.transform(
                { email: "not-an-email", password: "short", extra: true },
                { type: "body", metatype: LoginDto }
            )
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("accepts the registration payload used by the web form", async () => {
        const result = await pipe.transform(
            {
                name: " Ana ",
                nickname: "",
                email: " ana@example.com ",
                password: "password123",
            },
            { type: "body", metatype: RegisterDto }
        );

        expect(result).toMatchObject({
            name: "Ana",
            nickname: "",
            email: "ana@example.com",
            password: "password123",
        });
    });

    it("rejects malformed password reset codes", async () => {
        await expect(
            pipe.transform(
                { email: "ana@example.com", code: "12ab", password: "password123" },
                { type: "body", metatype: ResetPasswordDto }
            )
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
