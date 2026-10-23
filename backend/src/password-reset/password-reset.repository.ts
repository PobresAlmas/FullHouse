import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class PasswordResetRepository {
    constructor(private readonly prisma: PrismaService) {}

    create(data: { usuario_id: string; codigo: string; expira_em: Date }) {
        return this.prisma.password_reset.create({
            data,
        });
    }

    findValid(usuario_id: string, codigo: string) {
        return this.prisma.password_reset.findFirst({
            where: {
                usuario_id,
                codigo,
                usado: false,
                expira_em: {
                    gt: new Date(),
                },
            },
        });
    }

    markUsed(id: string) {
        return this.prisma.password_reset.update({
            where: {
                id,
            },
            data: {
                usado: true,
            },
        });
    }

    consumeAndUpdatePassword(resetId: string, userId: string, passwordHash: string) {
        return this.prisma.$transaction(async (tx) => {
            const result = await tx.password_reset.updateMany({
                where: {
                    id: resetId,
                    usuario_id: userId,
                    usado: false,
                    expira_em: { gt: new Date() },
                },
                data: {
                    usado: true,
                },
            });

            if (result.count !== 1) throw new UnauthorizedException("Código inválido ou expirado.");

            await tx.usuario.update({
                where: { id: userId },
                data: { senha_hash: passwordHash },
            });
        });
    }
}
