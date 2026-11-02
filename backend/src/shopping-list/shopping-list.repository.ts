import { Injectable } from "@nestjs/common";
import type {
    status_item_lista_compras_enum,
    unidade_item_enum,
} from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";

const itemInclude = {
    participacao_item_lista_compras_criado_por: {
        select: { usuario: { select: { nome: true, apelido: true } } },
    },
    participacao_item_lista_compras_comprado_por: {
        select: { usuario: { select: { nome: true, apelido: true } } },
    },
} as const;

@Injectable()
export class ShoppingListRepository {
    constructor(private readonly prisma: PrismaService) {}

    findItems(residenceId: string) {
        return this.prisma.item_lista_compras.findMany({
            where: { casa_id: residenceId },
            include: itemInclude,
            orderBy: [{ status: "asc" }, { id: "asc" }],
        });
    }

    findItem(residenceId: string, itemId: string) {
        return this.prisma.item_lista_compras.findFirst({
            where: { id: itemId, casa_id: residenceId },
            include: itemInclude,
        });
    }

    createItem(data: {
        residenceId: string;
        memberId: string;
        name: string;
        quantity: number | null;
        unit: unidade_item_enum | null;
        notes: string | null;
    }) {
        return this.prisma.item_lista_compras.create({
            data: {
                casa_id: data.residenceId,
                criado_por_participacao_id: data.memberId,
                nome: data.name,
                quantidade: data.quantity,
                unidade: data.unit,
                observacao: data.notes,
            },
            include: itemInclude,
        });
    }

    async updateItem(data: {
        residenceId: string;
        itemId: string;
        version: number;
        name?: string;
        quantity?: number | null;
        unit?: unidade_item_enum | null;
        notes?: string | null;
    }) {
        return this.prisma.$transaction(async (transaction) => {
            const result = await transaction.item_lista_compras.updateMany({
                where: {
                    id: data.itemId,
                    casa_id: data.residenceId,
                    versao: data.version,
                },
                data: {
                    ...(data.name !== undefined ? { nome: data.name } : {}),
                    ...(data.quantity !== undefined ? { quantidade: data.quantity } : {}),
                    ...(data.unit !== undefined ? { unidade: data.unit } : {}),
                    ...(data.notes !== undefined ? { observacao: data.notes } : {}),
                    versao: { increment: 1 },
                },
            });
            if (!result.count) {
                const current = await transaction.item_lista_compras.findFirst({
                    where: { id: data.itemId, casa_id: data.residenceId },
                });
                return { found: Boolean(current), item: null };
            }
            return {
                found: true,
                item: await transaction.item_lista_compras.findFirst({
                    where: { id: data.itemId, casa_id: data.residenceId },
                    include: itemInclude,
                }),
            };
        });
    }

    async updateStatus(data: {
        residenceId: string;
        itemId: string;
        version: number;
        memberId: string;
        status: status_item_lista_compras_enum;
    }) {
        return this.prisma.$transaction(async (transaction) => {
            const current = await transaction.item_lista_compras.findFirst({
                where: { id: data.itemId, casa_id: data.residenceId },
            });
            if (!current) return { found: false as const, item: null };
            if (current.status === data.status) {
                return {
                    found: true as const,
                    item: await transaction.item_lista_compras.findFirst({
                        where: { id: data.itemId, casa_id: data.residenceId },
                        include: itemInclude,
                    }),
                };
            }
            const result = await transaction.item_lista_compras.updateMany({
                where: {
                    id: data.itemId,
                    casa_id: data.residenceId,
                    versao: data.version,
                },
                data: {
                    status: data.status,
                    comprado_em: data.status === "COMPRADO" ? new Date() : null,
                    comprado_por_participacao_id: data.status === "COMPRADO" ? data.memberId : null,
                    versao: { increment: 1 },
                },
            });
            if (!result.count) {
                const latest = await transaction.item_lista_compras.findFirst({
                    where: { id: data.itemId, casa_id: data.residenceId },
                });
                return { found: Boolean(latest), item: null };
            }
            return {
                found: true as const,
                item: await transaction.item_lista_compras.findFirst({
                    where: { id: data.itemId, casa_id: data.residenceId },
                    include: itemInclude,
                }),
            };
        });
    }

    async deleteItem(residenceId: string, itemId: string, version: number) {
        const result = await this.prisma.item_lista_compras.deleteMany({
            where: { id: itemId, casa_id: residenceId, versao: version },
        });
        return result.count > 0;
    }
}

export type ShoppingListItemRecord = NonNullable<
    Awaited<ReturnType<ShoppingListRepository["findItem"]>>
>;
