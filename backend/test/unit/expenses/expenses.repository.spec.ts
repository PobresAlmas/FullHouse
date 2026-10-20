import { ExpensesRepository } from "../../../src/expenses/expenses.repository.js";
import { Prisma } from "../../../src/generated/prisma/client.js";

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
    ] as const)(
        "filters %s expenses by persisted status",
        async (paymentStatus, persistedStatus) => {
            await repository.findForUser("user-1", paymentStatus);

            expect(findMany.mock.calls[0][0].where.status).toBe(persistedStatus);
        }
    );

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

describe("ExpensesRepository writes", () => {
    let repository: ExpensesRepository;
    let create: ReturnType<typeof vi.fn>;
    let update: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        create = vi.fn().mockResolvedValue({ id: "expense-id" });
        update = vi.fn().mockResolvedValue({ id: "expense-id" });
        repository = new ExpensesRepository({ despesa: { create, update } } as never);
    });

    it("persists pending expenses without payment metadata", async () => {
        await repository.create(
            {
                description: "  Conta de energia  ",
                amount: "119,87",
                date: "2026-10-11",
                subgroupId: null,
                paymentStatus: "PENDING",
            },
            "home-id",
            "participation-id"
        );

        const args = create.mock.calls[0][0];
        expect(args.data).toMatchObject({
            escopo: "CASA",
            casa_id: "home-id",
            subgrupo_id: null,
            descricao: "Conta de energia",
            valor_total: new Prisma.Decimal("119.87"),
            tipo: "VARIAVEL",
            estrategia_rateio: "IGUALITARIO",
            data_vencimento: new Date("2026-10-11T00:00:00.000Z"),
            status: "ABERTA",
            quitada_em: null,
            pago_por_participacao_id: null,
        });
    });

    it("persists paid status with the paying participation", async () => {
        await repository.create(
            {
                description: "Internet",
                amount: "89.90",
                date: "2026-10-12",
                paymentStatus: "PAID",
            },
            "home-id",
            "participation-id"
        );

        expect(create.mock.calls[0][0].data).toMatchObject({
            status: "QUITADA",
            pago_por_participacao_id: "participation-id",
        });
        expect(create.mock.calls[0][0].data.quitada_em).toBeInstanceOf(Date);
    });

    it("updates payment fields and clears them for pending expenses", async () => {
        await repository.update(
            "expense-id",
            {
                description: "Internet",
                amount: "89.90",
                date: "2026-10-12",
                subgroupId: null,
                paymentStatus: "PENDING",
            },
            "home-id",
            null,
            null
        );

        expect(update.mock.calls[0][0]).toMatchObject({
            where: { id: "expense-id" },
            data: {
                casa_id: "home-id",
                descricao: "Internet",
                valor_total: new Prisma.Decimal("89.90"),
                status: "ABERTA",
                quitada_em: null,
                pago_por_participacao_id: null,
            },
        });
    });

    it("marks removed expenses as cancelled instead of deleting records", async () => {
        await repository.softDelete("expense-id");

        expect(update).toHaveBeenCalledWith({
            where: { id: "expense-id" },
            data: { status: "CANCELADA" },
        });
    });
});
