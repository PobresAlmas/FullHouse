import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use((_request: Request, response: Response, next: NextFunction) => {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        next();
    });

    app.use(cookieParser());

    const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3001";
    const allowedOrigin = new URL(frontendOrigin).origin;
    app.enableCors({
        origin: allowedOrigin,
        credentials: true,
    });

    app.use((request: Request, response: Response, next: NextFunction) => {
        if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();

        const source = request.get("origin") ?? request.get("referer");
        if (source) {
            try {
                if (new URL(source).origin !== allowedOrigin) {
                    return response.status(403).json({ message: "Origem não permitida." });
                }
            } catch {
                return response.status(403).json({ message: "Origem não permitida." });
            }
        } else {
            return response.status(403).json({ message: "Origem da requisição ausente." });
        }
        return next();
    });

    await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
