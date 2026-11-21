import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import {
    DEFAULT_PANTRY_CATEGORIES,
    normalizePantryCategoryName,
} from "../pantry/pantry-categories.js";

@Injectable()
export class ResidencesRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(name: string, userId: string) {
        try {
            return await this.prisma.$transaction(async (transaction) => {
                const existingMembership = await transaction.participacao.findFirst({
                    where: { usuario_id: userId, data_saida: null },
                    select: { id: true },
                });
                if (existingMembership) {
                    throw new ConflictException("Você já possui uma residência ativa.");
                }

                const residence = await transaction.casa.create({
                    data: { nome: name, criada_por_usuario_id: userId },
                    select: { id: true, nome: true, cidade: true, bairro: true, status: true },
                });
                const membership = await transaction.participacao.create({
                    data: { casa_id: residence.id, usuario_id: userId, papel: "LIDER" },
                    select: { id: true, papel: true },
                });

                await transaction.categoria_despensa.createMany({
                    data: DEFAULT_PANTRY_CATEGORIES.map((nome) => ({
                        casa_id: residence.id,
                        nome,
                        nome_normalizado: normalizePantryCategoryName(nome),
                    })),
                });

                return { residence, membership };
            });
        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "P2002"
            ) {
                throw new ConflictException("Você já possui uma residência ativa.");
            }
            throw error;
        }
    }
}
