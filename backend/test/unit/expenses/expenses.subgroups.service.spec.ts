import { BadRequestException } from "@nestjs/common";
import { ExpensesService } from "../../../src/expenses/expenses.service.js";

describe("ExpensesService subgroups", () => {
    const subgroupData = {
        homeId: "home-id",
        name: "Café",
        memberIds: ["member-1", "member-2"],
    };
    const makeGroup = (creatorUserId = "creator-user") => ({
        id: "subgroup-id",
        nome: "Café",
        casa: { id: "home-id", nome: "Casa" },
        participacao: { usuario_id: creatorUserId },
        membro_subgrupo: [
            {
                participacao_id: "member-1",
                participacao: { usuario: { nome: "Ana", apelido: "Aninha" } },
            },
            {
                participacao_id: "member-2",
                participacao: { usuario: { nome: "Bruno", apelido: null } },
            },
        ],
    });

    let repository: {
        createSubgroup: ReturnType<typeof vi.fn>;
        updateSubgroup: ReturnType<typeof vi.fn>;
        findAvailableSubgroups: ReturnType<typeof vi.fn>;
        findAllSubgroupsForUser: ReturnType<typeof vi.fn>;
        findSubgroupForUser: ReturnType<typeof vi.fn>;
        findHomeForUser: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
    };
    let residenceAccess: { requireMembership: ReturnType<typeof vi.fn> };
    let service: ExpensesService;

    beforeEach(() => {
        repository = {
            createSubgroup: vi.fn().mockResolvedValue({ id: "subgroup-id", name: "Café" }),
            updateSubgroup: vi.fn().mockResolvedValue({ id: "subgroup-id", name: "Café novo" }),
            findAvailableSubgroups: vi.fn().mockResolvedValue([makeGroup()]),
            findAllSubgroupsForUser: vi.fn().mockResolvedValue([makeGroup()]),
            findSubgroupForUser: vi.fn().mockResolvedValue({
                casa_id: "home-id",
                membro_subgrupo: [{ participacao_id: "member-1" }],
            }),
            findHomeForUser: vi.fn().mockResolvedValue({
                id: "home-id",
                participacao: [{ id: "member-1" }],
            }),
            create: vi.fn().mockResolvedValue({
                id: "expense-id",
                descricao: "Conta compartilhada",
                valor_total: { toFixed: () => "80.00" },
                data_vencimento: new Date("2026-11-01T00:00:00.000Z"),
                status: "ABERTA",
                estrategia_rateio: "IGUALITARIO",
                subgrupo: { id: "subgroup-id", nome: "Café" },
                participacao: null,
                quitada_em: null,
            }),
        };
        residenceAccess = {
            requireMembership: vi.fn().mockResolvedValue({ memberId: "creator-participation" }),
        };
        service = new ExpensesService(
            repository as never,
            residenceAccess as never,
            { upload: vi.fn() } as never
        );
    });

    it("creates a subgroup using the creator's active residence participation", async () => {
        await expect(service.createSubgroup(subgroupData, "creator-user")).resolves.toEqual({
            id: "subgroup-id",
            name: "Café",
        });
        expect(residenceAccess.requireMembership).toHaveBeenCalledWith("home-id", "creator-user");
        expect(repository.createSubgroup).toHaveBeenCalledWith(
            subgroupData,
            "creator-participation"
        );
    });

    it.each([
        ["no members", []],
        ["duplicate members", ["member-1", "member-1"]],
    ])("rejects subgroup creation with %s", async (_label, memberIds) => {
        await expect(
            service.createSubgroup({ ...subgroupData, memberIds }, "creator-user")
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.createSubgroup).not.toHaveBeenCalled();
        expect(residenceAccess.requireMembership).not.toHaveBeenCalled();
    });

    it("lists accessible subgroups with participant IDs and display names", async () => {
        await expect(service.findAvailableSubgroups("member-user")).resolves.toMatchObject([
            {
                id: "subgroup-id",
                homeId: "home-id",
                members: ["Aninha", "Bruno"],
                memberIds: ["member-1", "member-2"],
                memberDetails: [
                    { id: "member-1", name: "Aninha" },
                    { id: "member-2", name: "Bruno" },
                ],
            },
        ]);
        expect(repository.findAvailableSubgroups).toHaveBeenCalledWith("member-user");
    });

    it("exposes subgroup editing only to the creator", async () => {
        repository.findAllSubgroupsForUser.mockResolvedValue([
            makeGroup("member-user"),
            makeGroup("another-user"),
        ]);

        const result = await service.findAllSubgroups("member-user");

        expect(result.map((group) => group.canEdit)).toEqual([true, false]);
        expect(repository.findAllSubgroupsForUser).toHaveBeenCalledWith("member-user");
    });

    it("updates a subgroup after validating its participant list", async () => {
        const update = { ...subgroupData, name: "Café e chá" };

        await expect(service.updateSubgroup("subgroup-id", update, "creator-user")).resolves.toEqual({
            id: "subgroup-id",
            name: "Café novo",
        });
        expect(repository.updateSubgroup).toHaveBeenCalledWith(
            "subgroup-id",
            "creator-user",
            update
        );
    });

    it("allows multiple separate expenses to use the same subgroup", async () => {
        const energy = {
            ...subgroupData,
            description: "Energia",
            amount: "80.00",
            date: "2026-11-01",
            paymentStatus: "PENDING" as const,
            subgroupId: "subgroup-id",
        };
        const internet = {
            ...energy,
            description: "Internet",
        };

        await service.create(energy, "member-user");
        await service.create(internet, "member-user");

        expect(repository.create).toHaveBeenCalledTimes(2);
        expect(repository.create).toHaveBeenNthCalledWith(1, energy, "home-id", "member-1");
        expect(repository.create).toHaveBeenNthCalledWith(2, internet, "home-id", "member-1");
    });

    it.each([
        ["empty", []],
        ["duplicated", ["member-1", "member-1"]],
    ])("rejects subgroup updates with %s participants", async (_label, memberIds) => {
        await expect(
            service.updateSubgroup("subgroup-id", { ...subgroupData, memberIds }, "creator-user")
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.updateSubgroup).not.toHaveBeenCalled();
    });
});
