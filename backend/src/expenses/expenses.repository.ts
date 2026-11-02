import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { Prisma } from "../generated/prisma/client.js";
import {
    CreateExpenseDto,
    ExpensePaymentStatus,
} from "./dto/create-expense.dto.js";
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

function resolveSplits(
    totalAmount: string,
    participationIds: string[],
    customAllocations?: { participationId: string; amount: string }[]
) {
    if (!customAllocations) return splitAmountInCents(totalAmount, participationIds);

    const expected = new Set(participationIds);
    const provided = new Set(customAllocations.map((allocation) => allocation.participationId));
    if (
        customAllocations.length !== participationIds.length ||
        provided.size !== customAllocations.length ||
        [...expected].some((id) => !provided.has(id))
    ) {
        throw new BadRequestException(
            "Informe exatamente uma divisão para cada participante ativo do subgrupo."
        );
    }

    const toCents = (value: string) => {
        const [whole, fraction = ""] = value.replace(",", ".").split(".");
        return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
    };
    const totalCents = toCents(totalAmount);
    const allocatedCents = customAllocations.reduce(
        (sum, allocation) => sum + toCents(allocation.amount),
        0n
    );
    if (allocatedCents !== totalCents) {
        throw new BadRequestException("A soma das partes deve ser igual ao valor total da despesa.");
    }
    return customAllocations.map(({ participationId, amount }) => {
        const cents = toCents(amount);
        return {
            participationId,
            value: `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`,
        };
    });
}

type PersonalExpenseView = {
    id: string;
    description: string;
    amount: string;
    totalAmount: string;
    date: string | null;
    homeId: string | null;
    homeName: string | null | undefined;
    subgroup: { id: string; nome: string } | null;
    sourceLabel: string;
    canEdit: boolean;
    scope: "HOME" | "PERSONAL";
    paidBy: string | null;
    paidAt: string | null;
    paymentStatus: "PAID" | "PENDING";
    proofs: { id: string; url: string; type: "IMAGEM" | "PDF" }[];
};

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
                memberIds: members.map((member) => member.id),
                memberDetails: members.map((member) => ({
                    id: member.id,
                    name: member.usuario.apelido || member.usuario.nome,
                })),
                canEdit: true,
            };
        });
    }

    async updateSubgroup(id: string, userId: string, data: CreateExpenseSubgroupDto) {
        return this.prisma.$transaction(async (transaction) => {
            const subgroup = await transaction.subgrupo.findFirst({
                where: {
                    id,
                    excluido_em: null,
                    casa: {
                        status: "ATIVA",
                        excluido_em: null,
                        participacao: { some: { usuario_id: userId, data_saida: null } },
                    },
                },
                select: {
                    id: true,
                    casa_id: true,
                    criado_por_participacao_id: true,
                    participacao: { select: { usuario_id: true } },
                },
            });
            if (!subgroup) throw new NotFoundException("O subgrupo não está disponível.");
            if (subgroup.participacao.usuario_id !== userId) {
                throw new ForbiddenException("Somente quem criou o subgrupo pode editá-lo.");
            }
            if (subgroup.casa_id !== data.homeId) {
                throw new BadRequestException("O subgrupo não pode ser transferido para outra residência.");
            }
            if (new Set(data.memberIds).size !== data.memberIds.length) {
                throw new BadRequestException("Não repita participantes no subgrupo.");
            }
            const members = await transaction.participacao.findMany({
                where: {
                    id: { in: data.memberIds },
                    casa_id: subgroup.casa_id,
                    data_saida: null,
                },
                select: { id: true, usuario: { select: { nome: true, apelido: true } } },
            });
            if (members.length !== data.memberIds.length) {
                throw new BadRequestException("Selecione somente moradores ativos desta residência.");
            }

            await transaction.subgrupo.update({
                where: { id },
                data: { nome: data.name.trim() },
            });
            const now = new Date();
            await transaction.membro_subgrupo.updateMany({
                where: {
                    subgrupo_id: id,
                    saiu_em: null,
                    participacao_id: { notIn: data.memberIds },
                },
                data: { saiu_em: now },
            });
            for (const memberId of data.memberIds) {
                await transaction.membro_subgrupo.upsert({
                    where: {
                        subgrupo_id_participacao_id: {
                            subgrupo_id: id,
                            participacao_id: memberId,
                        },
                    },
                    create: { subgrupo_id: id, participacao_id: memberId },
                    update: { saiu_em: null, entrou_em: now },
                });
            }

            const home = await transaction.casa.findUniqueOrThrow({
                where: { id: subgroup.casa_id },
                select: { nome: true },
            });
            return {
                id,
                name: data.name.trim(),
                homeId: subgroup.casa_id,
                homeName: home.nome,
                members: members.map((member) => member.usuario.apelido || member.usuario.nome),
                memberIds: members.map((member) => member.id),
                memberDetails: members.map((member) => ({
                    id: member.id,
                    name: member.usuario.apelido || member.usuario.nome,
                })),
                canEdit: true,
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
                        participacao_id: true,
                        participacao: {
                            select: { usuario: { select: { nome: true, apelido: true } } },
                        },
                    },
                },
            },
            orderBy: [{ nome: "asc" }],
        });
    }

    findAllSubgroupsForUser(userId: string) {
        return this.prisma.subgrupo.findMany({
            where: {
                excluido_em: null,
                casa: {
                    status: "ATIVA",
                    excluido_em: null,
                    participacao: { some: { usuario_id: userId, data_saida: null } },
                },
            },
            select: {
                id: true,
                nome: true,
                casa: { select: { id: true, nome: true } },
                participacao: { select: { usuario_id: true } },
                membro_subgrupo: {
                    where: { saiu_em: null, participacao: { data_saida: null } },
                    select: {
                        participacao_id: true,
                        participacao: {
                            select: { usuario: { select: { nome: true, apelido: true } } },
                        },
                    },
                    orderBy: [{ entrou_em: "asc" }],
                },
            },
            orderBy: [{ casa: { nome: "asc" } }, { nome: "asc" }],
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
            estrategia_rateio: data.allocations ? "PERSONALIZADO" : "IGUALITARIO",
            data_vencimento: new Date(`${data.date}T00:00:00.000Z`),
            status: paid ? "QUITADA" : "ABERTA",
            quitada_em: paid
                ? data.paymentDate
                    ? new Date(`${data.paymentDate}T00:00:00.000Z`)
                    : new Date()
                : null,
            pago_por_participacao_id: paid ? paidByParticipationId : null,
        } satisfies Prisma.despesaUncheckedCreateInput;
        const include = {
            subgrupo: { select: { id: true, nome: true } },
            casa: { select: { nome: true } },
            participacao: {
                select: { usuario: { select: { nome: true, apelido: true } } },
            },
            rateio_despesa: {
                select: {
                    participacao_id: true,
                    valor_devido: true,
                    participacao: { select: { usuario: { select: { nome: true, apelido: true } } } },
                },
            },
            comprovante_pagamento: {
                select: { id: true, arquivo_url: true, tipo_arquivo: true },
            },
        } as const;

        return this.prisma.$transaction(async (transaction) => {
            const participationIds = subgroupId
                ? (
                      await transaction.subgrupo.findFirst({
                          where: { id: subgroupId, casa_id: casaId, excluido_em: null },
                          select: {
                              membro_subgrupo: {
                                  where: { saiu_em: null, participacao: { data_saida: null } },
                                  select: { participacao_id: true },
                              },
                          },
                      })
                  )?.membro_subgrupo.map((member) => member.participacao_id)
                : (
                      await transaction.participacao.findMany({
                          where: { casa_id: casaId, data_saida: null },
                          select: { id: true },
                          orderBy: { id: "asc" },
                      })
                  ).map((member) => member.id);
            if (!participationIds)
                throw new NotFoundException("O subgrupo não está disponível nesta residência.");
            if (participationIds.length === 0) {
                throw new BadRequestException("Não há moradores ativos para dividir a despesa.");
            }

            if (data.allocations && !subgroupId) {
                throw new BadRequestException("A divisão personalizada só está disponível em subgrupos.");
            }
            const expense = await transaction.despesa.create({ data: expenseData });
            const splits = resolveSplits(data.amount, participationIds, data.allocations);
            await transaction.rateio_despesa.createMany({
                data: splits.map(({ participationId, value }) => ({
                    despesa_id: expense.id,
                    participacao_id: participationId,
                    valor_devido: new Prisma.Decimal(value),
                })),
            });
            return transaction.despesa.findUniqueOrThrow({ where: { id: expense.id }, include });
        });
    }

    createPersonal(data: CreateExpenseDto, userId: string) {
        const paid = data.paymentStatus === ExpensePaymentStatus.PAID;
        return this.prisma.despesa.create({
            data: {
                escopo: "INDIVIDUAL",
                casa_id: null,
                usuario_id: userId,
                subgrupo_id: null,
                descricao: data.description.trim(),
                valor_total: new Prisma.Decimal(data.amount.replace(",", ".")),
                tipo: "VARIAVEL",
                estrategia_rateio: "IGUALITARIO",
                data_vencimento: new Date(`${data.date}T00:00:00.000Z`),
                status: paid ? "QUITADA" : "ABERTA",
                quitada_em: paid
                    ? data.paymentDate
                        ? new Date(`${data.paymentDate}T00:00:00.000Z`)
                        : new Date()
                    : null,
                pago_por_participacao_id: null,
            },
            include: {
                subgrupo: { select: { id: true, nome: true } },
                casa: { select: { nome: true } },
                participacao: {
                    select: { usuario: { select: { nome: true, apelido: true } } },
                },
                comprovante_pagamento: {
                    select: { id: true, arquivo_url: true, tipo_arquivo: true },
                },
            },
        });
    }

    updatePersonal(id: string, data: UpdateExpenseDto, paidAt: Date | null) {
        const paid = data.paymentStatus === ExpensePaymentStatus.PAID;
        return this.prisma.despesa.update({
            where: { id },
            data: {
                descricao: data.description.trim(),
                valor_total: new Prisma.Decimal(data.amount.replace(",", ".")),
                data_vencimento: new Date(`${data.date}T00:00:00.000Z`),
                status: paid ? "QUITADA" : "ABERTA",
                quitada_em: paid ? paidAt : null,
                pago_por_participacao_id: null,
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
                OR: [
                    {
                        escopo: "INDIVIDUAL",
                        usuario_id: userId,
                    },
                    {
                        escopo: "CASA",
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
                                            {
                                                participacao: {
                                                    usuario_id: userId,
                                                    data_saida: null,
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            select: {
                id: true,
                escopo: true,
                casa_id: true,
                usuario_id: true,
                subgrupo_id: true,
                status: true,
                descricao: true,
                quitada_em: true,
                pago_por_participacao_id: true,
            },
        });
    }

    setPersonalPaymentStatus(id: string, userId: string, paid: boolean) {
        return this.prisma.$transaction(async (transaction) => {
            const expense = await transaction.despesa.findFirst({
                where: {
                    id,
                    status: { not: "CANCELADA" },
                    OR: [
                        { escopo: "INDIVIDUAL", usuario_id: userId },
                        {
                            escopo: "CASA",
                            casa: {
                                is: {
                                    excluido_em: null,
                                    participacao: {
                                        some: { usuario_id: userId, data_saida: null },
                                    },
                                },
                            },
                        },
                    ],
                },
                select: {
                    id: true,
                    escopo: true,
                    usuario_id: true,
                    casa_id: true,
                    subgrupo_id: true,
                    valor_total: true,
                },
            });
            if (!expense) throw new NotFoundException("A despesa não está disponível.");

            if (expense.escopo === "INDIVIDUAL") {
                const updated = await transaction.despesa.update({
                    where: { id },
                    data: {
                        status: paid ? "QUITADA" : "ABERTA",
                        quitada_em: paid ? new Date() : null,
                    },
                    select: { status: true, quitada_em: true },
                });
                return {
                    id,
                    paymentStatus: updated.status === "QUITADA" ? "PAID" : "PENDING",
                    paidAt: updated.quitada_em?.toISOString() ?? null,
                };
            }

            if (!expense.casa_id) throw new NotFoundException("A despesa não está disponível.");
            const activeMembership = await transaction.participacao.findFirst({
                where: {
                    casa_id: expense.casa_id,
                    usuario_id: userId,
                    data_saida: null,
                },
                select: { id: true },
            });
            if (!activeMembership) throw new NotFoundException("A despesa não está disponível.");

            const participantIds = expense.subgrupo_id
                ? (
                      await transaction.subgrupo.findFirst({
                          where: { id: expense.subgrupo_id, casa_id: expense.casa_id },
                          select: {
                              membro_subgrupo: {
                                  where: { saiu_em: null, participacao: { data_saida: null } },
                                  select: { participacao_id: true },
                              },
                          },
                      })
                  )?.membro_subgrupo.map((member) => member.participacao_id) ?? []
                : (
                      await transaction.participacao.findMany({
                          where: { casa_id: expense.casa_id, data_saida: null },
                          select: { id: true },
                          orderBy: { id: "asc" },
                      })
                  ).map((member) => member.id);
            if (!participantIds.includes(activeMembership.id)) {
                throw new NotFoundException("A despesa não está disponível.");
            }

            const allocations = splitAmountInCents(
                expense.valor_total.toString(),
                participantIds
            );
            await transaction.rateio_despesa.createMany({
                data: allocations.map(({ participationId, value }) => ({
                    despesa_id: id,
                    participacao_id: participationId,
                    valor_devido: new Prisma.Decimal(value),
                })),
                skipDuplicates: true,
            });
            const allocation = await transaction.rateio_despesa.findUnique({
                where: {
                    despesa_id_participacao_id: {
                        despesa_id: id,
                        participacao_id: activeMembership.id,
                    },
                },
                select: { pago_em: true },
            });
            const paidAt = paid ? (allocation?.pago_em ?? new Date()) : null;
            const updated = await transaction.rateio_despesa.update({
                where: {
                    despesa_id_participacao_id: {
                        despesa_id: id,
                        participacao_id: activeMembership.id,
                    },
                },
                data: { pago: paid, pago_em: paidAt },
                select: { pago: true, pago_em: true },
            });
            return {
                id,
                paymentStatus: updated.pago ? "PAID" : "PENDING",
                paidAt: updated.pago_em?.toISOString() ?? null,
            };
        });
    }

    async setExpenseReminder(
        expenseId: string,
        userId: string,
        description: string,
        remindAt: string,
        message: string | undefined,
        enabled: boolean
    ) {
        return this.prisma.$transaction(async (transaction) => {
            await transaction.lembrete.deleteMany({
                where: { despesa_id: expenseId, usuario_id: userId },
            });
            if (!enabled) return null;

            const title = message?.trim() || description;
            const reminder = await transaction.lembrete.create({
                data: {
                    usuario_id: userId,
                    despesa_id: expenseId,
                    titulo: title,
                    lembrar_em: new Date(remindAt),
                },
                select: { id: true, titulo: true, lembrar_em: true },
            });
            return {
                id: reminder.id,
                message: reminder.titulo === description ? "" : reminder.titulo,
                remindAt: reminder.lembrar_em.toISOString(),
                enabled: true,
            };
        });
    }

    async deleteExpenseReminder(expenseId: string, userId: string) {
        await this.prisma.lembrete.deleteMany({
            where: { despesa_id: expenseId, usuario_id: userId },
        });
        return { deleted: true };
    }

    createExpenseProof(
        expenseId: string,
        userId: string,
        participationId: string | null,
        url: string,
        type: "IMAGEM" | "PDF"
    ) {
        return this.prisma.comprovante_pagamento.create({
            data: {
                despesa_id: expenseId,
                enviado_por_usuario_id: userId,
                enviado_por_participacao_id: participationId,
                arquivo_url: url,
                tipo_arquivo: type,
            },
            select: { id: true, arquivo_url: true, tipo_arquivo: true },
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
            const reconcileSplits =
                associationChanged || amountChanged || data.allocations !== undefined;
            if (reconcileSplits && existing.rateio_despesa.some((split) => split.pago)) {
                throw new BadRequestException(
                    "Não é possível alterar o valor ou a divisão: já existem parcelas pagas."
                );
            }

            if (data.allocations && !subgroupId) {
                throw new BadRequestException("A divisão personalizada só está disponível em subgrupos.");
            }

            await transaction.despesa.update({
                where: { id },
                data: {
                    casa_id: casaId,
                    subgrupo_id: subgroupId,
                    descricao: data.description.trim(),
                    valor_total: amount,
                    estrategia_rateio: data.allocations ? "PERSONALIZADO" : "IGUALITARIO",
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
                    rateio_despesa: {
                        select: {
                            participacao_id: true,
                            valor_devido: true,
                            participacao: {
                                select: { usuario: { select: { nome: true, apelido: true } } },
                            },
                        },
                    },
                    comprovante_pagamento: {
                        select: { id: true, arquivo_url: true, tipo_arquivo: true },
                    },
                },
            });

            if (reconcileSplits) {
                await transaction.rateio_despesa.deleteMany({ where: { despesa_id: id } });
                const participationIds = subgroupId
                    ? (
                          await transaction.subgrupo.findFirst({
                              where: { id: subgroupId, casa_id: casaId, excluido_em: null },
                              select: {
                                  membro_subgrupo: {
                                      where: {
                                          saiu_em: null,
                                          participacao: { data_saida: null },
                                      },
                                      select: { participacao_id: true },
                                  },
                              },
                          })
                      )?.membro_subgrupo.map((member) => member.participacao_id)
                    : (
                          await transaction.participacao.findMany({
                              where: { casa_id: casaId, data_saida: null },
                              select: { id: true },
                              orderBy: { id: "asc" },
                          })
                      ).map((member) => member.id);
                if (!participationIds) {
                    throw new NotFoundException("O subgrupo não está disponível nesta residência.");
                }
                if (participationIds.length === 0) {
                    throw new BadRequestException("Não há moradores ativos para dividir a despesa.");
                }
                const splits = resolveSplits(data.amount, participationIds, data.allocations);
                await transaction.rateio_despesa.createMany({
                    data: splits.map(({ participationId, value }) => ({
                        despesa_id: id,
                        participacao_id: participationId,
                        valor_devido: new Prisma.Decimal(value),
                    })),
                });
            }
            return transaction.despesa.findUniqueOrThrow({
                where: { id },
                include: {
                    subgrupo: { select: { id: true, nome: true } },
                    casa: { select: { nome: true } },
                    participacao: {
                        select: { usuario: { select: { nome: true, apelido: true } } },
                    },
                    rateio_despesa: {
                        select: {
                            participacao_id: true,
                            valor_devido: true,
                            participacao: {
                                select: { usuario: { select: { nome: true, apelido: true } } },
                            },
                        },
                    },
                    comprovante_pagamento: {
                        select: { id: true, arquivo_url: true, tipo_arquivo: true },
                    },
                },
            });
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
                estrategia_rateio: true,
                quitada_em: true,
                casa_id: true,
                casa: { select: { nome: true } },
                subgrupo: { select: { id: true, nome: true } },
                participacao: {
                    select: { usuario: { select: { nome: true, apelido: true } } },
                },
                rateio_despesa: {
                    select: {
                        participacao_id: true,
                        valor_devido: true,
                        participacao: {
                            select: { usuario: { select: { nome: true, apelido: true } } },
                        },
                    },
                },
                lembrete: {
                    where: { usuario_id: userId },
                    orderBy: { lembrar_em: "asc" },
                    take: 1,
                    select: { id: true, titulo: true, lembrar_em: true },
                },
                comprovante_pagamento: {
                    select: { id: true, arquivo_url: true, tipo_arquivo: true },
                    orderBy: { id: "asc" },
                },
            },
            orderBy: [{ data_vencimento: "desc" }, { id: "desc" }],
        });
    }

    async findPersonalForUser(userId: string) {
        const expenses = await this.prisma.despesa.findMany({
            where: {
                status: { not: "CANCELADA" },
                OR: [
                    { escopo: "INDIVIDUAL", usuario_id: userId },
                    {
                        escopo: "CASA",
                        casa: {
                            is: {
                                excluido_em: null,
                                participacao: { some: { usuario_id: userId, data_saida: null } },
                            },
                        },
                    },
                ],
            },
            select: {
                id: true,
                escopo: true,
                usuario_id: true,
                casa_id: true,
                descricao: true,
                valor_total: true,
                data_vencimento: true,
                status: true,
                estrategia_rateio: true,
                quitada_em: true,
                lembrete: {
                    where: { usuario_id: userId },
                    orderBy: { lembrar_em: "asc" },
                    take: 1,
                    select: { id: true, titulo: true, lembrar_em: true },
                },
                comprovante_pagamento: {
                    select: { id: true, arquivo_url: true, tipo_arquivo: true },
                    orderBy: { id: "asc" },
                },
                casa: {
                    select: {
                        nome: true,
                        participacao: {
                            where: { data_saida: null },
                            select: { id: true, usuario_id: true },
                        },
                    },
                },
                subgrupo: {
                    select: {
                        id: true,
                        nome: true,
                        membro_subgrupo: {
                            where: { saiu_em: null, participacao: { data_saida: null } },
                            select: {
                                participacao_id: true,
                                participacao: { select: { usuario_id: true } },
                            },
                        },
                    },
                },
                rateio_despesa: {
                    select: {
                        id: true,
                        participacao_id: true,
                        valor_devido: true,
                        pago: true,
                        pago_em: true,
                        participacao: { select: { usuario_id: true } },
                    },
                },
            },
            orderBy: [{ data_vencimento: "desc" }, { id: "desc" }],
        });

        return expenses.flatMap<PersonalExpenseView>((expense) => {
            if (expense.escopo === "INDIVIDUAL") {
                return [{
                    id: expense.id,
                    description: expense.descricao,
                    amount: expense.valor_total.toFixed(2),
                    totalAmount: expense.valor_total.toFixed(2),
                    date: expense.data_vencimento?.toISOString().slice(0, 10) ?? null,
                    homeId: null,
                    homeName: null,
                    subgroup: null,
                    sourceLabel: "Individual",
                    canEdit: true,
                    scope: "PERSONAL",
                    paidBy: null,
                    paidAt: expense.quitada_em?.toISOString() ?? null,
                    paymentStatus: expense.status === "QUITADA" ? "PAID" : "PENDING",
                    proofs: expense.comprovante_pagamento.map((proof) => ({
                        id: proof.id,
                        url: proof.arquivo_url,
                        type: proof.tipo_arquivo,
                    })),
                    reminder: expense.lembrete[0]
                        ? {
                              id: expense.lembrete[0].id,
                              message: expense.lembrete[0].titulo === expense.descricao
                                  ? ""
                                  : expense.lembrete[0].titulo,
                              remindAt: expense.lembrete[0].lembrar_em.toISOString(),
                          }
                        : null,
                }];
            }

            const participationIds = expense.subgrupo
                ? expense.subgrupo.membro_subgrupo.map((member) => member.participacao_id)
                : (expense.casa?.participacao.map((member) => member.id) ?? []);
            const userParticipationId = expense.subgrupo
                ? expense.subgrupo.membro_subgrupo.find(
                      (member) => member.participacao.usuario_id === userId
                  )?.participacao_id
                : expense.casa?.participacao.find((member) => member.usuario_id === userId)?.id;
            if (!userParticipationId) return [];

            const currentParticipation = expense.rateio_despesa.find(
                (split) => split.participacao_id === userParticipationId
            );
            // Legacy home expenses without allocations are displayed using an equal split.
            const amount = currentParticipation
                ? currentParticipation.valor_devido.toFixed(2)
                : splitAmountInCents(expense.valor_total.toFixed(2), participationIds).find(
                      (split) => split.participationId === userParticipationId
                  )?.value;
            if (!amount) return [];

            return [{
                id: expense.id,
                description: expense.descricao,
                amount,
                totalAmount: expense.valor_total.toFixed(2),
                date: expense.data_vencimento?.toISOString().slice(0, 10) ?? null,
                homeId: expense.casa_id,
                homeName: expense.casa?.nome,
                subgroup: expense.subgrupo ? { id: expense.subgrupo.id, nome: expense.subgrupo.nome } : null,
                sourceLabel: expense.subgrupo?.nome ?? "Casa",
                canEdit: false,
                scope: "HOME",
                paidBy: null,
                paidAt: currentParticipation?.pago_em?.toISOString() ?? null,
                paymentStatus: currentParticipation?.pago ? "PAID" : "PENDING",
                proofs: expense.comprovante_pagamento.map((proof) => ({
                    id: proof.id,
                    url: proof.arquivo_url,
                    type: proof.tipo_arquivo,
                })),
                reminder: expense.lembrete[0]
                    ? {
                          id: expense.lembrete[0].id,
                          message: expense.lembrete[0].titulo === expense.descricao
                              ? ""
                              : expense.lembrete[0].titulo,
                          remindAt: expense.lembrete[0].lembrar_em.toISOString(),
                      }
                    : null,
            }];
        });
    }
}
