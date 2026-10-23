import { BadRequestException, Injectable } from "@nestjs/common";
import type {
    propriedade_item_enum,
    tipo_movimentacao_despensa_enum,
    unidade_item_enum,
} from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";

const itemInclude = {
    participacao_item_despensa_dono_participacao_idToparticipacao: {
        select: { id: true, usuario: { select: { nome: true, apelido: true } } },
    },
    participacao_item_despensa_criado_por_participacao_idToparticipacao: {
        select: { id: true },
    },
} as const;

@Injectable()
export class PantryRepository {
    constructor(private readonly prisma: PrismaService) {}

    findMembers(residenceId: string) {
        return this.prisma.participacao.findMany({
            where: { casa_id: residenceId, data_saida: null },
            select: {
                id: true,
                usuario: { select: { nome: true, apelido: true } },
            },
            orderBy: [{ usuario: { nome: "asc" } }, { id: "asc" }],
        });
    }

    findItems(residenceId: string, memberId: string, search?: string) {
        return this.prisma.item_despensa
            .findMany({
                where: {
                    casa_id: residenceId,
                    OR: [
                        { propriedade: { not: "PRIVADO" } },
                        { propriedade: "PRIVADO", dono_participacao_id: memberId },
                    ],
                    ...(search
                        ? {
                              AND: [
                                  {
                                      OR: [
                                          {
                                              nome: {
                                                  contains: search,
                                                  mode: "insensitive" as const,
                                              },
                                          },
                                          {
                                              categoria: {
                                                  contains: search,
                                                  mode: "insensitive" as const,
                                              },
                                          },
                                      ],
                                  },
                              ],
                          }
                        : {}),
                },
                include: itemInclude,
                orderBy: [{ nome: "asc" }, { id: "asc" }],
            })
            .then(async (items) => {
                if (items.length === 0) return [];
                const totals = await this.prisma.movimentacao_despensa.groupBy({
                    by: ["item_despensa_id", "tipo"],
                    where: { item_despensa_id: { in: items.map((item) => item.id) } },
                    _sum: { quantidade: true },
                });
                return items.map((item) => ({
                    ...item,
                    movimentacao_despensa: totals
                        .filter((movement) => movement.item_despensa_id === item.id)
                        .map((movement) => ({
                            tipo: movement.tipo,
                            quantidade: movement._sum.quantidade ?? 0,
                        })),
                }));
            });
    }

    async findItem(residenceId: string, itemId: string, memberId: string) {
        const item = await this.prisma.item_despensa.findFirst({
            where: {
                id: itemId,
                casa_id: residenceId,
                OR: [
                    { propriedade: { not: "PRIVADO" } },
                    { propriedade: "PRIVADO", dono_participacao_id: memberId },
                ],
            },
            include: itemInclude,
        });
        if (!item) return null;
        const totals = await this.prisma.movimentacao_despensa.groupBy({
            by: ["tipo"],
            where: { item_despensa_id: itemId },
            _sum: { quantidade: true },
        });
        return {
            ...item,
            movimentacao_despensa: totals.map((movement) => ({
                tipo: movement.tipo,
                quantidade: movement._sum.quantidade ?? 0,
            })),
        };
    }

    countMovements(itemId: string) {
        return this.prisma.movimentacao_despensa.count({ where: { item_despensa_id: itemId } });
    }

    createItem(data: {
        residenceId: string;
        creatorMemberId: string;
        name: string;
        category: string;
        property: propriedade_item_enum;
        ownerMemberId: string | null;
        unit: unidade_item_enum;
        minimumQuantity: number | null;
        expirationDate: Date | null;
        initialQuantity: number;
    }) {
        return this.prisma.$transaction(async (transaction) => {
            const item = await transaction.item_despensa.create({
                data: {
                    casa_id: data.residenceId,
                    criado_por_participacao_id: data.creatorMemberId,
                    nome: data.name,
                    categoria: data.category,
                    propriedade: data.property,
                    dono_participacao_id: data.ownerMemberId,
                    unidade: data.unit,
                    quantidade_minima: data.minimumQuantity,
                    data_validade: data.expirationDate,
                },
            });

            if (data.initialQuantity > 0) {
                await transaction.movimentacao_despensa.create({
                    data: {
                        item_despensa_id: item.id,
                        tipo: "ENTRADA",
                        quantidade: data.initialQuantity,
                        participacao_id: data.creatorMemberId,
                    },
                });
            }

            return item.id;
        });
    }

    updateItem(
        itemId: string,
        data: {
            name?: string;
            category?: string;
            property?: propriedade_item_enum;
            ownerMemberId?: string | null;
            unit?: unidade_item_enum;
            minimumQuantity?: number | null;
            expirationDate?: Date | null;
        }
    ) {
        return this.prisma.item_despensa.update({
            where: { id: itemId },
            data: {
                ...(data.name !== undefined ? { nome: data.name } : {}),
                ...(data.category !== undefined ? { categoria: data.category } : {}),
                ...(data.property !== undefined ? { propriedade: data.property } : {}),
                ...(data.ownerMemberId !== undefined
                    ? { dono_participacao_id: data.ownerMemberId }
                    : {}),
                ...(data.unit !== undefined ? { unidade: data.unit } : {}),
                ...(data.minimumQuantity !== undefined
                    ? { quantidade_minima: data.minimumQuantity }
                    : {}),
                ...(data.expirationDate !== undefined
                    ? { data_validade: data.expirationDate }
                    : {}),
            },
        });
    }

    createMovement(data: {
        itemId: string;
        memberId: string;
        type: tipo_movimentacao_despensa_enum;
        quantity: number;
    }) {
        return this.prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`SELECT id FROM "item_despensa" WHERE id = ${data.itemId}::uuid FOR UPDATE`;

            if (data.type !== "ENTRADA") {
                const movements = await transaction.movimentacao_despensa.groupBy({
                    by: ["tipo"],
                    where: { item_despensa_id: data.itemId },
                    _sum: { quantidade: true },
                });
                const currentQuantity = movements.reduce((total, movement) => {
                    const amount = Number(movement._sum.quantidade ?? 0);
                    return total + (movement.tipo === "ENTRADA" ? amount : -amount);
                }, 0);
                if (data.quantity > currentQuantity) {
                    throw new BadRequestException(
                        "A quantidade informada é maior que o estoque disponível."
                    );
                }
            }

            return transaction.movimentacao_despensa.create({
                data: {
                    item_despensa_id: data.itemId,
                    participacao_id: data.memberId,
                    tipo: data.type,
                    quantidade: data.quantity,
                },
            });
        });
    }

    deleteItem(itemId: string) {
        return this.prisma.item_despensa.delete({ where: { id: itemId } });
    }
}

export type PantryItemRecord = Awaited<ReturnType<PantryRepository["findItem"]>>;
export type PantryItemListRecord = Awaited<ReturnType<PantryRepository["findItems"]>>[number];
