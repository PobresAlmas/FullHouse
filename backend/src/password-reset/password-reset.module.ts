import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { EmailModule } from "../email/email.module.js";
import { PasswordResetRepository } from "./password-reset.repository.js";
import { PasswordResetService } from "./password-reset.service.js";

@Module({
    imports: [PrismaModule, EmailModule],
    providers: [PasswordResetService, PasswordResetRepository],
    exports: [PasswordResetService],
})
export class PasswordResetModule {}
