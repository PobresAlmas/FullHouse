import type { StringValue } from 'ms';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersModule } from '../users/users.module.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from './jwt.strategy.js';
import { ConfigService } from '@nestjs/config';
import { PasswordResetRepository } from '../password-reset/password-reset.repository.js';
import { PasswordResetService } from '../password-reset/password-reset.service.js';
import { PrismaModule } from "../prisma/prisma.module.js";
import { EmailModule } from '../email/email.module.js';
import { PasswordResetModule } from '../password-reset/password-reset.module.js';

@Module({
  imports: [
    UsersModule, 
    CryptoModule,
    PrismaModule,
    EmailModule,
    PasswordResetModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.getOrThrow<string>("JWT_EXPIRES_IN") as StringValue
        }
      })
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PasswordResetRepository,
    PasswordResetService
  ]
})

export class AuthModule {}
