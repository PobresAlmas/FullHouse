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
                        OR: [
                            {
                                membro_subgrupo: {
                                    some: {
                                        saiu_em: null,
                                        participacao: { usuario_id: "user-1", data_saida: null },
                                    },
                                },
                            },
                            { participacao: { usuario_id: "user-1", data_saida: null } },
                        ],
                    },
                },
            },
        ]);
        expect(where.status).toEqual({ not: "CANCELADA" });
    });
});

describe("ExpensesRepository.findActiveHomeMembers", () => {
    it("returns only active participation records ordered by resident name", async () => {
        const findMany = vi.fn().mockResolvedValue([]);
        const repository = new ExpensesRepository({
            participacao: { findMany },
        } as never);

        await repository.findActiveHomeMembers("home-id");

        expect(findMany).toHaveBeenCalledWith({
            where: { casa_id: "home-id", data_saida: null },
            select: {
                id: true,
                usuario: { select: { nome: true, apelido: true } },
            },
            orderBy: [{ usuario: { nome: "asc" } }, { id: "asc" }],
        });
    });
});

describe("ExpensesRepository.createSubgroup", () => {
    const data = { homeId: "home-id", name: " Café ", memberIds: ["member-1", "member-2"] };
    const makeRepository = (
        members = [
            { id: "member-1", usuario: { nome: "Ana", apelido: null } },
            { id: "member-2", usuario: { nome: "Bia", apelido: "Bibi" } },
        ]
    ) => {
        const tx = {
            casa: { findFirst: vi.fn().mockResolvedValue({ id: "home-id", nome: "Casa" }) },
            participacao: { findMany: vi.fn().mockResolvedValue(members) },
            subgrupo: { create: vi.fn().mockResolvedValue({ id: "group-id", nome: "Café" }) },
            membro_subgrupo: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        };
        const $transaction = vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx));
        return { repository: new ExpensesRepository({ $transaction } as never), tx, $transaction };
    };

    it("creates the subgroup and only the explicitly selected members in a transaction", async () => {
        const { repository, tx, $transaction } = makeRepository();

        await expect(repository.createSubgroup(data, "creator-id")).resolves.toEqual({
            id: "group-id",
            name: "Café",
            homeId: "home-id",
            homeName: "Casa",
            members: ["Ana", "Bibi"],
        });
        expect($transaction).toHaveBeenCalledOnce();
        expect(tx.subgrupo.create).toHaveBeenCalledWith({
            data: {
                casa_id: "home-id",
                nome: "Café",
                criado_por_participacao_id: "creator-id",
            },
            select: { id: true, nome: true },
        });
        expect(tx.membro_subgrupo.createMany).toHaveBeenCalledWith({
            data: [
                { subgrupo_id: "group-id", participacao_id: "member-1" },
                { subgrupo_id: "group-id", participacao_id: "member-2" },
            ],
        });
    });

    it("does not create a subgroup when any selected member is inactive or belongs elsewhere", async () => {
        const { repository, tx } = makeRepository([
            { id: "member-1", usuario: { nome: "Ana", apelido: null } },
        ]);

        await expect(repository.createSubgroup(data, "creator-id")).rejects.toThrow(
            "Selecione somente moradores ativos desta residência."
        );
        expect(tx.subgrupo.create).not.toHaveBeenCalled();
        expect(tx.membro_subgrupo.createMany).not.toHaveBeenCalled();
    });

    it("propagates member-write failure so the transaction can roll back the subgroup", async () => {
        const { repository, tx } = makeRepository();
        tx.membro_subgrupo.createMany.mockRejectedValueOnce(new Error("write failed"));

        await expect(repository.createSubgroup(data, "creator-id")).rejects.toThrow("write failed");
        expect(tx.subgrupo.create).toHaveBeenCalledOnce();
        expect(tx.membro_subgrupo.createMany).toHaveBeenCalledOnce();
    });
});

describe("ExpensesRepository writes", () => {
    let repository: ExpensesRepository;
    let create: ReturnType<typeof vi.fn>;
    let update: ReturnType<typeof vi.fn>;
    let findUnique: ReturnType<typeof vi.fn>;
    let deleteMany: ReturnType<typeof vi.fn>;
    let createMany: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        create = vi.fn().mockResolvedValue({ id: "expense-id" });
        update = vi.fn().mockResolvedValue({ id: "expense-id" });
        findUnique = vi.fn().mockResolvedValue({
            subgrupo_id: null,
            valor_total: new Prisma.Decimal("89.90"),
            rateio_despesa: [],
        });
        deleteMany = vi.fn().mockResolvedValue({ count: 0 });
        createMany = vi.fn();
        const transaction = {
            despesa: { create, update, findUnique },
            rateio_despesa: { deleteMany, createMany },
            subgrupo: { findFirst: vi.fn() },
        };
        repository = new ExpensesRepository({
            despesa: { create, update },
            $transaction: vi.fn((callback: (tx: typeof transaction) => unknown) =>
                callback(transaction)
            ),
        } as never);
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

    it("creates subgroup expense allocations with deterministic cent-level remainder", async () => {
        const expenseRecord = { id: "expense-id" };
        const transaction = {
            subgrupo: {
                findFirst: vi.fn().mockResolvedValue({
                    membro_subgrupo: [
                        { participacao_id: "member-z" },
                        { participacao_id: "member-a" },
                    ],
                }),
            },
            despesa: { create: vi.fn().mockResolvedValue(expenseRecord) },
            rateio_despesa: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        };
        const $transaction = vi.fn((callback: (tx: typeof transaction) => unknown) =>
            callback(transaction)
        );
        repository = new ExpensesRepository({ $transaction } as never);

        await expect(
            repository.create(
                {
                    description: "Café",
                    amount: "10.01",
                    date: "2026-10-11",
                    subgroupId: "group-id",
                    paymentStatus: "PENDING",
                },
                "home-id",
                "creator-id"
            )
        ).resolves.toBe(expenseRecord);
        expect(transaction.rateio_despesa.createMany).toHaveBeenCalledWith({
            data: [
                {
                    despesa_id: "expense-id",
                    participacao_id: "member-a",
                    valor_devido: new Prisma.Decimal("5.01"),
                },
                {
                    despesa_id: "expense-id",
                    participacao_id: "member-z",
                    valor_devido: new Prisma.Decimal("5.00"),
                },
            ],
        });
    });

    it("does not create subgroup expenses if there are no active subgroup members", async () => {
        const transaction = {
            subgrupo: { findFirst: vi.fn().mockResolvedValue({ membro_subgrupo: [] }) },
            despesa: { create: vi.fn() },
            rateio_despesa: { createMany: vi.fn() },
        };
        repository = new ExpensesRepository({
            $transaction: vi.fn((callback: (tx: typeof transaction) => unknown) =>
                callback(transaction)
            ),
        } as never);

        await expect(
            repository.create(
                {
                    description: "Café",
                    amount: "10",
                    date: "2026-10-11",
                    subgroupId: "group-id",
                    paymentStatus: "PENDING",
                },
                "home-id",
                "creator-id"
            )
        ).rejects.toThrow("O subgrupo não possui participantes ativos.");
        expect(transaction.despesa.create).not.toHaveBeenCalled();
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

    it("replaces pending allocations when changing subgroup and preserves them when paid", async () => {
        const transaction = {
            despesa: {
                findUnique: vi.fn().mockResolvedValue({
                    subgrupo_id: "old-group",
                    valor_total: new Prisma.Decimal("30.00"),
                    rateio_despesa: [{ participacao_id: "old-member", pago: false }],
                }),
                update: vi.fn().mockResolvedValue({ id: "expense-id" }),
            },
            rateio_despesa: {
                deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
                createMany: vi.fn().mockResolvedValue({ count: 2 }),
            },
            subgrupo: {
                findFirst: vi.fn().mockResolvedValue({
                    membro_subgrupo: [{ participacao_id: "new-b" }, { participacao_id: "new-a" }],
                }),
            },
        };
        repository = new ExpensesRepository({
            $transaction: vi.fn((callback: (tx: typeof transaction) => unknown) =>
                callback(transaction)
            ),
        } as never);

        await repository.update(
            "expense-id",
            {
                description: "Café",
                amount: "30.00",
                date: "2026-10-11",
                subgroupId: "new-group",
                paymentStatus: "PENDING",
            },
            "home-id",
            null,
            null
        );
        expect(transaction.rateio_despesa.deleteMany).toHaveBeenCalledWith({
            where: { despesa_id: "expense-id" },
        });
        expect(transaction.rateio_despesa.createMany).toHaveBeenCalledWith({
            data: [
                {
                    despesa_id: "expense-id",
                    participacao_id: "new-a",
                    valor_devido: new Prisma.Decimal("15.00"),
                },
                {
                    despesa_id: "expense-id",
                    participacao_id: "new-b",
                    valor_devido: new Prisma.Decimal("15.00"),
                },
            ],
        });

        transaction.despesa.findUnique.mockResolvedValueOnce({
            subgrupo_id: "old-group",
            valor_total: new Prisma.Decimal("30.00"),
            rateio_despesa: [{ participacao_id: "old-member", pago: true }],
        });
        await expect(
            repository.update(
                "expense-id",
                {
                    description: "Café",
                    amount: "30.00",
                    date: "2026-10-11",
                    subgroupId: "new-group",
                    paymentStatus: "PENDING",
                },
                "home-id",
                null,
                null
            )
        ).rejects.toThrow("já existem parcelas pagas");
        expect(transaction.rateio_despesa.deleteMany).toHaveBeenCalledOnce();
    });

    it("removes pending subgroup allocations when clearing the subgroup", async () => {
        const transaction = {
            despesa: {
                findUnique: vi.fn().mockResolvedValue({
                    subgrupo_id: "old-group",
                    valor_total: new Prisma.Decimal("30.00"),
                    rateio_despesa: [{ participacao_id: "old-member", pago: false }],
                }),
                update: vi.fn().mockResolvedValue({ id: "expense-id" }),
            },
            rateio_despesa: {
                deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
                createMany: vi.fn(),
            },
            subgrupo: { findFirst: vi.fn() },
        };
        repository = new ExpensesRepository({
            $transaction: vi.fn((callback: (tx: typeof transaction) => unknown) =>
                callback(transaction)
            ),
        } as never);
        await repository.update(
            "expense-id",
            {
                description: "Sem grupo",
                amount: "30.00",
                date: "2026-10-11",
                subgroupId: null,
                paymentStatus: "PENDING",
            },
            "home-id",
            null,
            null
        );
        expect(transaction.rateio_despesa.deleteMany).toHaveBeenCalledOnce();
        expect(transaction.rateio_despesa.createMany).not.toHaveBeenCalled();
    });

    it("marks removed expenses as cancelled instead of deleting records", async () => {
        await repository.softDelete("expense-id");

        expect(update).toHaveBeenCalledWith({
            where: { id: "expense-id" },
            data: { status: "CANCELADA" },
        });
    });
});
