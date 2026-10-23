import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ExpensesRepository } from "./expenses.repository.js";
import { CreateExpenseDto, ExpensePaymentStatus } from "./dto/create-expense.dto.js";
import { UpdateExpenseDto } from "./dto/update-expense.dto.js";

@Injectable()
export class ExpensesService {
    constructor(private readonly repository: ExpensesRepository) {}

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
        }));
    }

    async create(data: CreateExpenseDto, userId: string) {
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

    async findAll(userId: string, paymentStatus?: "PENDING" | "PAID") {
        const expenses = await this.repository.findForUser(userId, paymentStatus);

        return expenses.map((expense) => this.mapExpense(expense));
    }

    async update(id: string, data: UpdateExpenseDto, userId: string) {
        const existing = await this.repository.findEditableExpense(id, userId);
        if (!existing) {
            throw new NotFoundException("A despesa não está disponível.");
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

    private mapExpense(expense: {
        id: string;
        descricao: string;
        valor_total: { toFixed: (decimalPlaces: number) => string };
        data_vencimento: Date | null;
        status: string;
        subgrupo: { id: string; nome: string } | null;
        casa_id?: string | null;
        casa?: { nome: string } | null;
        participacao: {
            usuario: { nome: string; apelido: string | null };
        } | null;
        quitada_em: Date | null;
    }) {
        return {
            id: expense.id,
            description: expense.descricao,
            amount: expense.valor_total.toFixed(2),
            date: expense.data_vencimento?.toISOString().slice(0, 10) ?? null,
            homeId: expense.casa_id,
            homeName: expense.casa?.nome,
            subgroup: expense.subgrupo,
            paidBy: expense.participacao
                ? expense.participacao.usuario.apelido || expense.participacao.usuario.nome
                : null,
            paidAt: expense.quitada_em?.toISOString() ?? null,
            paymentStatus:
                expense.status === "QUITADA"
                    ? ExpensePaymentStatus.PAID
                    : expense.status === "CANCELADA"
                      ? "CANCELLED"
                      : ExpensePaymentStatus.PENDING,
        };
    }
}
