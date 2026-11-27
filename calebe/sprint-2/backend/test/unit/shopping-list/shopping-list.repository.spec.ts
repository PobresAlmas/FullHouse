import { ShoppingListRepository } from "../../../src/shopping-list/shopping-list.repository.js";

describe("ShoppingListRepository", () => {
    const createPrisma = () => ({
        item_lista_compras: {
            findMany: vi.fn().mockResolvedValue([]),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            updateMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        $transaction: vi.fn(),
    });
    let prisma: ReturnType<typeof createPrisma>;
    let repository: ShoppingListRepository;

    beforeEach(() => {
        prisma = createPrisma();
        repository = new ShoppingListRepository(prisma as never);
    });

    it("scopes list reads to the residence and loads actor names", () => {
        repository.findItems("home-1");
        expect(prisma.item_lista_compras.findMany).toHaveBeenCalledWith({
            where: { casa_id: "home-1" },
            include: {
                participacao_item_lista_compras_criado_por: {
                    select: { usuario: { select: { nome: true, apelido: true } } },
                },
                participacao_item_lista_compras_comprado_por: {
                    select: { usuario: { select: { nome: true, apelido: true } } },
                },
            },
            orderBy: [{ status: "asc" }, { id: "asc" }],
        });
    });

    it("scopes a single item lookup to both the residence and item id", () => {
        repository.findItem("home-1", "item-1");
        expect(prisma.item_lista_compras.findFirst).toHaveBeenCalledWith({
            where: { id: "item-1", casa_id: "home-1" },
            include: expect.objectContaining({
                participacao_item_lista_compras_criado_por: expect.any(Object),
                participacao_item_lista_compras_comprado_por: expect.any(Object),
            }),
        });
    });

    it("creates a pending item with creator participation and nullable optional values", () => {
        repository.createItem({
            residenceId: "home-1",
            memberId: "member-1",
            name: "Arroz",
            quantity: null,
            unit: null,
            notes: null,
        });
        expect(prisma.item_lista_compras.create).toHaveBeenCalledWith({
            data: {
                casa_id: "home-1",
                criado_por_participacao_id: "member-1",
                nome: "Arroz",
                quantidade: null,
                unidade: null,
                observacao: null,
            },
            include: expect.any(Object),
        });
    });

    it("updates only supplied fields and increments the version with compare-and-swap", async () => {
        const tx = {
            item_lista_compras: {
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
                findFirst: vi.fn().mockResolvedValue({ id: "item-1", versao: 3 }),
            },
        };
        prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) =>
            callback(tx)
        );

        await repository.updateItem({
            residenceId: "home-1",
            itemId: "item-1",
            version: 2,
            name: "Leite integral",
            notes: null,
        });
        expect(tx.item_lista_compras.updateMany).toHaveBeenCalledWith({
            where: { id: "item-1", casa_id: "home-1", versao: 2 },
            data: { nome: "Leite integral", observacao: null, versao: { increment: 1 } },
        });
        expect(tx.item_lista_compras.findFirst).toHaveBeenCalledWith({
            where: { id: "item-1", casa_id: "home-1" },
            include: expect.any(Object),
        });
    });

    it("distinguishes stale versions from an item that no longer exists", async () => {
        const tx = {
            item_lista_compras: {
                updateMany: vi.fn().mockResolvedValue({ count: 0 }),
                findFirst: vi.fn().mockResolvedValueOnce({ id: "item-1" }),
            },
        };
        prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) =>
            callback(tx)
        );
        await expect(
            repository.updateItem({
                residenceId: "home-1",
                itemId: "item-1",
                version: 1,
                name: "Conflito",
            })
        ).resolves.toEqual({ found: true, item: null });

        tx.item_lista_compras.findFirst.mockResolvedValueOnce(null);
        await expect(
            repository.updateItem({
                residenceId: "home-1",
                itemId: "missing",
                version: 1,
                name: "Não existe",
            })
        ).resolves.toEqual({ found: false, item: null });
    });

    it("sets the purchaser on completion and clears purchase data on reopening", async () => {
        const pending = { id: "item-1", status: "PENDENTE", versao: 1 };
        const completed = { ...pending, status: "COMPRADO", versao: 2 };
        const tx = {
            item_lista_compras: {
                findFirst: vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(completed),
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
        };
        prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) =>
            callback(tx)
        );
        await repository.updateStatus({
            residenceId: "home-1",
            itemId: "item-1",
            version: 1,
            memberId: "member-1",
            status: "COMPRADO" as never,
        });
        expect(tx.item_lista_compras.updateMany).toHaveBeenNthCalledWith(1, {
            where: { id: "item-1", casa_id: "home-1", versao: 1 },
            data: expect.objectContaining({
                status: "COMPRADO",
                comprado_por_participacao_id: "member-1",
                comprado_em: expect.any(Date),
                versao: { increment: 1 },
            }),
        });

        tx.item_lista_compras.findFirst
            .mockResolvedValueOnce(completed)
            .mockResolvedValueOnce(pending);
        await repository.updateStatus({
            residenceId: "home-1",
            itemId: "item-1",
            version: 2,
            memberId: "member-1",
            status: "PENDENTE" as never,
        });
        expect(tx.item_lista_compras.updateMany).toHaveBeenNthCalledWith(2, {
            where: { id: "item-1", casa_id: "home-1", versao: 2 },
            data: {
                status: "PENDENTE",
                comprado_em: null,
                comprado_por_participacao_id: null,
                versao: { increment: 1 },
            },
        });
    });

    it("keeps a repeated status idempotent without incrementing the version", async () => {
        const bought = { id: "item-1", status: "COMPRADO", versao: 7 };
        const tx = {
            item_lista_compras: {
                findFirst: vi.fn().mockResolvedValue(bought),
                updateMany: vi.fn(),
            },
        };
        prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) =>
            callback(tx)
        );
        await expect(
            repository.updateStatus({
                residenceId: "home-1",
                itemId: "item-1",
                version: 1,
                memberId: "member-1",
                status: "COMPRADO" as never,
            })
        ).resolves.toEqual({ found: true, item: bought });
        expect(tx.item_lista_compras.updateMany).not.toHaveBeenCalled();
    });

    it("deletes only when residence, item, and expected version all match", async () => {
        prisma.item_lista_compras.deleteMany.mockResolvedValue({ count: 1 });
        await expect(repository.deleteItem("home-1", "item-1", 4)).resolves.toBe(true);
        expect(prisma.item_lista_compras.deleteMany).toHaveBeenCalledWith({
            where: { id: "item-1", casa_id: "home-1", versao: 4 },
        });
        prisma.item_lista_compras.deleteMany.mockResolvedValueOnce({ count: 0 });
        await expect(repository.deleteItem("home-1", "item-1", 3)).resolves.toBe(false);
    });
});
