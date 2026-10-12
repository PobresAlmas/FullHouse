import { BadRequestException } from "@nestjs/common";
import { PantryRepository } from "./pantry.repository.js";

describe("PantryRepository", () => {
    type MockFunction = ReturnType<typeof vi.fn>;
    let prisma: {
        casa: { findFirst: MockFunction };
        participacao: { findMany: MockFunction; findFirst: MockFunction };
        item_despensa: {
            findMany: MockFunction;
            findFirst: MockFunction;
            create: MockFunction;
            update: MockFunction;
            delete: MockFunction;
        };
        movimentacao_despensa: { groupBy: MockFunction; count: MockFunction };
        $transaction: MockFunction;
    };
    let repository: PantryRepository;

    beforeEach(() => {
        prisma = {
            casa: { findFirst: vi.fn() },
            participacao: { findMany: vi.fn(), findFirst: vi.fn() },
            item_despensa: {
                findMany: vi.fn().mockResolvedValue([]),
                findFirst: vi.fn().mockResolvedValue(null),
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            movimentacao_despensa: { groupBy: vi.fn().mockResolvedValue([]), count: vi.fn() },
            $transaction: vi.fn(),
        };
        repository = new PantryRepository(prisma as never);
    });

    it("scopes membership lookup to an active, non-deleted home and current user", () => {
        repository.findMembership("home-1", "user-1");
        expect(prisma.casa.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: "home-1",
                    status: "ATIVA",
                    excluido_em: null,
                    participacao: { some: { usuario_id: "user-1", data_saida: null } },
                },
            })
        );
    });

    it("lists only active household members in stable name order", () => {
        repository.findMembers("home-1");
        expect(prisma.participacao.findMany).toHaveBeenCalledWith({
            where: { casa_id: "home-1", data_saida: null },
            select: { id: true, usuario: { select: { nome: true, apelido: true } } },
            orderBy: [{ usuario: { nome: "asc" } }, { id: "asc" }],
        });
    });

    it("filters private items to their owner and searches name or category", async () => {
        prisma.item_despensa.findMany.mockResolvedValue([
            { id: "item-1", nome: "Arroz", categoria: "Grãos" },
        ]);
        prisma.movimentacao_despensa.groupBy.mockResolvedValue([
            { item_despensa_id: "item-1", tipo: "ENTRADA", _sum: { quantidade: 2 } },
        ]);

        const items = await repository.findItems("home-1", "member-1", "arroz");
        const query = prisma.item_despensa.findMany.mock.calls[0][0];
        expect(query.where).toMatchObject({
            casa_id: "home-1",
            OR: [
                { propriedade: { not: "PRIVADO" } },
                { propriedade: "PRIVADO", dono_participacao_id: "member-1" },
            ],
            AND: [
                {
                    OR: [
                        { nome: { contains: "arroz", mode: "insensitive" } },
                        { categoria: { contains: "arroz", mode: "insensitive" } },
                    ],
                },
            ],
        });
        expect(items[0].movimentacao_despensa).toEqual([{ tipo: "ENTRADA", quantidade: 2 }]);
        expect(prisma.movimentacao_despensa.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({
                by: ["item_despensa_id", "tipo"],
                where: { item_despensa_id: { in: ["item-1"] } },
            })
        );
    });

    it("does not query movement totals when no items match", async () => {
        await expect(repository.findItems("home-1", "member-1")).resolves.toEqual([]);
        expect(prisma.movimentacao_despensa.groupBy).not.toHaveBeenCalled();
    });

    it("does not return a private item to a different member", async () => {
        await expect(repository.findItem("home-1", "item-1", "member-1")).resolves.toBeNull();
        expect(prisma.item_despensa.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    id: "item-1",
                    casa_id: "home-1",
                    OR: [
                        { propriedade: { not: "PRIVADO" } },
                        { propriedade: "PRIVADO", dono_participacao_id: "member-1" },
                    ],
                }),
            })
        );
        expect(prisma.movimentacao_despensa.groupBy).not.toHaveBeenCalled();
    });

    it("aggregates item movements and treats a null aggregate as zero", async () => {
        prisma.item_despensa.findFirst.mockResolvedValue({ id: "item-1", nome: "Arroz" });
        prisma.movimentacao_despensa.groupBy.mockResolvedValue([
            { tipo: "ENTRADA", _sum: { quantidade: 2 } },
            { tipo: "CONSUMO", _sum: { quantidade: null } },
        ]);

        await expect(repository.findItem("home-1", "item-1", "member-1")).resolves.toMatchObject({
            movimentacao_despensa: [
                { tipo: "ENTRADA", quantidade: 2 },
                { tipo: "CONSUMO", quantidade: 0 },
            ],
        });
        expect(prisma.movimentacao_despensa.groupBy).toHaveBeenCalledWith({
            by: ["tipo"],
            where: { item_despensa_id: "item-1" },
            _sum: { quantidade: true },
        });
    });

    it("checks active household membership and counts item movements", () => {
        repository.findActiveMember("home-1", "member-1");
        repository.countMovements("item-1");
        expect(prisma.participacao.findFirst).toHaveBeenCalledWith({
            where: { id: "member-1", casa_id: "home-1", data_saida: null },
            select: { id: true },
        });
        expect(prisma.movimentacao_despensa.count).toHaveBeenCalledWith({
            where: { item_despensa_id: "item-1" },
        });
    });

    it("creates an item and its opening stock in one transaction", async () => {
        const tx = {
            item_despensa: { create: vi.fn().mockResolvedValue({ id: "item-1" }) },
            movimentacao_despensa: { create: vi.fn().mockResolvedValue({ id: "movement-1" }) },
        };
        prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) =>
            callback(tx)
        );

        await expect(
            repository.createItem({
                residenceId: "home-1",
                creatorMemberId: "member-1",
                name: "Arroz",
                category: "Grãos",
                property: "COMUNITARIO" as never,
                ownerMemberId: null,
                unit: "KG" as never,
                minimumQuantity: null,
                expirationDate: null,
                initialQuantity: 2,
            })
        ).resolves.toBe("item-1");
        expect(prisma.$transaction).toHaveBeenCalledOnce();
        expect(tx.item_despensa.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                casa_id: "home-1",
                criado_por_participacao_id: "member-1",
                dono_participacao_id: null,
            }),
        });
        expect(tx.movimentacao_despensa.create).toHaveBeenCalledWith({
            data: {
                item_despensa_id: "item-1",
                tipo: "ENTRADA",
                quantidade: 2,
                participacao_id: "member-1",
            },
        });
    });

    it("does not create an opening movement for zero initial stock", async () => {
        const tx = {
            item_despensa: { create: vi.fn().mockResolvedValue({ id: "item-1" }) },
            movimentacao_despensa: { create: vi.fn() },
        };
        prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) =>
            callback(tx)
        );
        await repository.createItem({
            residenceId: "home-1",
            creatorMemberId: "member-1",
            name: "Arroz",
            category: "Grãos",
            property: "COMUNITARIO" as never,
            ownerMemberId: null,
            unit: "KG" as never,
            minimumQuantity: null,
            expirationDate: null,
            initialQuantity: 0,
        });
        expect(tx.movimentacao_despensa.create).not.toHaveBeenCalled();
    });

    it("locks an item and rejects a movement larger than available stock", async () => {
        const tx = {
            $queryRaw: vi.fn().mockResolvedValue([{ id: "item-1" }]),
            movimentacao_despensa: {
                groupBy: vi.fn().mockResolvedValue([
                    { tipo: "ENTRADA", _sum: { quantidade: 3 } },
                    { tipo: "CONSUMO", _sum: { quantidade: 1 } },
                ]),
                create: vi.fn(),
            },
        };
        prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) =>
            callback(tx)
        );

        await expect(
            repository.createMovement({
                itemId: "item-1",
                memberId: "member-1",
                type: "CONSUMO" as never,
                quantity: 3,
            })
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(tx.$queryRaw).toHaveBeenCalledOnce();
        expect(tx.movimentacao_despensa.create).not.toHaveBeenCalled();
    });

    it("persists valid stock movements and maps updates only to provided fields", async () => {
        const tx = {
            $queryRaw: vi.fn().mockResolvedValue([]),
            movimentacao_despensa: { groupBy: vi.fn().mockResolvedValue([]), create: vi.fn() },
        };
        prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) =>
            callback(tx)
        );
        await repository.createMovement({
            itemId: "item-1",
            memberId: "member-1",
            type: "ENTRADA" as never,
            quantity: 2,
        });
        expect(tx.movimentacao_despensa.groupBy).not.toHaveBeenCalled();
        expect(tx.movimentacao_despensa.create).toHaveBeenCalledWith({
            data: {
                item_despensa_id: "item-1",
                participacao_id: "member-1",
                tipo: "ENTRADA",
                quantidade: 2,
            },
        });

        repository.updateItem("item-1", { name: "Novo nome", minimumQuantity: null });
        expect(prisma.item_despensa.update).toHaveBeenCalledWith({
            where: { id: "item-1" },
            data: { nome: "Novo nome", quantidade_minima: null },
        });
    });

    it("allows a valid consumption after checking the net stock under the item lock", async () => {
        const tx = {
            $queryRaw: vi.fn().mockResolvedValue([]),
            movimentacao_despensa: {
                groupBy: vi.fn().mockResolvedValue([
                    { tipo: "ENTRADA", _sum: { quantidade: "4" } },
                    { tipo: "CONSUMO", _sum: { quantidade: "1" } },
                ]),
                create: vi.fn(),
            },
        };
        prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) =>
            callback(tx)
        );

        await repository.createMovement({
            itemId: "item-1",
            memberId: "member-1",
            type: "CONSUMO" as never,
            quantity: 3,
        });
        expect(tx.$queryRaw).toHaveBeenCalledOnce();
        expect(tx.movimentacao_despensa.groupBy).toHaveBeenCalledOnce();
        expect(tx.movimentacao_despensa.create).toHaveBeenCalledWith({
            data: {
                item_despensa_id: "item-1",
                participacao_id: "member-1",
                tipo: "CONSUMO",
                quantidade: 3,
            },
        });
    });

    it("maps every provided update field, including explicit nulls", () => {
        const expirationDate = new Date("2026-12-31T00:00:00.000Z");
        repository.updateItem("item-1", {
            name: "Feijão",
            category: "Grãos",
            property: "PRIVADO" as never,
            ownerMemberId: null,
            unit: "KG" as never,
            minimumQuantity: 0,
            expirationDate,
        });
        expect(prisma.item_despensa.update).toHaveBeenCalledWith({
            where: { id: "item-1" },
            data: {
                nome: "Feijão",
                categoria: "Grãos",
                propriedade: "PRIVADO",
                dono_participacao_id: null,
                unidade: "KG",
                quantidade_minima: 0,
                data_validade: expirationDate,
            },
        });
    });

    it("deletes an item by its identifier", () => {
        repository.deleteItem("item-1");
        expect(prisma.item_despensa.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
    });
});
