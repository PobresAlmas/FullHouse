import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ShoppingListService } from "../../../src/shopping-list/shopping-list.service.js";

const residenceId = "residence-1";
const userId = "user-1";
const memberId = "participation-1";

function item(overrides: Record<string, unknown> = {}) {
    return {
        id: "item-1",
        casa_id: residenceId,
        nome: "Café",
        quantidade: 1.5,
        unidade: "KG",
        observacao: null,
        status: "PENDENTE",
        criado_por_participacao_id: memberId,
        criado_em: new Date("2026-10-30T10:00:00.000Z"),
        atualizado_em: new Date("2026-10-30T10:00:00.000Z"),
        comprado_por_participacao_id: null,
        comprado_em: null,
        versao: 1,
        participacao_item_lista_compras_criado_por: {
            usuario: { nome: "Morador", apelido: "Ana" },
        },
        participacao_item_lista_compras_comprado_por: null,
        ...overrides,
    };
}

describe("ShoppingListService", () => {
    let repository: Record<string, ReturnType<typeof vi.fn>>;
    let residenceAccess: Record<string, ReturnType<typeof vi.fn>>;
    let service: ShoppingListService;

    beforeEach(() => {
        repository = {
            findItems: vi.fn().mockResolvedValue([]),
            findItem: vi.fn().mockResolvedValue(item()),
            createItem: vi.fn().mockResolvedValue(item()),
            updateItem: vi.fn().mockResolvedValue({ found: true, item: item() }),
            updateStatus: vi.fn().mockResolvedValue({ found: true, item: item() }),
            deleteItem: vi.fn().mockResolvedValue(true),
        };
        residenceAccess = {
            requireMembership: vi.fn().mockResolvedValue({
                residenceId,
                memberId,
                role: "MORADOR",
                creationEditPolicy: "TODOS",
            }),
        };
        service = new ShoppingListService(repository as never, residenceAccess as never);
    });

    it("requires active membership before reading shared items", async () => {
        residenceAccess.requireMembership.mockRejectedValue(new NotFoundException());

        await expect(service.findItems(residenceId, "outsider")).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(repository.findItems).not.toHaveBeenCalled();
    });

    it("sorts pending items newest first and purchased items by latest purchase", async () => {
        repository.findItems.mockResolvedValue([
            item({ id: "bought-old", status: "COMPRADO", comprado_em: new Date("2026-10-01") }),
            item({ id: "pending-old", criado_em: new Date("2026-10-02") }),
            item({ id: "bought-new", status: "COMPRADO", comprado_em: new Date("2026-10-20") }),
            item({ id: "pending-new", criado_em: new Date("2026-10-25") }),
        ]);

        const result = await service.findItems(residenceId, userId);

        expect(result.map((entry) => entry.id)).toEqual([
            "pending-new",
            "pending-old",
            "bought-new",
            "bought-old",
        ]);
    });

    it("maps decimal quantity, actor names, timestamps, and version for clients", async () => {
        repository.findItems.mockResolvedValue([
            item({
                quantidade: "2.125",
                comprado_por_participacao_id: "buyer-1",
                comprado_em: new Date("2026-10-30T12:00:00.000Z"),
                status: "COMPRADO",
                versao: 4,
                participacao_item_lista_compras_comprado_por: {
                    usuario: { nome: "Bianca", apelido: null },
                },
            }),
        ]);

        await expect(service.findItems(residenceId, userId)).resolves.toMatchObject([
            {
                quantity: 2.125,
                status: "COMPRADO",
                createdByName: "Ana",
                purchasedByName: "Bianca",
                purchasedAt: "2026-10-30T12:00:00.000Z",
                version: 4,
            },
        ]);
    });

    it("keeps historical items readable after creator or purchaser participation is unavailable", async () => {
        repository.findItems.mockResolvedValue([
            item({
                status: "COMPRADO",
                comprado_em: new Date("2026-10-30T12:00:00.000Z"),
                participacao_item_lista_compras_criado_por: null,
                participacao_item_lista_compras_comprado_por: null,
            }),
        ]);
        await expect(service.findItems(residenceId, userId)).resolves.toMatchObject([
            { createdByName: null, purchasedByName: null, status: "COMPRADO" },
        ]);
    });

    it("creates an item under the current active participation without linking other modules", async () => {
        await service.createItem(
            residenceId,
            { name: "Leite", quantity: 2, unit: "L", notes: "Integral" } as never,
            userId
        );

        expect(repository.createItem).toHaveBeenCalledWith({
            residenceId,
            memberId,
            name: "Leite",
            quantity: 2,
            unit: "L",
            notes: "Integral",
        });
        expect(residenceAccess.requireMembership).toHaveBeenCalledWith(residenceId, userId);
    });

    it.each([
        { quantity: 1, unit: null },
        { quantity: null, unit: "KG" },
        { quantity: 0, unit: "KG" },
        { quantity: -1, unit: "KG" },
    ])("rejects invalid quantity/unit pair %#", async (input) => {
        await expect(
            service.createItem(residenceId, { name: "Arroz", ...input } as never, userId)
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.createItem).not.toHaveBeenCalled();
    });

    it("returns a specific validation message for each missing quantity/unit partner", async () => {
        await expect(
            service.createItem(residenceId, { name: "Arroz", quantity: 1 } as never, userId)
        ).rejects.toThrow("Selecione a unidade da quantidade informada.");
        await expect(
            service.createItem(residenceId, { name: "Arroz", unit: "KG" } as never, userId)
        ).rejects.toThrow("Informe a quantidade para usar uma unidade.");
    });

    it("accepts quantity and unit both absent", async () => {
        await service.createItem(residenceId, { name: "Sabão" } as never, userId);
        expect(repository.createItem).toHaveBeenCalledWith(
            expect.objectContaining({ quantity: null, unit: null })
        );
    });

    it("edits an item using its expected version and allows clearing optional values", async () => {
        repository.findItem.mockResolvedValue(item({ quantidade: "1.5", unidade: "KG" }));

        await service.updateItem(
            residenceId,
            "item-1",
            { version: 1, quantity: null, unit: null, notes: null } as never,
            userId
        );

        expect(repository.updateItem).toHaveBeenCalledWith({
            residenceId,
            itemId: "item-1",
            version: 1,
            name: undefined,
            quantity: null,
            unit: null,
            notes: null,
        });
    });

    it("rejects a partial update that leaves quantity and unit mismatched", async () => {
        repository.findItem.mockResolvedValue(item({ quantidade: null, unidade: null }));

        await expect(
            service.updateItem(residenceId, "item-1", { version: 1, quantity: 2 } as never, userId)
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.updateItem).not.toHaveBeenCalled();
    });

    it("returns not found for an item from another residence", async () => {
        repository.findItem.mockResolvedValue(null);

        await expect(
            service.updateItem(residenceId, "foreign-item", { version: 1 } as never, userId)
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.updateItem).not.toHaveBeenCalled();
    });

    it("returns a conflict when another member changed an existing item", async () => {
        repository.updateItem.mockResolvedValue({ found: true, item: null });

        await expect(
            service.updateItem(residenceId, "item-1", { version: 1, name: "Novo" } as never, userId)
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it("records the completing member and supports reopening", async () => {
        const purchased = item({
            status: "COMPRADO",
            comprado_por_participacao_id: memberId,
            comprado_em: new Date("2026-10-30T12:00:00.000Z"),
            versao: 2,
            participacao_item_lista_compras_comprado_por: {
                usuario: { nome: "Morador", apelido: "Ana" },
            },
        });
        repository.updateStatus.mockResolvedValueOnce({ found: true, item: purchased });
        await expect(
            service.updateStatus(
                residenceId,
                "item-1",
                { version: 1, status: "COMPRADO" } as never,
                userId
            )
        ).resolves.toMatchObject({ status: "COMPRADO", purchasedByName: "Ana", version: 2 });
        expect(repository.updateStatus).toHaveBeenNthCalledWith(1, {
            residenceId,
            itemId: "item-1",
            version: 1,
            memberId,
            status: "COMPRADO",
        });

        repository.updateStatus.mockResolvedValueOnce({
            found: true,
            item: item({ versao: 3 }),
        });
        await service.updateStatus(
            residenceId,
            "item-1",
            { version: 2, status: "PENDENTE" } as never,
            userId
        );
        expect(repository.updateStatus).toHaveBeenNthCalledWith(2, {
            residenceId,
            itemId: "item-1",
            version: 2,
            memberId,
            status: "PENDENTE",
        });
    });

    it("distinguishes deleted items from stale versions during status transitions", async () => {
        repository.updateStatus.mockResolvedValueOnce({ found: false, item: null });
        await expect(
            service.updateStatus(
                residenceId,
                "deleted-item",
                { version: 1, status: "COMPRADO" } as never,
                userId
            )
        ).rejects.toBeInstanceOf(NotFoundException);

        repository.updateStatus.mockResolvedValueOnce({ found: true, item: null });
        await expect(
            service.updateStatus(
                residenceId,
                "item-1",
                { version: 1, status: "COMPRADO" } as never,
                userId
            )
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it("deletes with a matching version and distinguishes stale from missing items", async () => {
        await expect(service.removeItem(residenceId, "item-1", 3, userId)).resolves.toEqual({
            id: "item-1",
            deleted: true,
        });
        expect(repository.deleteItem).toHaveBeenCalledWith(residenceId, "item-1", 3);

        repository.deleteItem.mockResolvedValueOnce(false);
        repository.findItem.mockResolvedValueOnce(null);
        await expect(service.removeItem(residenceId, "missing", 1, userId)).rejects.toBeInstanceOf(
            NotFoundException
        );

        repository.deleteItem.mockResolvedValueOnce(false);
        repository.findItem.mockResolvedValueOnce(item());
        await expect(service.removeItem(residenceId, "item-1", 1, userId)).rejects.toBeInstanceOf(
            ConflictException
        );
    });
});
