import { Injectable } from "@nestjs/common";
import { PasswordResetRepository } from "./password-reset.repository.js";
import { EmailService } from "../email/email.service.js";
import { randomInt } from "node:crypto";

@Injectable()
export class PasswordResetService {
    constructor(
        private readonly repository: PasswordResetRepository,
        private readonly emailService: EmailService
    ) {}

    async create(userId: string, email: string) {
        const code = randomInt(100000, 1000000).toString();

        const expires_in = new Date();

        expires_in.setMinutes(expires_in.getMinutes() + 15);

        const reset = await this.repository.create({
            usuario_id: userId,
            codigo: code,
            expira_em: expires_in,
        });

        await this.emailService.sendResetPasswordEmail(email, code);

        return reset;
    }

    async verify(userId: string, codigo: string) {
        return this.repository.findValid(userId, codigo);
    }

    async consume(id: string) {
        return this.repository.markUsed(id);
    }

    async consumeAndUpdatePassword(resetid: string, userId: string, passwordHash: string) {
        await this.repository.consumeAndUpdatePassword(resetid, userId, passwordHash);
    }
}
