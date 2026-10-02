import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { UsersModule } from "./users/users.module.js";
import { PrismaService } from "./prisma/prisma.service.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module.js";
import { CryptoModule } from "./crypto/crypto.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { EmailModule } from "./email/email.module.js";
import { PasswordResetModule } from "./password-reset/password-reset.module.js";
import Joi from "joi";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                DATABASE_URL: Joi.string().required(),
                JWT_SECRET: Joi.string().required(),
                JWT_EXPIRES_IN: Joi.string().required(),
                MINIO_ENDPOINT: Joi.string().required(),
                MINIO_ACCESS_KEY: Joi.string().required(),
                MINIO_SECRET_KEY: Joi.string().required(),
                MINIO_BUCKET: Joi.string().required(),
                MINIO_REGION: Joi.string().required(),
            }),
        }),
        UsersModule,
        PrismaModule,
        AuthModule,
        CryptoModule,
        StorageModule,
        EmailModule,
        PasswordResetModule,
    ],
    controllers: [AppController],
    providers: [AppService, PrismaService],
})
export class AppModule {}
