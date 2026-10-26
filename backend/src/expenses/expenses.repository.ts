import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { CreateExpenseDto, ExpensePaymentStatus } from "./dto/create-expense.dto.js";
import { UpdateExpenseDto } from "./dto/update-expense.dto.js";
import { CreateExpenseSubgroupDto } from "./dto/create-expense-subgroup.dto.js";

function splitAmountInCents(amount: string, participationIds: string[]) {
    const [whole, fraction = ""] = amount.replace(",", ".").split(".");
    const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
    const members = [...participationIds].sort();
    const count = BigInt(members.length);
    const base = cents / count;
    const remainder = Number(cents % count);

    return members.map((participationId, index) => {
        const memberCents = base + (index < remainder ? 1n : 0n);
        const value = `${memberCents / 100n}.${String(memberCents % 100n).padStart(2, "0")}`;
        return { participationId, value };
    });
}

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

    findActiveHomeMembers(homeId: string) {
        return this.prisma.participacao.findMany({
            where: { casa_id: homeId, data_saida: null },
            select: {
                id: true,
                usuario: { select: { nome: true, apelido: true } },
            },
            orderBy: [{ usuario: { nome: "asc" } }, { id: "asc" }],
        });
    }

    createSubgroup(data: CreateExpenseSubgroupDto, creatorParticipationId: string) {
        return this.prisma.$transaction(async (transaction) => {
            const home = await transaction.casa.findFirst({
                where: {
                    id: data.homeId,
                    status: "ATIVA",
                    excluido_em: null,
                    participacao: {
                        some: { id: creatorParticipationId, data_saida: null },
                    },
                },
                select: { id: true, nome: true },
            });
            if (!home) throw new NotFoundException("A residência não está disponível.");

            if (new Set(data.memberIds).size !== data.memberIds.length) {
                throw new BadRequestException("Não repita participantes no subgrupo.");
            }

            const members = await transaction.participacao.findMany({
                where: {
                    id: { in: data.memberIds },
                    casa_id: data.homeId,
                    data_saida: null,
                },
                select: {
                    id: true,
                    usuario: { select: { nome: true, apelido: true } },
                },
            });
            if (members.length !== data.memberIds.length) {
                throw new BadRequestException(
                    "Selecione somente moradores ativos desta residência."
                );
            }

            const subgroup = await transaction.subgrupo.create({
                data: {
                    casa_id: home.id,
                    nome: data.name.trim(),
                    criado_por_participacao_id: creatorParticipationId,
                },
                select: { id: true, nome: true },
            });
            await transaction.membro_subgrupo.createMany({
                data: data.memberIds.map((participationId) => ({
                    subgrupo_id: subgroup.id,
                    participacao_id: participationId,
                })),
            });

            return {
                id: subgroup.id,
                name: subgroup.nome,
                homeId: home.id,
                homeName: home.nome,
                members: members.map((member) => member.usuario.apelido || member.usuario.nome),
            };
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
                OR: [
                    {
                        membro_subgrupo: {
                            some: {
                                saiu_em: null,
                                participacao: { usuario_id: userId, data_saida: null },
                            },
                        },
                    },
                    { participacao: { usuario_id: userId, data_saida: null } },
                ],
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
                OR: [
                    {
                        membro_subgrupo: {
                            some: {
                                saiu_em: null,
                                participacao: { usuario_id: userId, data_saida: null },
                            },
                        },
                    },
                    { participacao: { usuario_id: userId, data_saida: null } },
                ],
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
        const subgroupId = data.subgroupId ?? null;
        const expenseData = {
            escopo: "CASA",
            casa_id: casaId,
            subgrupo_id: subgroupId,
            descricao: data.description.trim(),
            valor_total: new Prisma.Decimal(data.amount.replace(",", ".")),
            tipo: "VARIAVEL",
            estrategia_rateio: "IGUALITARIO",
            data_vencimento: new Date(`${data.date}T00:00:00.000Z`),
            status: paid ? "QUITADA" : "ABERTA",
            quitada_em: paid ? new Date() : null,
            pago_por_participacao_id: paid ? paidByParticipationId : null,
        } satisfies Prisma.despesaUncheckedCreateInput;
        const include = {
            subgrupo: { select: { id: true, nome: true } },
            casa: { select: { nome: true } },
            participacao: {
                select: { usuario: { select: { nome: true, apelido: true } } },
            },
        } as const;

        if (!subgroupId) return this.prisma.despesa.create({ data: expenseData, include });

        return this.prisma.$transaction(async (transaction) => {
            const subgroup = await transaction.subgrupo.findFirst({
                where: { id: subgroupId, casa_id: casaId, excluido_em: null },
                select: {
                    membro_subgrupo: {
                        where: { saiu_em: null, participacao: { data_saida: null } },
                        select: { participacao_id: true },
                    },
                },
            });
            if (!subgroup)
                throw new NotFoundException("O subgrupo não está disponível nesta residência.");
            const participationIds = subgroup.membro_subgrupo.map(
                (member) => member.participacao_id
            );
            if (participationIds.length === 0) {
                throw new BadRequestException("O subgrupo não possui participantes ativos.");
            }

            const expense = await transaction.despesa.create({ data: expenseData, include });
            const splits = splitAmountInCents(data.amount, participationIds);
            await transaction.rateio_despesa.createMany({
                data: splits.map(({ participationId, value }) => ({
                    despesa_id: expense.id,
                    participacao_id: participationId,
                    valor_devido: new Prisma.Decimal(value),
                })),
            });
            return expense;
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
                                OR: [
                                    {
                                        membro_subgrupo: {
                                            some: {
                                                saiu_em: null,
                                                participacao: {
                                                    usuario_id: userId,
                                                    data_saida: null,
                                                },
                                            },
                                        },
                                    },
                                    { participacao: { usuario_id: userId, data_saida: null } },
                                ],
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
        return this.prisma.$transaction(async (transaction) => {
            const existing = await transaction.despesa.findUnique({
                where: { id },
                select: {
                    subgrupo_id: true,
                    valor_total: true,
                    rateio_despesa: { select: { participacao_id: true, pago: true } },
                },
            });
            if (!existing) throw new NotFoundException("A despesa não está disponível.");

            const subgroupId = data.subgroupId ?? null;
            const amount = new Prisma.Decimal(data.amount.replace(",", "."));
            const associationChanged = existing.subgrupo_id !== subgroupId;
            const amountChanged = !new Prisma.Decimal(existing.valor_total).equals(amount);
            const reconcileSplits = associationChanged || amountChanged;
            if (reconcileSplits && existing.rateio_despesa.some((split) => split.pago)) {
                throw new BadRequestException(
                    "Não é possível alterar o subgrupo ou valor: já existem parcelas pagas."
                );
            }

            const updated = await transaction.despesa.update({
                where: { id },
                data: {
                    casa_id: casaId,
                    subgrupo_id: subgroupId,
                    descricao: data.description.trim(),
                    valor_total: amount,
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

            if (reconcileSplits) {
                await transaction.rateio_despesa.deleteMany({ where: { despesa_id: id } });
                if (subgroupId) {
                    const subgroup = await transaction.subgrupo.findFirst({
                        where: { id: subgroupId, casa_id: casaId, excluido_em: null },
                        select: {
                            membro_subgrupo: {
                                where: { saiu_em: null, participacao: { data_saida: null } },
                                select: { participacao_id: true },
                            },
                        },
                    });
                    if (!subgroup) {
                        throw new NotFoundException(
                            "O subgrupo não está disponível nesta residência."
                        );
                    }
                    const participationIds = subgroup.membro_subgrupo.map(
                        (member) => member.participacao_id
                    );
                    if (participationIds.length === 0) {
                        throw new BadRequestException(
                            "O subgrupo não possui participantes ativos."
                        );
                    }
                    const splits = splitAmountInCents(data.amount, participationIds);
                    await transaction.rateio_despesa.createMany({
                        data: splits.map(({ participationId, value }) => ({
                            despesa_id: id,
                            participacao_id: participationId,
                            valor_devido: new Prisma.Decimal(value),
                        })),
                    });
                }
            }
            return updated;
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
                                OR: [
                                    {
                                        membro_subgrupo: {
                                            some: {
                                                saiu_em: null,
                                                participacao: {
                                                    usuario_id: userId,
                                                    data_saida: null,
                                                },
                                            },
                                        },
                                    },
                                    { participacao: { usuario_id: userId, data_saida: null } },
                                ],
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
