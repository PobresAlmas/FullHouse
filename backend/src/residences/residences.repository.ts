import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class ResidencesRepository {
    constructor(private readonly prisma: PrismaService) {}

    create(name: string, userId: string) {
        return this.prisma.$transaction(async (transaction) => {
            const residence = await transaction.casa.create({
                data: { nome: name, criada_por_usuario_id: userId },
                select: { id: true, nome: true, cidade: true, bairro: true, status: true },
            });
            const membership = await transaction.participacao.create({
                data: { casa_id: residence.id, usuario_id: userId, papel: "LIDER" },
                select: { id: true, papel: true },
            });

            return { residence, membership };
        });
    }
}
