import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PantryService } from "../../../src/pantry/pantry.service.js";

describe("PantryService", () => {
    const member = { id: "member-1", papel: "MORADOR" };
    const residence = { id: "home-1", nome: "Casa", participacao: [member] };
    const record = (overrides: Record<string, unknown> = {}) => ({
        id: "item-1",
        nome: "Arroz",
        categoria: "Grãos",
        propriedade: "COMUNITARIO",
        dono_participacao_id: null,
        unidade: "KG",
        quantidade_minima: null,
        data_validade: new Date("2026-12-31T00:00:00.000Z"),
        participacao_item_despensa_dono_participacao_idToparticipacao: null,
        participacao_item_despensa_criado_por_participacao_idToparticipacao: { id: member.id },
        movimentacao_despensa: [
            { tipo: "ENTRADA", quantidade: 3 },
            { tipo: "CONSUMO", quantidade: 1 },
        ],
        ...overrides,
    });

    let repository: Record<string, ReturnType<typeof vi.fn>>;
    let service: PantryService;

    beforeEach(() => {
        repository = {
            findMembership: vi.fn().mockResolvedValue(residence),
            findMembers: vi
                .fn()
                .mockResolvedValue([
                    { id: member.id, usuario: { nome: "Emilson", apelido: "Emil" } },
                ]),
            findItems: vi.fn().mockResolvedValue([record()]),
            findItem: vi.fn().mockResolvedValue(record()),
            findActiveMember: vi.fn().mockResolvedValue({ id: "member-2" }),
            createItem: vi.fn().mockResolvedValue("item-1"),
            updateItem: vi.fn().mockResolvedValue(undefined),
            countMovements: vi.fn().mockResolvedValue(0),
            createMovement: vi.fn().mockResolvedValue(undefined),
            deleteItem: vi.fn().mockResolvedValue(undefined),
        };
        service = new PantryService(repository as never);
    });

    it("lists household members using their preferred name", async () => {
        await expect(service.findMembers("home-1", "user-1")).resolves.toEqual([
            { id: member.id, name: "Emil" },
        ]);
        expect(repository.findMembers).toHaveBeenCalledWith("home-1");
    });

    it("passes an empty trimmed search as no filter", async () => {
        await service.findItems("home-1", "user-1", "   ");
        expect(repository.findItems).toHaveBeenCalledWith("home-1", member.id, undefined);
    });

    it("limits item searches to the authenticated member's residence and trims the query", async () => {
        await expect(service.findItems("home-1", "user-1", "  arroz  ")).resolves.toMatchObject([
            { id: "item-1", quantity: 2, ownerName: "Casa", expirationDate: "2026-12-31" },
        ]);
        expect(repository.findItems).toHaveBeenCalledWith("home-1", member.id, "arroz");
    });

    it("maps ownership and minimum stock for a privately assigned item", async () => {
        repository.findItems.mockResolvedValue([
            record({
                propriedade: "PRIVADO",
                dono_participacao_id: member.id,
                quantidade_minima: "0.5",
                participacao_item_despensa_dono_participacao_idToparticipacao: {
                    id: member.id,
                    usuario: { nome: "Emilson", apelido: "Emil" },
                },
            }),
        ]);
        await expect(service.findItems("home-1", "user-1")).resolves.toMatchObject([
            {
                property: "PRIVADO",
                ownerMemberId: member.id,
                ownerName: "Emil",
                isMine: true,
                minimumQuantity: 0.5,
            },
        ]);
    });

    it("does not read or create pantry data for a user outside the residence", async () => {
        repository.findMembership.mockResolvedValue(null);
        await expect(service.findItems("home-1", "outsider")).rejects.toBeInstanceOf(
            NotFoundException
        );
        await expect(
            service.createItem("home-1", { property: "COMUNITARIO" } as never, "outsider")
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.findItems).not.toHaveBeenCalled();
        expect(repository.createItem).not.toHaveBeenCalled();
    });

    it("creates a community item with no owner and maps its initial response", async () => {
        const result = await service.createItem(
            "home-1",
            {
                name: "Arroz",
                category: "Grãos",
                property: "COMUNITARIO",
                unit: "KG",
                initialQuantity: 2,
                expirationDate: "2026-12-31",
            } as never,
            "user-1"
        );

        expect(repository.createItem).toHaveBeenCalledWith(
            expect.objectContaining({
                residenceId: "home-1",
                creatorMemberId: member.id,
                ownerMemberId: null,
                expirationDate: new Date("2026-12-31T00:00:00.000Z"),
            })
        );
        expect(result).toMatchObject({ id: "item-1", quantity: 2, isMine: false });
        expect(repository.findActiveMember).not.toHaveBeenCalled();
    });

    it("assigns private items to the authenticated member, ignoring a supplied owner", async () => {
        await service.createItem(
            "home-1",
            {
                name: "Leite",
                category: "Laticínios",
                property: "PRIVADO",
                ownerMemberId: "member-2",
                unit: "UNIDADE",
                initialQuantity: 1,
            } as never,
            "user-1"
        );

        expect(repository.createItem).toHaveBeenCalledWith(
            expect.objectContaining({
                property: "PRIVADO",
                ownerMemberId: member.id,
            })
        );
        expect(repository.findActiveMember).toHaveBeenCalledWith("home-1", member.id);
    });

    it("rejects assigning an item to a member outside the active household", async () => {
        repository.findActiveMember.mockResolvedValue(null);
        await expect(
            service.createItem(
                "home-1",
                {
                    name: "Chocolate",
                    category: "Doces",
                    property: "DONO_ESPECIFICO",
                    ownerMemberId: "foreign-member",
                    unit: "UNIDADE",
                    initialQuantity: 1,
                } as never,
                "user-1"
            )
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.createItem).not.toHaveBeenCalled();
    });

    it("prevents changing the unit after stock movements exist", async () => {
        repository.countMovements.mockResolvedValue(1);
        await expect(
            service.updateItem("home-1", "item-1", { unit: "G" } as never, "user-1")
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.updateItem).not.toHaveBeenCalled();
    });

    it("updates an item, clears an optional expiration date, and keeps a specific owner", async () => {
        repository.findItem
            .mockResolvedValueOnce(
                record({
                    propriedade: "DONO_ESPECIFICO",
                    dono_participacao_id: "member-2",
                    participacao_item_despensa_criado_por_participacao_idToparticipacao: {
                        id: member.id,
                    },
                })
            )
            .mockResolvedValueOnce(
                record({
                    propriedade: "DONO_ESPECIFICO",
                    dono_participacao_id: "member-2",
                    participacao_item_despensa_dono_participacao_idToparticipacao: {
                        id: "member-2",
                        usuario: { nome: "Ana", apelido: null },
                    },
                })
            );

        await expect(
            service.updateItem(
                "home-1",
                "item-1",
                {
                    name: "Arroz integral",
                    expirationDate: null,
                } as never,
                "user-1"
            )
        ).resolves.toMatchObject({
            name: "Arroz",
            ownerMemberId: "member-2",
            ownerName: "Ana",
        });
        expect(repository.updateItem).toHaveBeenCalledWith(
            "item-1",
            expect.objectContaining({
                name: "Arroz integral",
                property: "DONO_ESPECIFICO",
                ownerMemberId: "member-2",
                expirationDate: null,
            })
        );
        expect(repository.findActiveMember).toHaveBeenCalledWith("home-1", "member-2");
    });

    it("forces a private item to remain owned by the authenticated member", async () => {
        repository.findItem
            .mockResolvedValueOnce(
                record({ propriedade: "PRIVADO", dono_participacao_id: member.id })
            )
            .mockResolvedValueOnce(
                record({ propriedade: "PRIVADO", dono_participacao_id: member.id })
            );
        await service.updateItem(
            "home-1",
            "item-1",
            {
                property: "PRIVADO",
                ownerMemberId: "member-2",
            } as never,
            "user-1"
        );
        expect(repository.updateItem).toHaveBeenCalledWith(
            "item-1",
            expect.objectContaining({
                property: "PRIVADO",
                ownerMemberId: member.id,
            })
        );
    });

    it("clears the assigned owner when changing an item to community property", async () => {
        repository.findItem
            .mockResolvedValueOnce(
                record({
                    propriedade: "DONO_ESPECIFICO",
                    dono_participacao_id: "member-2",
                    participacao_item_despensa_criado_por_participacao_idToparticipacao: {
                        id: member.id,
                    },
                })
            )
            .mockResolvedValueOnce(record({ propriedade: "COMUNITARIO" }));
        await service.updateItem(
            "home-1",
            "item-1",
            { property: "COMUNITARIO" } as never,
            "user-1"
        );
        expect(repository.updateItem).toHaveBeenCalledWith(
            "item-1",
            expect.objectContaining({ property: "COMUNITARIO", ownerMemberId: null })
        );
        expect(repository.findActiveMember).not.toHaveBeenCalled();
    });

    it("validates a new owner when reassigning an item", async () => {
        repository.findItem
            .mockResolvedValueOnce(
                record({
                    propriedade: "DONO_ESPECIFICO",
                    dono_participacao_id: "member-2",
                    participacao_item_despensa_criado_por_participacao_idToparticipacao: {
                        id: member.id,
                    },
                })
            )
            .mockResolvedValueOnce(record());
        await service.updateItem(
            "home-1",
            "item-1",
            { property: "DONO_ESPECIFICO", ownerMemberId: "member-3" } as never,
            "user-1"
        );
        expect(repository.findActiveMember).toHaveBeenCalledWith("home-1", "member-3");
        expect(repository.updateItem).toHaveBeenCalledWith(
            "item-1",
            expect.objectContaining({ ownerMemberId: "member-3" })
        );
    });

    it("returns not found when an item is outside the residence or no longer available", async () => {
        repository.findItem.mockResolvedValue(null);
        await expect(
            service.updateItem("home-1", "item-1", {} as never, "user-1")
        ).rejects.toBeInstanceOf(NotFoundException);
        await expect(
            service.createMovement(
                "home-1",
                "item-1",
                {
                    type: "ENTRADA",
                    quantity: 1,
                } as never,
                "user-1"
            )
        ).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.removeItem("home-1", "item-1", "user-1")).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(repository.createMovement).not.toHaveBeenCalled();
        expect(repository.deleteItem).not.toHaveBeenCalled();
    });

    it("prevents another member from updating a private item", async () => {
        repository.findItem.mockResolvedValue(
            record({
                propriedade: "PRIVADO",
                dono_participacao_id: "member-2",
            })
        );
        await expect(
            service.updateItem("home-1", "item-1", { name: "Alterado" } as never, "user-1")
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.updateItem).not.toHaveBeenCalled();
    });

    it("allows household members to move community stock and uses their participation as author", async () => {
        await service.createMovement(
            "home-1",
            "item-1",
            { type: "CONSUMO", quantity: 1 } as never,
            "user-1"
        );
        expect(repository.createMovement).toHaveBeenCalledWith({
            itemId: "item-1",
            memberId: member.id,
            type: "CONSUMO",
            quantity: 1,
        });
    });

    it("allows the assigned owner to consume a specific-owner item", async () => {
        repository.findMembership.mockResolvedValue({
            ...residence,
            participacao: [{ id: "member-2", papel: "MORADOR" }],
        });
        repository.findItem.mockResolvedValue(
            record({
                propriedade: "DONO_ESPECIFICO",
                dono_participacao_id: "member-2",
            })
        );
        await service.createMovement(
            "home-1",
            "item-1",
            {
                type: "DESCARTE",
                quantity: 0.5,
            } as never,
            "user-2"
        );
        expect(repository.createMovement).toHaveBeenCalledWith({
            itemId: "item-1",
            memberId: "member-2",
            type: "DESCARTE",
            quantity: 0.5,
        });
    });

    it("prevents a non-owner from using an individually assigned item", async () => {
        repository.findItem.mockResolvedValue(
            record({
                propriedade: "DONO_ESPECIFICO",
                dono_participacao_id: "member-2",
            })
        );
        await expect(
            service.createMovement(
                "home-1",
                "item-1",
                { type: "CONSUMO", quantity: 1 } as never,
                "user-1"
            )
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.createMovement).not.toHaveBeenCalled();
    });

    it("deletes an item only when the caller is its creator or authorized household manager", async () => {
        repository.findItem.mockResolvedValue(
            record({
                propriedade: "DONO_ESPECIFICO",
                dono_participacao_id: "member-2",
                participacao_item_despensa_criado_por_participacao_idToparticipacao: {
                    id: "member-3",
                },
            })
        );
        await expect(service.removeItem("home-1", "item-1", "user-1")).rejects.toBeInstanceOf(
            ForbiddenException
        );
        expect(repository.deleteItem).not.toHaveBeenCalled();

        repository.findMembership.mockResolvedValue({
            ...residence,
            participacao: [{ id: member.id, papel: "ADMINISTRADOR" }],
        });
        await expect(service.removeItem("home-1", "item-1", "user-1")).resolves.toEqual({
            id: "item-1",
            deleted: true,
        });
        expect(repository.deleteItem).toHaveBeenCalledWith("item-1");
    });

    it("allows the creator to delete a shared item", async () => {
        await expect(service.removeItem("home-1", "item-1", "user-1")).resolves.toEqual({
            id: "item-1",
            deleted: true,
        });
        expect(repository.deleteItem).toHaveBeenCalledWith("item-1");
    });

    it("does not let a non-creator delete a shared item without a manager role", async () => {
        repository.findItem.mockResolvedValue(
            record({
                participacao_item_despensa_criado_por_participacao_idToparticipacao: {
                    id: "member-2",
                },
            })
        );
        await expect(service.removeItem("home-1", "item-1", "user-1")).rejects.toBeInstanceOf(
            ForbiddenException
        );
        expect(repository.deleteItem).not.toHaveBeenCalled();
    });
});
