import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ExpensesRepository } from "./expenses.repository.js";
import {
    CreateExpenseDto,
    ExpensePaymentStatus,
    ExpenseScope,
} from "./dto/create-expense.dto.js";
import { UpdateExpenseDto } from "./dto/update-expense.dto.js";
import { ResidenceAccessService } from "../residences/residence-access.service.js";
import { CreateExpenseSubgroupDto } from "./dto/create-expense-subgroup.dto.js";
import { UpsertExpenseReminderDto } from "./dto/upsert-expense-reminder.dto.js";
import { StorageService } from "../storage/storage.service.js";

@Injectable()
export class ExpensesService {
    constructor(
        private readonly repository: ExpensesRepository,
        private readonly residenceAccess: ResidenceAccessService,
        private readonly storage: StorageService
    ) {}

    async findHomeMembers(homeId: string, userId: string) {
        await this.residenceAccess.requireMembership(homeId, userId);
        return (await this.repository.findActiveHomeMembers(homeId)).map((member) => ({
            id: member.id,
            name: member.usuario.apelido || member.usuario.nome,
        }));
    }

    async createSubgroup(data: CreateExpenseSubgroupDto, userId: string) {
        if (data.memberIds.length === 0) {
            throw new BadRequestException("Selecione pelo menos um participante.");
        }
        if (new Set(data.memberIds).size !== data.memberIds.length) {
            throw new BadRequestException("Não repita participantes no subgrupo.");
        }

        const membership = await this.residenceAccess.requireMembership(data.homeId, userId);
        return this.repository.createSubgroup(data, membership.memberId);
    }

    async findAvailableHomes(userId: string) {
        return (await this.repository.findAvailableHomes(userId)).map((home) => ({
            id: home.id,
            name: home.nome,
        }));
    }

    async findAvailableSubgroups(userId: string) {
        const groups = await this.repository.findAvailableSubgroups(userId);

        return groups.map((group) => ({
            id: group.id,
            name: group.nome,
            homeId: group.casa.id,
            homeName: group.casa.nome,
            members: group.membro_subgrupo.map(
                ({ participacao }) => participacao.usuario.apelido || participacao.usuario.nome
            ),
            memberIds: group.membro_subgrupo.map((member) => member.participacao_id),
            memberDetails: group.membro_subgrupo.map(({ participacao_id, participacao }) => ({
                id: participacao_id,
                name: participacao.usuario.apelido || participacao.usuario.nome,
            })),
        }));
    }

    async findAllSubgroups(userId: string) {
        const groups = await this.repository.findAllSubgroupsForUser(userId);
        return groups.map((group) => ({
            id: group.id,
            name: group.nome,
            homeId: group.casa.id,
            homeName: group.casa.nome,
            members: group.membro_subgrupo.map(
                ({ participacao }) => participacao.usuario.apelido || participacao.usuario.nome
            ),
            memberIds: group.membro_subgrupo.map((member) => member.participacao_id),
            memberDetails: group.membro_subgrupo.map(({ participacao_id, participacao }) => ({
                id: participacao_id,
                name: participacao.usuario.apelido || participacao.usuario.nome,
            })),
            canEdit: group.participacao.usuario_id === userId,
        }));
    }

    async updateSubgroup(id: string, data: CreateExpenseSubgroupDto, userId: string) {
        if (data.memberIds.length === 0) {
            throw new BadRequestException("Selecione pelo menos um participante.");
        }
        if (new Set(data.memberIds).size !== data.memberIds.length) {
            throw new BadRequestException("Não repita participantes no subgrupo.");
        }
        return this.repository.updateSubgroup(id, userId, data);
    }

    async create(data: CreateExpenseDto, userId: string) {
        if (data.paymentDate && data.paymentStatus !== ExpensePaymentStatus.PAID) {
            throw new BadRequestException("A data de pagamento só pode ser informada para despesas pagas.");
        }
        if (data.scope === ExpenseScope.PERSONAL) {
            if (data.subgroupId || data.allocations) {
                throw new BadRequestException("Despesas pessoais não podem ser vinculadas a subgrupos.");
            }
            return this.mapExpense(await this.repository.createPersonal(data, userId));
        }

        if (data.allocations && !data.subgroupId) {
            throw new BadRequestException("A divisão personalizada só está disponível em subgrupos.");
        }

        const subgroup = data.subgroupId
            ? await this.repository.findSubgroupForUser(data.subgroupId, userId)
            : null;
        if (data.subgroupId && !subgroup) {
            throw new NotFoundException("O subgrupo selecionado não está disponível.");
        }

        if (subgroup && data.homeId && data.homeId !== subgroup.casa_id) {
            throw new NotFoundException("O subgrupo selecionado não está disponível.");
        }

        let homeId = subgroup?.casa_id ?? data.homeId;
        if (!homeId && !subgroup) {
            const homes = await this.repository.findAvailableHomes(userId);
            if (homes.length === 1) homeId = homes[0].id;
        }
        if (!homeId) {
            throw new BadRequestException("Selecione uma casa para registrar a despesa.");
        }

        const home = await this.repository.findHomeForUser(homeId, userId);
        if (!home)
            throw new NotFoundException(
                "Não foi encontrada uma casa ativa para registrar a despesa."
            );

        const expense = await this.repository.create(
            data,
            home.id,
            subgroup?.membro_subgrupo[0]?.participacao_id ?? home.participacao[0].id
        );

        return this.mapExpense(expense);
    }

    async findAll(
        userId: string,
        paymentStatus?: "PENDING" | "PAID",
        scope: ExpenseScope = ExpenseScope.HOME
    ) {
        if (scope === ExpenseScope.PERSONAL) {
            return this.repository.findPersonalForUser(userId);
        }
        const expenses = await this.repository.findForUser(userId, paymentStatus);

        return expenses.map((expense) => this.mapExpense(expense));
    }

    async update(id: string, data: UpdateExpenseDto, userId: string) {
        const existing = await this.repository.findEditableExpense(id, userId);
        if (!existing) {
            throw new NotFoundException("A despesa não está disponível.");
        }

        if (data.paymentDate && data.paymentStatus !== ExpensePaymentStatus.PAID) {
            throw new BadRequestException("A data de pagamento só pode ser informada para despesas pagas.");
        }

        if (existing.escopo === "INDIVIDUAL") {
            if (data.scope === ExpenseScope.HOME || data.subgroupId || data.homeId || data.allocations) {
                throw new BadRequestException("Despesas pessoais não podem ser movidas para a casa.");
            }
            const paidAt = data.paymentStatus !== ExpensePaymentStatus.PAID
                ? null
                : data.paymentDate
                  ? new Date(`${data.paymentDate}T00:00:00.000Z`)
                  : existing.quitada_em ?? new Date();
            return this.mapExpense(await this.repository.updatePersonal(id, data, paidAt));
        }

        if (data.allocations && !data.subgroupId) {
            throw new BadRequestException("A divisão personalizada só está disponível em subgrupos.");
        }

        const subgroup = data.subgroupId
            ? await this.repository.findSubgroupForUser(data.subgroupId, userId)
            : null;
        if (data.subgroupId && !subgroup) {
            throw new NotFoundException("O subgrupo selecionado não está disponível.");
        }

        const homeId = data.homeId ?? subgroup?.casa_id ?? existing.casa_id;
        const home = homeId ? await this.repository.findHomeForUser(homeId, userId) : null;
        if (!home) throw new NotFoundException("A casa da despesa não está mais disponível.");

        if (subgroup && subgroup.casa_id !== home.id) {
            throw new NotFoundException("O subgrupo selecionado não está disponível.");
        }

        const paid = data.paymentStatus === ExpensePaymentStatus.PAID;
        const samePaidSubgroup = existing.subgrupo_id === (data.subgroupId ?? null);
        const paidByParticipationId = !paid
            ? null
            : existing.status === "QUITADA" && samePaidSubgroup
              ? (existing.pago_por_participacao_id ??
                subgroup?.membro_subgrupo[0]?.participacao_id ??
                home.participacao[0].id)
              : (subgroup?.membro_subgrupo[0]?.participacao_id ?? home.participacao[0].id);
        const paidAt = !paid
            ? null
            : data.paymentDate
              ? new Date(`${data.paymentDate}T00:00:00.000Z`)
              : existing.status === "QUITADA"
              ? (existing.quitada_em ?? new Date())
              : new Date();

        const updated = await this.repository.update(
            id,
            data,
            home.id,
            paidByParticipationId,
            paidAt
        );

        return this.mapExpense(updated);
    }

    async remove(id: string, userId: string) {
        const existing = await this.repository.findEditableExpense(id, userId);
        if (!existing) {
            throw new NotFoundException("A despesa não está disponível.");
        }

        await this.repository.softDelete(id);
        return { id, deleted: true };
    }

    setPersonalPaymentStatus(id: string, userId: string, paid: boolean) {
        return this.repository.setPersonalPaymentStatus(id, userId, paid);
    }

    async setExpenseReminder(id: string, userId: string, data: UpsertExpenseReminderDto) {
        const expense = await this.repository.findEditableExpense(id, userId);
        if (!expense) throw new NotFoundException("A despesa não está disponível.");
        return this.repository.setExpenseReminder(
            id,
            userId,
            expense.descricao,
            data.remindAt,
            data.message,
            data.enabled
        );
    }

    async deleteExpenseReminder(id: string, userId: string) {
        const expense = await this.repository.findEditableExpense(id, userId);
        if (!expense) throw new NotFoundException("A despesa não está disponível.");
        return this.repository.deleteExpenseReminder(id, userId);
    }

    async addExpenseProof(id: string, userId: string, file: Express.Multer.File) {
        const expense = await this.repository.findEditableExpense(id, userId);
        if (!expense) throw new NotFoundException("A despesa não está disponível.");
        if (!file || file.size > 10 * 1024 * 1024) {
            throw new BadRequestException("O comprovante deve ter no máximo 10 MB.");
        }
        const supportedTypes = new Set([
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
        ]);
        if (!supportedTypes.has(file.mimetype)) {
            throw new BadRequestException("Envie um arquivo PDF, JPG, PNG ou WEBP.");
        }

        const participation = expense.casa_id
            ? await this.repository.findHomeForUser(expense.casa_id, userId)
            : null;
        const url = await this.storage.upload(file, "expense-proofs");
        const proof = await this.repository.createExpenseProof(
            id,
            userId,
            participation?.participacao[0]?.id ?? null,
            url,
            file.mimetype === "application/pdf" ? "PDF" : "IMAGEM"
        );
        return { id: proof.id, url: proof.arquivo_url, type: proof.tipo_arquivo };
    }

    private mapExpense(expense: {
        id: string;
        descricao: string;
        valor_total: { toFixed: (decimalPlaces: number) => string };
        data_vencimento: Date | null;
        status: string;
        estrategia_rateio: "IGUALITARIO" | "PERSONALIZADO" | "PERCENTUAL";
        subgrupo: { id: string; nome: string } | null;
        casa_id?: string | null;
        casa?: { nome: string } | null;
        participacao: {
            usuario: { nome: string; apelido: string | null };
        } | null;
        quitada_em: Date | null;
        lembrete?: { id: string; titulo: string; lembrar_em: Date }[];
        comprovante_pagamento?: {
            id: string;
            arquivo_url: string;
            tipo_arquivo: "IMAGEM" | "PDF";
        }[];
        rateio_despesa?: {
            participacao_id: string;
            valor_devido: { toFixed: (decimalPlaces: number) => string };
            participacao: { usuario: { nome: string; apelido: string | null } };
        }[];
    }) {
        return {
            id: expense.id,
            description: expense.descricao,
            amount: expense.valor_total.toFixed(2),
            date: expense.data_vencimento?.toISOString().slice(0, 10) ?? null,
            homeId: expense.casa_id,
            homeName: expense.casa?.nome,
            subgroup: expense.subgrupo,
            scope: "HOME" as const,
            allocationStrategy: expense.estrategia_rateio,
            sourceLabel: expense.subgrupo?.nome ?? expense.casa?.nome ?? "Casa",
            totalAmount: expense.valor_total.toFixed(2),
            canEdit: true,
            paidBy: expense.participacao
                ? expense.participacao.usuario.apelido || expense.participacao.usuario.nome
                : null,
            paidAt: expense.quitada_em?.toISOString() ?? null,
            reminder: expense.lembrete?.[0]
                ? {
                      id: expense.lembrete[0].id,
                      message:
                          expense.lembrete[0].titulo === expense.descricao
                              ? ""
                              : expense.lembrete[0].titulo,
                      remindAt: expense.lembrete[0].lembrar_em.toISOString(),
                  }
                : null,
            proofs: (expense.comprovante_pagamento ?? []).map((proof) => ({
                id: proof.id,
                url: proof.arquivo_url,
                type: proof.tipo_arquivo,
            })),
            allocations: (expense.rateio_despesa ?? []).map((allocation) => ({
                participationId: allocation.participacao_id,
                memberName:
                    allocation.participacao.usuario.apelido ||
                    allocation.participacao.usuario.nome,
                amount: allocation.valor_devido.toFixed(2),
            })),
            paymentStatus:
                expense.status === "QUITADA"
                    ? ExpensePaymentStatus.PAID
                    : expense.status === "CANCELADA"
                      ? "CANCELLED"
                      : ExpensePaymentStatus.PENDING,
        };
    }
}
