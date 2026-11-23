import { Injectable } from "@nestjs/common";
import type {
    status_item_lista_compras_enum,
    unidade_item_enum,
} from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";

const itemInclude = {
    participacao_item_lista_compras_criado_por: {
        select: { usuario_id: true, usuario: { select: { nome: true, apelido: true } } },
    },
    participacao_item_lista_compras_comprado_por: {
        select: { usuario: { select: { nome: true, apelido: true } } },
    },
    usuario: { select: { nome: true, apelido: true } },
    usuario_item_lista_compras_comprado_por: { select: { nome: true, apelido: true } },
} as const;

function itemScope(residenceId: string | null, userId?: string) {
    return residenceId ? { casa_id: residenceId } : { casa_id: null, usuario_id: userId };
}

@Injectable()
export class ShoppingListRepository {
    constructor(private readonly prisma: PrismaService) {}

    findItems(residenceId: string | null, userId?: string) {
        return this.prisma.item_lista_compras.findMany({
            where: itemScope(residenceId, userId),
            include: itemInclude,
            orderBy: [{ status: "asc" }, { id: "asc" }],
        });
    }

    findItem(residenceId: string | null, itemId: string, userId?: string) {
        return this.prisma.item_lista_compras.findFirst({
            where: { id: itemId, ...itemScope(residenceId, userId) },
            include: itemInclude,
        });
    }

    createItem(data: {
        residenceId: string | null;
        memberId?: string;
        userId?: string;
        name: string;
        quantity: number | null;
        unit: unidade_item_enum | null;
        notes: string | null;
    }) {
        return this.prisma.item_lista_compras.create({
            data: {
                casa_id: data.residenceId,
                usuario_id: data.userId ?? null,
                criado_por_participacao_id: data.memberId ?? null,
                nome: data.name,
                quantidade: data.quantity,
                unidade: data.unit,
                observacao: data.notes,
            },
            include: itemInclude,
        });
    }

    async updateItem(data: {
        residenceId: string | null;
        userId?: string;
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
                    ...itemScope(data.residenceId, data.userId),
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
                    where: { id: data.itemId, ...itemScope(data.residenceId, data.userId) },
                });
                return { found: Boolean(current), item: null };
            }
            return {
                found: true,
                item: await transaction.item_lista_compras.findFirst({
                    where: { id: data.itemId, ...itemScope(data.residenceId, data.userId) },
                    include: itemInclude,
                }),
            };
        });
    }

    async updateStatus(data: {
        residenceId: string | null;
        userId?: string;
        itemId: string;
        version: number;
        memberId?: string;
        purchaserUserId?: string;
        status: status_item_lista_compras_enum;
    }) {
        return this.prisma.$transaction(async (transaction) => {
            const current = await transaction.item_lista_compras.findFirst({
                where: { id: data.itemId, ...itemScope(data.residenceId, data.userId) },
            });
            if (!current) return { found: false as const, item: null };
            if (current.status === data.status) {
                return {
                    found: true as const,
                    item: await transaction.item_lista_compras.findFirst({
                        where: { id: data.itemId, ...itemScope(data.residenceId, data.userId) },
                        include: itemInclude,
                    }),
                };
            }
            const result = await transaction.item_lista_compras.updateMany({
                where: {
                    id: data.itemId,
                    ...itemScope(data.residenceId, data.userId),
                    versao: data.version,
                },
                data: {
                    status: data.status,
                    comprado_em: data.status === "COMPRADO" ? new Date() : null,
                    comprado_por_participacao_id:
                        data.status === "COMPRADO" ? (data.memberId ?? null) : null,
                    comprado_por_usuario_id:
                        data.status === "COMPRADO" ? (data.purchaserUserId ?? null) : null,
                    versao: { increment: 1 },
                },
            });
            if (!result.count) {
                const latest = await transaction.item_lista_compras.findFirst({
                    where: { id: data.itemId, ...itemScope(data.residenceId, data.userId) },
                });
                return { found: Boolean(latest), item: null };
            }
            return {
                found: true as const,
                item: await transaction.item_lista_compras.findFirst({
                    where: { id: data.itemId, ...itemScope(data.residenceId, data.userId) },
                    include: itemInclude,
                }),
            };
        });
    }

    async deleteItem(residenceId: string | null, itemId: string, version: number, userId?: string) {
        const result = await this.prisma.item_lista_compras.deleteMany({
            where: { id: itemId, ...itemScope(residenceId, userId), versao: version },
        });
        return result.count > 0;
    }
}

export type ShoppingListItemRecord = NonNullable<
    Awaited<ReturnType<ShoppingListRepository["findItem"]>>
>;
