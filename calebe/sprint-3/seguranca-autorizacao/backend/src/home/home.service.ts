import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ResidenceAccessService } from "../residences/residence-access.service.js";
import { HomeRepository } from "./home.repository.js";

@Injectable()
export class HomeService {
  constructor(
    private readonly repository: HomeRepository,
    @Optional() private readonly residenceAccess?: ResidenceAccessService,
  ) {}

  async getResidenceNotices(residenceId: string, userId: string) {
    await this.residenceAccess!.requireMembership(residenceId, userId);
    const notices = await this.repository.findResidenceNotices(residenceId);
    return notices.map((notice) => ({
      id: notice.id,
      content: notice.conteudo,
      createdAt: notice.criado_em.toISOString(),
      authorName:
        notice.participacao.usuario.apelido || notice.participacao.usuario.nome,
      authorId: notice.participacao.usuario.id,
    }));
  }

  async createResidenceNotice(
    residenceId: string,
    userId: string,
    content: string,
  ) {
    const normalizedContent = content.trim();
    if (!normalizedContent)
      throw new BadRequestException("Escreva o aviso antes de publicar.");
    const membership = await this.residenceAccess!.requireCreateEditPermission(
      residenceId,
      userId,
    );
    const notice = await this.repository.createResidenceNotice(
      residenceId,
      membership.memberId,
      normalizedContent,
    );
    return {
      id: notice.id,
      content: notice.conteudo,
      createdAt: notice.criado_em.toISOString(),
      authorName:
        notice.participacao.usuario.apelido || notice.participacao.usuario.nome,
      authorId: notice.participacao.usuario.id,
    };
  }

  async updateResidenceNotice(
    residenceId: string,
    noticeId: string,
    userId: string,
    content: string,
  ) {
    const normalizedContent = content.trim();
    if (!normalizedContent)
      throw new BadRequestException("Escreva o aviso antes de salvar.");
    const membership = await this.residenceAccess!.requireCreateEditPermission(
      residenceId,
      userId,
    );
    const notice = await this.repository.updateResidenceNotice(
      residenceId,
      noticeId,
      membership.memberId,
      normalizedContent,
    );
    if (!notice) throw new NotFoundException("Aviso não encontrado.");
    return {
      id: notice.id,
      content: notice.conteudo,
      createdAt: notice.criado_em.toISOString(),
      authorName:
        notice.participacao.usuario.apelido || notice.participacao.usuario.nome,
      authorId: notice.participacao.usuario.id,
    };
  }

  async deleteResidenceNotice(
    residenceId: string,
    noticeId: string,
    userId: string,
  ) {
    const membership = await this.residenceAccess!.requireCreateEditPermission(
      residenceId,
      userId,
    );
    const result = await this.repository.deleteResidenceNotice(
      residenceId,
      noticeId,
      membership.memberId,
    );
    if (!result.count) throw new NotFoundException("Aviso não encontrado.");
    return { success: true };
  }

  async getPersonal(userId: string) {
    const [tasksResult, expensesResult] = await Promise.allSettled([
      this.repository.findPersonalTasks(userId),
      this.repository.findPersonalExpenses(userId),
    ]);
    const tasks = tasksResult.status === "fulfilled" ? tasksResult.value : [];
    const expenses =
      expensesResult.status === "fulfilled" ? expensesResult.value : [];

    return {
      errors: {
        ...(tasksResult.status === "rejected"
          ? { tasks: "Não foi possível carregar suas tarefas pessoais." }
          : {}),
        ...(expensesResult.status === "rejected"
          ? { expenses: "Não foi possível carregar suas despesas pessoais." }
          : {}),
      },
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.definicao_tarefa.titulo,
        dueAt: (task.prazo_limite ?? task.data_prevista).toISOString(),
        status: task.status,
        completedAt: task.concluida_em?.toISOString() ?? null,
      })),
      expenses: expenses.map((expense) => ({
        id: expense.id,
        description: expense.descricao,
        amount: expense.valor_total.toFixed(2),
        dueAt: expense.data_vencimento?.toISOString().slice(0, 10) ?? null,
        paymentStatus:
          expense.status === "QUITADA"
            ? "PAID"
            : expense.status === "CANCELADA"
              ? "CANCELLED"
              : "PENDING",
        paidAt: expense.quitada_em?.toISOString() ?? null,
      })),
    };
  }
}
