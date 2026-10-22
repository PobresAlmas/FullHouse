import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { CreateExpenseDto, ExpensePaymentStatus } from "./dto/create-expense.dto.js";
import { UpdateExpenseDto } from "./dto/update-expense.dto.js";

@Injectable()
export class ExpensesRepository {
    constructor(private readonly prisma: PrismaService) {}

    findAvailableHomes(userId: string) {
        return this.prisma.casa.findMany({
            where: {
                status: "ATIVA",
                excluido_em: null,
                participacao: { some: { usuario_id: userId, data_saida: null } },
            },
            select: { id: true, nome: true },
            orderBy: { nome: "asc" },
        });
    }

    findHomeForUser(homeId: string, userId: string) {
        return this.prisma.casa.findFirst({
            where: {
                id: homeId,
                status: "ATIVA",
                excluido_em: null,
                participacao: { some: { usuario_id: userId, data_saida: null } },
            },
            select: {
                id: true,
                participacao: {
                    where: { usuario_id: userId, data_saida: null },
                    select: { id: true },
                    take: 1,
                },
            },
        });
    }

    findAvailableSubgroups(userId: string) {
        return this.prisma.subgrupo.findMany({
            where: {
                excluido_em: null,
                casa: {
                    status: "ATIVA",
                    participacao: {
                        some: { usuario_id: userId, data_saida: null },
                    },
                },
                membro_subgrupo: {
                    some: {
                        saiu_em: null,
                        participacao: { usuario_id: userId, data_saida: null },
                    },
                },
            },
            select: {
                id: true,
                nome: true,
                casa: { select: { id: true, nome: true } },
                membro_subgrupo: {
                    where: { saiu_em: null, participacao: { data_saida: null } },
                    select: {
                        participacao: {
                            select: { usuario: { select: { nome: true, apelido: true } } },
                        },
                    },
                },
            },
            orderBy: [{ nome: "asc" }],
        });
    }

    findSubgroupForUser(subgroupId: string, userId: string) {
        return this.prisma.subgrupo.findFirst({
            where: {
                id: subgroupId,
                excluido_em: null,
                casa: {
                    participacao: {
                        some: { usuario_id: userId, data_saida: null },
                    },
                },
                membro_subgrupo: {
                    some: {
                        saiu_em: null,
                        participacao: { usuario_id: userId, data_saida: null },
                    },
                },
            },
            select: {
                id: true,
                casa_id: true,
                membro_subgrupo: {
                    where: {
                        saiu_em: null,
                        participacao: { usuario_id: userId, data_saida: null },
                    },
                    select: { participacao_id: true },
                    take: 1,
                },
            },
        });
    }

    create(data: CreateExpenseDto, casaId: string, paidByParticipationId: string) {
        const paid = data.paymentStatus === ExpensePaymentStatus.PAID;

        return this.prisma.despesa.create({
            data: {
                escopo: "CASA",
                casa_id: casaId,
                subgrupo_id: data.subgroupId ?? null,
                descricao: data.description.trim(),
                valor_total: new Prisma.Decimal(data.amount.replace(",", ".")),
                tipo: "VARIAVEL",
                estrategia_rateio: "IGUALITARIO",
                data_vencimento: new Date(`${data.date}T00:00:00.000Z`),
                status: paid ? "QUITADA" : "ABERTA",
                quitada_em: paid ? new Date() : null,
                pago_por_participacao_id: paid ? paidByParticipationId : null,
            },
            include: {
                subgrupo: { select: { id: true, nome: true } },
                casa: { select: { nome: true } },
                participacao: {
                    select: { usuario: { select: { nome: true, apelido: true } } },
                },
            },
        });
    }

    findEditableExpense(id: string, userId: string) {
        return this.prisma.despesa.findFirst({
            where: {
                id,
                status: { not: "CANCELADA" },
                casa: {
                    is: {
                        excluido_em: null,
                        participacao: { some: { usuario_id: userId, data_saida: null } },
                    },
                },
                OR: [
                    { subgrupo_id: null },
                    {
                        subgrupo: {
                            is: {
                                excluido_em: null,
                                membro_subgrupo: {
                                    some: {
                                        saiu_em: null,
                                        participacao: { usuario_id: userId, data_saida: null },
                                    },
                                },
                            },
                        },
                    },
                ],
            },
            select: {
                id: true,
                casa_id: true,
                subgrupo_id: true,
                status: true,
                quitada_em: true,
                pago_por_participacao_id: true,
            },
        });
    }

    update(
        id: string,
        data: UpdateExpenseDto,
        casaId: string,
        paidByParticipationId: string | null,
        paidAt: Date | null
    ) {
        const paid = data.paymentStatus === ExpensePaymentStatus.PAID;

        return this.prisma.despesa.update({
            where: { id },
            data: {
                casa_id: casaId,
                subgrupo_id: data.subgroupId ?? null,
                descricao: data.description.trim(),
                valor_total: new Prisma.Decimal(data.amount.replace(",", ".")),
                data_vencimento: new Date(`${data.date}T00:00:00.000Z`),
                status: paid ? "QUITADA" : "ABERTA",
                quitada_em: paidAt,
                pago_por_participacao_id: paidByParticipationId,
            },
            include: {
                subgrupo: { select: { id: true, nome: true } },
                casa: { select: { nome: true } },
                participacao: {
                    select: { usuario: { select: { nome: true, apelido: true } } },
                },
            },
        });
    }

    softDelete(id: string) {
        return this.prisma.despesa.update({
            where: { id },
            data: { status: "CANCELADA" },
        });
    }

    findForUser(userId: string, paymentStatus?: "PENDING" | "PAID") {
        return this.prisma.despesa.findMany({
            where: {
                casa: {
                    is: {
                        excluido_em: null,
                        participacao: { some: { usuario_id: userId, data_saida: null } },
                    },
                },
                OR: [
                    { subgrupo_id: null },
                    {
                        subgrupo: {
                            is: {
                                excluido_em: null,
                                membro_subgrupo: {
                                    some: {
                                        saiu_em: null,
                                        participacao: { usuario_id: userId, data_saida: null },
                                    },
                                },
                            },
                        },
                    },
                ],
                status: paymentStatus
                    ? paymentStatus === "PAID"
                        ? "QUITADA"
                        : "ABERTA"
                    : { not: "CANCELADA" },
            },
            select: {
                id: true,
                descricao: true,
                valor_total: true,
                data_vencimento: true,
                status: true,
                quitada_em: true,
                casa_id: true,
                casa: { select: { nome: true } },
                subgrupo: { select: { id: true, nome: true } },
                participacao: {
                    select: { usuario: { select: { nome: true, apelido: true } } },
                },
            },
            orderBy: [{ data_vencimento: "desc" }, { id: "desc" }],
        });
    }
}
