import { Injectable } from "@nestjs/common";
import { HomeRepository } from "./home.repository.js";

@Injectable()
export class HomeService {
    constructor(private readonly repository: HomeRepository) {}

    async getPersonal(userId: string) {
        const [tasksResult, expensesResult] = await Promise.allSettled([
            this.repository.findPersonalTasks(userId),
            this.repository.findPersonalExpenses(userId),
        ]);
        const tasks = tasksResult.status === "fulfilled" ? tasksResult.value : [];
        const expenses = expensesResult.status === "fulfilled" ? expensesResult.value : [];

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
