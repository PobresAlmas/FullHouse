import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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
import { isResidenceManager } from "../residences/residence-access.service.js";
import {
  type ExpenseInsightsQueryDto,
  type ExpenseInsightsStatus,
} from "./dto/expense-insights-query.dto.js";

const MAX_INSIGHTS_MONTHS = 120;

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

function currentBusinessDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function centsFromText(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function centsFromDecimal(value: { toFixed: (digits: number) => string }) {
  return centsFromText(value.toFixed(2));
}

function compareMoneyDescending(left: string, right: string) {
  const difference = centsFromText(right) - centsFromText(left);
  return difference === 0n ? 0 : difference > 0n ? 1 : -1;
}

function decimalFromCents(cents: bigint) {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

function percentage(part: bigint, total: bigint): number | null {
  if (total === 0n) return null;
  const basisPoints = (part * 10_000n + total / 2n) / total;
  return Number(basisPoints) / 100;
}

function monthKeys(from: string, to: string) {
  const months: string[] = [];
  const [startYear, startMonth] = from.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = to.slice(0, 7).split("-").map(Number);
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

function monthCount(from: string, to: string) {
  const [startYear, startMonth] = from.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = to.slice(0, 7).split("-").map(Number);
  return (endYear - startYear) * 12 + endMonth - startMonth + 1;
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly repository: ExpensesRepository,
    private readonly residenceAccess: ResidenceAccessService,
    private readonly storage: StorageService,
  ) {}

  async findHomeMembers(homeId: string, userId: string) {
    await this.residenceAccess.requireMembership(homeId, userId);
    return (await this.repository.findActiveHomeMembers(homeId)).map(
      (member) => ({
        id: member.id,
        name: member.usuario.apelido || member.usuario.nome,
      }),
    );
  }

  async getHomeInsights(
    homeId: string,
    userId: string,
    query: ExpenseInsightsQueryDto,
  ) {
    await this.residenceAccess.requireMembership(homeId, userId);
    if (
      !isValidDateOnly(query.from) ||
      !isValidDateOnly(query.to) ||
      query.from > query.to
    ) {
      throw new BadRequestException("Informe um período de datas válido.");
    }
    if (monthCount(query.from, query.to) > MAX_INSIGHTS_MONTHS) {
      throw new BadRequestException("Selecione um período de até 120 meses.");
    }
    if (
      query.participationId &&
      !(await this.repository.hasParticipationInHome(
        homeId,
        query.participationId,
      ))
    ) {
      throw new BadRequestException(
        "O filtro selecionado não está disponível nesta residência.",
      );
    }
    if (
      query.subgroupId &&
      !(await this.repository.hasVisibleSubgroup(
        homeId,
        query.subgroupId,
        userId,
      ))
    ) {
      throw new BadRequestException(
        "O filtro selecionado não está disponível nesta residência.",
      );
    }

    const expenses = await this.repository.findInsightsExpenses(
      homeId,
      userId,
      query.from,
      query.to,
      query.subgroupId,
    );
    const today = currentBusinessDate();
    const selectedStatus: ExpenseInsightsStatus = query.status ?? "ALL";
    const selectedAllocations = expenses.flatMap((expense) =>
      expense.rateio_despesa
        .filter(
          (allocation) =>
            !query.participationId ||
            allocation.participacao_id === query.participationId,
        )
        .map((allocation) => ({
          expense,
          allocation,
          overdue:
            !allocation.pago &&
            expense.data_vencimento !== null &&
            expense.data_vencimento.toISOString().slice(0, 10) < today,
        })),
    );
    const allocations = selectedAllocations.filter(
      ({ allocation, overdue }) => {
        if (selectedStatus === "PAID") return allocation.pago;
        if (selectedStatus === "PENDING") return !allocation.pago;
        if (selectedStatus === "OVERDUE") return overdue;
        return true;
      },
    );

    let dueAmount = 0n;
    let paidAmount = 0n;
    let pendingAmount = 0n;
    let overdueAmount = 0n;
    const members = new Map<
      string,
      {
        participationId: string;
        name: string;
        active: boolean;
        due: bigint;
        paid: bigint;
        pending: bigint;
        overdue: bigint;
        paidCount: number;
        pendingCount: number;
        overdueCount: number;
      }
    >();
    const monthly = new Map<
      string,
      { due: bigint; paid: bigint; pending: bigint; overdue: bigint }
    >(
      monthKeys(query.from, query.to).map((month) => [
        month,
        { due: 0n, paid: 0n, pending: 0n, overdue: 0n },
      ]),
    );
    const overdueAllocations: {
      id: string;
      expenseId: string;
      description: string;
      participationId: string;
      memberName: string;
      subgroupName: string | null;
      dueDate: string;
      overdueDays: number;
      amount: string;
    }[] = [];

    for (const row of allocations) {
      const amount = centsFromDecimal(row.allocation.valor_devido);
      const dueDate = row.expense.data_vencimento?.toISOString().slice(0, 10);
      const isOverdue = row.overdue && dueDate !== undefined;
      dueAmount += amount;
      if (row.allocation.pago) paidAmount += amount;
      else pendingAmount += amount;
      if (isOverdue) overdueAmount += amount;

      const member = members.get(row.allocation.participacao_id) ?? {
        participationId: row.allocation.participacao_id,
        name:
          row.allocation.participacao.usuario.apelido ||
          row.allocation.participacao.usuario.nome,
        active: row.allocation.participacao.data_saida === null,
        due: 0n,
        paid: 0n,
        pending: 0n,
        overdue: 0n,
        paidCount: 0,
        pendingCount: 0,
        overdueCount: 0,
      };
      member.due += amount;
      if (row.allocation.pago) {
        member.paid += amount;
        member.paidCount += 1;
      } else {
        member.pending += amount;
        member.pendingCount += 1;
      }
      if (isOverdue && dueDate !== undefined) {
        member.overdue += amount;
        member.overdueCount += 1;
        const dueDateValue = new Date(`${dueDate}T00:00:00.000Z`);
        const todayValue = new Date(`${today}T00:00:00.000Z`);
        const overdueDays = Math.floor(
          (todayValue.valueOf() - dueDateValue.valueOf()) / 86_400_000,
        );
        overdueAllocations.push({
          id: row.allocation.id,
          expenseId: row.expense.id,
          description: row.expense.descricao,
          participationId: row.allocation.participacao_id,
          memberName: member.name,
          subgroupName: row.expense.subgrupo?.nome ?? null,
          dueDate,
          overdueDays,
          amount: decimalFromCents(amount),
        });
      }
      members.set(member.participationId, member);

      if (dueDate) {
        const month = monthly.get(dueDate.slice(0, 7));
        if (month) {
          month.due += amount;
          if (row.allocation.pago) month.paid += amount;
          else month.pending += amount;
          if (isOverdue) month.overdue += amount;
        }
      }
    }

    const unallocatedExpenses = expenses.filter(
      (expense) => expense.rateio_despesa.length === 0,
    );
    const wholeBills = new Map<
      string,
      {
        participationId: string | null;
        name: string;
        amount: bigint;
        count: number;
      }
    >();
    for (const expense of expenses) {
      if (expense.status !== "QUITADA") continue;
      const payer = expense.participacao;
      if (query.participationId && payer?.id !== query.participationId)
        continue;
      const key = payer?.id ?? "unknown";
      const entry = wholeBills.get(key) ?? {
        participationId: payer?.id ?? null,
        name: payer
          ? payer.usuario.apelido || payer.usuario.nome
          : "Responsável não informado",
        amount: 0n,
        count: 0,
      };
      entry.amount += centsFromDecimal(expense.valor_total);
      entry.count += 1;
      wholeBills.set(key, entry);
    }

    overdueAllocations.sort(
      (left, right) =>
        right.overdueDays - left.overdueDays ||
        compareMoneyDescending(left.amount, right.amount) ||
        left.memberName.localeCompare(right.memberName, "pt-BR"),
    );

    return {
      period: {
        from: query.from,
        to: query.to,
        timeZone: "America/Fortaleza",
        today,
      },
      summary: {
        dueAmount: decimalFromCents(dueAmount),
        paidAmount: decimalFromCents(paidAmount),
        pendingAmount: decimalFromCents(pendingAmount),
        overdueAmount: decimalFromCents(overdueAmount),
        paidPercentage: percentage(paidAmount, dueAmount),
        unallocatedExpenseCount: unallocatedExpenses.length,
        unallocatedExpenseAmount: decimalFromCents(
          unallocatedExpenses.reduce(
            (sum, expense) => sum + centsFromDecimal(expense.valor_total),
            0n,
          ),
        ),
      },
      members: [...members.values()]
        .map((member) => ({
          participationId: member.participationId,
          name: member.name,
          active: member.active,
          dueAmount: decimalFromCents(member.due),
          paidAmount: decimalFromCents(member.paid),
          pendingAmount: decimalFromCents(member.pending),
          overdueAmount: decimalFromCents(member.overdue),
          paidPercentage: percentage(member.paid, member.due),
          paidCount: member.paidCount,
          pendingCount: member.pendingCount,
          overdueCount: member.overdueCount,
        }))
        .sort(
          (left, right) =>
            compareMoneyDescending(left.overdueAmount, right.overdueAmount) ||
            compareMoneyDescending(left.pendingAmount, right.pendingAmount) ||
            left.name.localeCompare(right.name, "pt-BR"),
        ),
      wholeBillsPaidByMember: [...wholeBills.values()]
        .map((member) => ({
          participationId: member.participationId,
          name: member.name,
          amount: decimalFromCents(member.amount),
          count: member.count,
        }))
        .sort(
          (left, right) =>
            compareMoneyDescending(left.amount, right.amount) ||
            left.name.localeCompare(right.name, "pt-BR"),
        ),
      monthly: [...monthly.entries()].map(([month, values]) => ({
        month,
        dueAmount: decimalFromCents(values.due),
        paidAmount: decimalFromCents(values.paid),
        pendingAmount: decimalFromCents(values.pending),
        overdueAmount: decimalFromCents(values.overdue),
      })),
      overdueAllocations,
    };
  }

  async createSubgroup(data: CreateExpenseSubgroupDto, userId: string) {
    if (data.memberIds.length === 0) {
      throw new BadRequestException("Selecione pelo menos um participante.");
    }
    if (new Set(data.memberIds).size !== data.memberIds.length) {
      throw new BadRequestException("Não repita participantes no subgrupo.");
    }

    const membership = await this.residenceAccess.requireCreateEditPermission(
      data.homeId,
      userId,
    );
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
        ({ participacao }) =>
          participacao.usuario.apelido || participacao.usuario.nome,
      ),
      memberIds: group.membro_subgrupo.map((member) => member.participacao_id),
      memberDetails: group.membro_subgrupo.map(
        ({ participacao_id, participacao }) => ({
          id: participacao_id,
          name: participacao.usuario.apelido || participacao.usuario.nome,
        }),
      ),
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
        ({ participacao }) =>
          participacao.usuario.apelido || participacao.usuario.nome,
      ),
      memberIds: group.membro_subgrupo.map((member) => member.participacao_id),
      memberDetails: group.membro_subgrupo.map(
        ({ participacao_id, participacao }) => ({
          id: participacao_id,
          name: participacao.usuario.apelido || participacao.usuario.nome,
        }),
      ),
      canEdit: group.participacao.usuario_id === userId,
    }));
  }

  async updateSubgroup(
    id: string,
    data: CreateExpenseSubgroupDto,
    userId: string,
  ) {
    if (data.memberIds.length === 0) {
      throw new BadRequestException("Selecione pelo menos um participante.");
    }
    if (new Set(data.memberIds).size !== data.memberIds.length) {
      throw new BadRequestException("Não repita participantes no subgrupo.");
    }
    const subgroup = await this.repository.findSubgroupForUser(id, userId);
    if (!subgroup)
      throw new NotFoundException("O subgrupo não está disponível.");
    await this.residenceAccess.requireCreateEditPermission(
      subgroup.casa_id,
      userId,
    );
    return this.repository.updateSubgroup(id, userId, data);
  }

  async create(data: CreateExpenseDto, userId: string) {
    if (data.paymentDate && data.paymentStatus !== ExpensePaymentStatus.PAID) {
      throw new BadRequestException(
        "A data de pagamento só pode ser informada para despesas pagas.",
      );
    }
    if (data.scope === ExpenseScope.PERSONAL) {
      if (data.subgroupId || data.allocations) {
        throw new BadRequestException(
          "Despesas pessoais não podem ser vinculadas a subgrupos.",
        );
      }
      return this.mapExpense(
        await this.repository.createPersonal(data, userId),
      );
    }

    if (data.allocations && !data.subgroupId) {
      throw new BadRequestException(
        "A divisão personalizada só está disponível em subgrupos.",
      );
    }

    const subgroup = data.subgroupId
      ? await this.repository.findSubgroupForUser(data.subgroupId, userId)
      : null;
    if (data.subgroupId && !subgroup) {
      throw new NotFoundException(
        "O subgrupo selecionado não está disponível.",
      );
    }

    if (subgroup && data.homeId && data.homeId !== subgroup.casa_id) {
      throw new NotFoundException(
        "O subgrupo selecionado não está disponível.",
      );
    }

    let homeId = subgroup?.casa_id ?? data.homeId;
    if (!homeId && !subgroup) {
      const homes = await this.repository.findAvailableHomes(userId);
      if (homes.length === 1) homeId = homes[0].id;
    }
    if (!homeId) {
      throw new BadRequestException(
        "Selecione uma casa para registrar a despesa.",
      );
    }

    await this.residenceAccess.requireCreateEditPermission(homeId, userId);

    const home = await this.repository.findHomeForUser(homeId, userId);
    if (!home)
      throw new NotFoundException(
        "Não foi encontrada uma casa ativa para registrar a despesa.",
      );

    const expense = await this.repository.create(
      data,
      home.id,
      subgroup?.membro_subgrupo[0]?.participacao_id ?? home.participacao[0].id,
      userId,
    );

    return this.mapExpense(expense);
  }

  async findAll(
    userId: string,
    paymentStatus?: "PENDING" | "PAID",
    scope: ExpenseScope = ExpenseScope.HOME,
  ) {
    if (scope === ExpenseScope.PERSONAL) {
      return this.repository.findPersonalForUser(userId);
    }
    const expenses = await this.repository.findForUser(userId, paymentStatus);

    return expenses.map((expense) =>
      this.mapExpense(
        expense,
        expense.criado_por_usuario_id === userId ||
          Boolean(
            expense.casa?.participacao?.some((member) =>
              isResidenceManager(member.papel),
            ),
          ),
      ),
    );
  }

  async update(id: string, data: UpdateExpenseDto, userId: string) {
    const existing = await this.repository.findEditableExpense(id, userId);
    if (!existing) {
      throw new NotFoundException("A despesa não está disponível.");
    }
    if (existing.escopo === "CASA" && existing.casa_id) {
      await this.residenceAccess.requireCreateEditPermission(
        existing.casa_id,
        userId,
      );
      await this.requireExpenseOwnerOrManager(
        existing.casa_id,
        existing.criado_por_usuario_id,
        userId,
      );
    }

    if (data.paymentDate && data.paymentStatus !== ExpensePaymentStatus.PAID) {
      throw new BadRequestException(
        "A data de pagamento só pode ser informada para despesas pagas.",
      );
    }

    if (existing.escopo === "INDIVIDUAL") {
      if (
        data.scope === ExpenseScope.HOME ||
        data.subgroupId ||
        data.homeId ||
        data.allocations
      ) {
        throw new BadRequestException(
          "Despesas pessoais não podem ser movidas para a casa.",
        );
      }
      const paidAt =
        data.paymentStatus !== ExpensePaymentStatus.PAID
          ? null
          : data.paymentDate
            ? new Date(`${data.paymentDate}T00:00:00.000Z`)
            : (existing.quitada_em ?? new Date());
      return this.mapExpense(
        await this.repository.updatePersonal(id, data, paidAt),
      );
    }

    if (data.allocations && !data.subgroupId) {
      throw new BadRequestException(
        "A divisão personalizada só está disponível em subgrupos.",
      );
    }

    const subgroup = data.subgroupId
      ? await this.repository.findSubgroupForUser(data.subgroupId, userId)
      : null;
    if (data.subgroupId && !subgroup) {
      throw new NotFoundException(
        "O subgrupo selecionado não está disponível.",
      );
    }

    const homeId = data.homeId ?? subgroup?.casa_id ?? existing.casa_id;
    const home = homeId
      ? await this.repository.findHomeForUser(homeId, userId)
      : null;
    if (!home)
      throw new NotFoundException(
        "A casa da despesa não está mais disponível.",
      );
    await this.residenceAccess.requireCreateEditPermission(home.id, userId);
    await this.requireExpenseOwnerOrManager(
      home.id,
      existing.criado_por_usuario_id,
      userId,
    );
    if (subgroup && subgroup.casa_id !== home.id) {
      throw new NotFoundException(
        "O subgrupo selecionado não está disponível.",
      );
    }

    const paid = data.paymentStatus === ExpensePaymentStatus.PAID;
    const samePaidSubgroup = existing.subgrupo_id === (data.subgroupId ?? null);
    const paidByParticipationId = !paid
      ? null
      : existing.status === "QUITADA" && samePaidSubgroup
        ? (existing.pago_por_participacao_id ??
          subgroup?.membro_subgrupo[0]?.participacao_id ??
          home.participacao[0].id)
        : (subgroup?.membro_subgrupo[0]?.participacao_id ??
          home.participacao[0].id);
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
      paidAt,
    );

    return this.mapExpense(updated);
  }

  async remove(id: string, userId: string) {
    const existing = await this.repository.findEditableExpense(id, userId);
    if (!existing) {
      throw new NotFoundException("A despesa não está disponível.");
    }

    if (existing.casa_id) {
      await this.residenceAccess.requireCreateEditPermission(
        existing.casa_id,
        userId,
      );
      await this.requireExpenseOwnerOrManager(
        existing.casa_id,
        existing.criado_por_usuario_id,
        userId,
      );
    }

    await this.repository.softDelete(id);
    return { id, deleted: true };
  }

  setPersonalPaymentStatus(id: string, userId: string, paid: boolean) {
    return this.repository.setPersonalPaymentStatus(id, userId, paid);
  }

  async setExpenseReminder(
    id: string,
    userId: string,
    data: UpsertExpenseReminderDto,
  ) {
    const expense = await this.repository.findEditableExpense(id, userId);
    if (!expense) throw new NotFoundException("A despesa não está disponível.");
    if (expense.casa_id) {
      await this.residenceAccess.requireCreateEditPermission(
        expense.casa_id,
        userId,
      );
    }
    return this.repository.setExpenseReminder(
      id,
      userId,
      expense.descricao,
      data.remindAt,
      data.message,
      data.enabled,
    );
  }

  async deleteExpenseReminder(id: string, userId: string) {
    const expense = await this.repository.findEditableExpense(id, userId);
    if (!expense) throw new NotFoundException("A despesa não está disponível.");
    if (expense.casa_id) {
      await this.residenceAccess.requireCreateEditPermission(
        expense.casa_id,
        userId,
      );
    }
    return this.repository.deleteExpenseReminder(id, userId);
  }

  async addExpenseProof(id: string, userId: string, file: Express.Multer.File) {
    const expense = await this.repository.findEditableExpense(id, userId);
    if (!expense) throw new NotFoundException("A despesa não está disponível.");
    if (expense.casa_id) {
      await this.residenceAccess.requireCreateEditPermission(
        expense.casa_id,
        userId,
      );
      await this.requireExpenseOwnerOrManager(
        expense.casa_id,
        expense.criado_por_usuario_id,
        userId,
      );
    }
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
      file.mimetype === "application/pdf" ? "PDF" : "IMAGEM",
    );
    return { id: proof.id, url: proof.arquivo_url, type: proof.tipo_arquivo };
  }

  private async requireExpenseOwnerOrManager(
    homeId: string,
    creatorUserId: string | null,
    userId: string,
  ) {
    if (creatorUserId === userId) return;
    await this.residenceAccess.requireManager(homeId, userId);
  }

  private mapExpense(
    expense: {
      id: string;
      descricao: string;
      valor_total: { toFixed: (decimalPlaces: number) => string };
      data_vencimento: Date | null;
      status: string;
      estrategia_rateio: "IGUALITARIO" | "PERSONALIZADO" | "PERCENTUAL";
      subgrupo: { id: string; nome: string } | null;
      casa_id?: string | null;
      criado_por_usuario_id?: string | null;
      casa?: {
        nome: string;
        participacao?: { papel: Parameters<typeof isResidenceManager>[0] }[];
      } | null;
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
    },
    canEdit = true,
  ) {
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
      canEdit,
      paidBy: expense.participacao
        ? expense.participacao.usuario.apelido ||
          expense.participacao.usuario.nome
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
