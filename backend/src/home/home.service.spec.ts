import { HomeRepository } from "./home.repository.js";
import { HomeService } from "./home.service.js";

describe("HomeRepository personal data isolation", () => {
    it("filters both task and expense sources by the authenticated user and personal scope", async () => {
        const prisma = {
            instancia_tarefa: { findMany: vi.fn().mockResolvedValue([]) },
            despesa: { findMany: vi.fn().mockResolvedValue([]) },
        };
        const repository = new HomeRepository(prisma as never);

        await repository.findPersonalTasks("user-1");
        await repository.findPersonalExpenses("user-1");

        expect(prisma.instancia_tarefa.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    definicao_tarefa: { escopo: "INDIVIDUAL", usuario_id: "user-1" },
                    status: { not: "CANCELADA" },
                },
            })
        );
        expect(prisma.despesa.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { escopo: "INDIVIDUAL", usuario_id: "user-1", status: { not: "CANCELADA" } },
            })
        );
    });

    it("maps personal tasks and expenses into the Home contract", async () => {
        const repository = {
            findPersonalTasks: vi.fn().mockResolvedValue([
                {
                    id: "task-1",
                    definicao_tarefa: { titulo: "Ler" },
                    data_prevista: new Date("2026-10-23T00:00:00Z"),
                    prazo_limite: null,
                    status: "PENDENTE",
                    concluida_em: null,
                },
            ]),
            findPersonalExpenses: vi.fn().mockResolvedValue([
                {
                    id: "expense-1",
                    descricao: "Internet",
                    valor_total: { toFixed: () => "99.90" },
                    data_vencimento: new Date("2026-10-25T00:00:00Z"),
                    status: "ABERTA",
                    quitada_em: null,
                },
            ]),
        };
        const service = new HomeService(repository as never);

        await expect(service.getPersonal("user-1")).resolves.toMatchObject({
            tasks: [{ id: "task-1", title: "Ler", status: "PENDENTE" }],
            expenses: [
                {
                    id: "expense-1",
                    description: "Internet",
                    amount: "99.90",
                    dueAt: "2026-10-25",
                    paymentStatus: "PENDING",
                },
            ],
        });
    });

    it("keeps successful personal cards available when the other query fails", async () => {
        const repository = {
            findPersonalTasks: vi.fn().mockResolvedValue([]),
            findPersonalExpenses: vi.fn().mockRejectedValue(new Error("database unavailable")),
        };
        const service = new HomeService(repository as never);

        await expect(service.getPersonal("user-1")).resolves.toEqual({
            tasks: [],
            expenses: [],
            errors: { expenses: "Não foi possível carregar suas despesas pessoais." },
        });
    });
});
