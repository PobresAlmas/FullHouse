import { ExpensesRepository } from "./expenses.repository.js";

describe("ExpensesRepository.findForUser", () => {
    let repository: ExpensesRepository;
    let findMany: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        findMany = vi.fn().mockResolvedValue([]);
        repository = new ExpensesRepository({ despesa: { findMany } } as never);
    });

    it("does not leak expenses from residences without an active user membership", async () => {
        await repository.findForUser("user-1");

        const { where } = findMany.mock.calls[0][0];
        expect(where.casa.is.participacao.some).toEqual({
            usuario_id: "user-1",
            data_saida: null,
        });
        expect(where.casa.is.excluido_em).toBeNull();
    });

    it.each([
        ["PAID", "QUITADA"],
        ["PENDING", "ABERTA"],
    ] as const)("filters %s expenses by persisted status", async (paymentStatus, persistedStatus) => {
        await repository.findForUser("user-1", paymentStatus);

        expect(findMany.mock.calls[0][0].where.status).toBe(persistedStatus);
    });

    it("returns history ordered by expense date, newest first", async () => {
        await repository.findForUser("user-1");

        expect(findMany.mock.calls[0][0].orderBy).toEqual([
            { data_vencimento: "desc" },
            { id: "desc" },
        ]);
    });

    it("requires active subgroup membership for grouped expenses and excludes cancelled ones", async () => {
        await repository.findForUser("user-1");

        const { where } = findMany.mock.calls[0][0];
        expect(where.OR).toEqual([
            { subgrupo_id: null },
            {
                subgrupo: {
                    is: {
                        excluido_em: null,
                        membro_subgrupo: {
                            some: {
                                saiu_em: null,
                                participacao: { usuario_id: "user-1", data_saida: null },
                            },
                        },
                    },
                },
            },
        ]);
        expect(where.status).toEqual({ not: "CANCELADA" });
    });
});
