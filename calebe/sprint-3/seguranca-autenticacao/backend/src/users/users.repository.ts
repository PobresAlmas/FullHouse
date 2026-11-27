import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { Prisma } from "../generated/prisma/client.js";

@Injectable()
export class UserRepository {
    constructor(private readonly prisma: PrismaService) {}

    findAll() {
        return this.prisma.usuario.findMany();
    }

    findByEmail(email: string) {
        return this.prisma.usuario.findUnique({
            where: { email },
        });
    }

    create(data: {
        nome: string;
        apelido?: string;
        email: string;
        senha_hash: string;
        codigo_pessoal: string;
    }) {
        return this.prisma.usuario.create({ data });
    }

    update(id: string, data: Prisma.usuarioUpdateInput) {
        return this.prisma.usuario.update({
            where: { id },
            data,
        });
    }

    recordFailedLogin(userId: string, maxAttempts: number, lockDurationMs: number) {
        return this.prisma.$transaction(async (transaction) => {
            const user = await transaction.usuario.update({
                where: { id: userId },
                data: { falhas_login: { increment: 1 } },
                select: { falhas_login: true },
            });

            if (user.falhas_login >= maxAttempts) {
                return transaction.usuario.update({
                    where: { id: userId },
                    data: { login_bloqueado_ate: new Date(Date.now() + lockDurationMs) },
                });
            }

            return user;
        });
    }

    clearLoginFailures(userId: string) {
        return this.prisma.usuario.update({
            where: { id: userId },
            data: { falhas_login: 0, login_bloqueado_ate: null },
        });
    }

    clearExpiredLoginLock(userId: string, now: Date) {
        return this.prisma.usuario.updateMany({
            where: { id: userId, login_bloqueado_ate: { lte: now } },
            data: { falhas_login: 0, login_bloqueado_ate: null },
        });
    }
}
