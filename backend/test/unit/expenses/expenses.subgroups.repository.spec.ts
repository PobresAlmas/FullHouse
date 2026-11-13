import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { ExpensesRepository } from "../../../src/expenses/expenses.repository.js";

describe("ExpensesRepository.updateSubgroup", () => {
    const input = {
        homeId: "home-id",
        name: "  Clube do café  ",
        memberIds: ["member-2", "member-3"],
    };

    function setup(overrides?: {
        subgroup?: unknown;
        members?: unknown[];
    }) {
        const tx = {
            subgrupo: {
                findFirst: vi.fn().mockResolvedValue(
                    overrides && Object.hasOwn(overrides, "subgroup")
                        ? overrides.subgroup
                        : {
                        id: "subgroup-id",
                        casa_id: "home-id",
                        criado_por_participacao_id: "creator-participation",
                        participacao: { usuario_id: "creator-user" },
                    }
                ),
                update: vi.fn().mockResolvedValue({}),
            },
            participacao: {
                findMany: vi.fn().mockResolvedValue(
                    overrides?.members ?? [
                        { id: "member-2", usuario: { nome: "Beatriz", apelido: "Bia" } },
                        { id: "member-3", usuario: { nome: "Caio", apelido: null } },
                    ]
                ),
            },
            membro_subgrupo: {
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
                upsert: vi.fn().mockResolvedValue({}),
            },
            casa: { findUniqueOrThrow: vi.fn().mockResolvedValue({ nome: "Casa" }) },
        };
        const transaction = vi.fn((callback: (tx: typeof tx) => unknown) => callback(tx));
        const repository = new ExpensesRepository({ $transaction: transaction } as never);
        return { repository, tx, transaction };
    }

    it("updates the subgroup and replaces only its active participant set", async () => {
        const { repository, tx, transaction } = setup();

        await expect(repository.updateSubgroup("subgroup-id", "creator-user", input)).resolves.toEqual({
            id: "subgroup-id",
            name: "Clube do café",
            homeId: "home-id",
            homeName: "Casa",
            members: ["Bia", "Caio"],
            memberIds: ["member-2", "member-3"],
            memberDetails: [
                { id: "member-2", name: "Bia" },
                { id: "member-3", name: "Caio" },
            ],
            canEdit: true,
        });
        expect(transaction).toHaveBeenCalledOnce();
        expect(tx.subgrupo.update).toHaveBeenCalledWith({
            where: { id: "subgroup-id" },
            data: { nome: "Clube do café" },
        });
        expect(tx.membro_subgrupo.updateMany).toHaveBeenCalledWith({
            where: {
                subgrupo_id: "subgroup-id",
                saiu_em: null,
                participacao_id: { notIn: ["member-2", "member-3"] },
            },
            data: { saiu_em: expect.any(Date) },
        });
        expect(tx.membro_subgrupo.upsert).toHaveBeenCalledTimes(2);
        expect(tx.membro_subgrupo.upsert).toHaveBeenNthCalledWith(1, {
            where: {
                subgrupo_id_participacao_id: {
                    subgrupo_id: "subgroup-id",
                    participacao_id: "member-2",
                },
            },
            create: { subgrupo_id: "subgroup-id", participacao_id: "member-2" },
            update: { saiu_em: null, entrou_em: expect.any(Date) },
        });
        expect(tx.membro_subgrupo.upsert).toHaveBeenNthCalledWith(2, {
            where: {
                subgrupo_id_participacao_id: {
                    subgrupo_id: "subgroup-id",
                    participacao_id: "member-3",
                },
            },
            create: { subgrupo_id: "subgroup-id", participacao_id: "member-3" },
            update: { saiu_em: null, entrou_em: expect.any(Date) },
        });
    });

    it("forbids a non-creator from editing and does not write subgroup members", async () => {
        const { repository, tx } = setup();

        await expect(repository.updateSubgroup("subgroup-id", "other-user", input)).rejects.toBeInstanceOf(
            ForbiddenException
        );
        expect(tx.subgrupo.update).not.toHaveBeenCalled();
        expect(tx.membro_subgrupo.updateMany).not.toHaveBeenCalled();
        expect(tx.membro_subgrupo.upsert).not.toHaveBeenCalled();
    });

    it("returns not found when the subgroup or active residence is unavailable", async () => {
        const { repository, tx } = setup({ subgroup: null });

        await expect(repository.updateSubgroup("subgroup-id", "creator-user", input)).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(tx.participacao.findMany).not.toHaveBeenCalled();
    });

    it("does not transfer a subgroup to another residence", async () => {
        const { repository, tx } = setup();

        await expect(
            repository.updateSubgroup("subgroup-id", "creator-user", {
                ...input,
                homeId: "another-home",
            })
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(tx.subgrupo.update).not.toHaveBeenCalled();
    });

    it("rejects participants who are inactive or belong to another residence", async () => {
        const { repository, tx } = setup({
            members: [{ id: "member-2", usuario: { nome: "Beatriz", apelido: null } }],
        });

        await expect(repository.updateSubgroup("subgroup-id", "creator-user", input)).rejects.toThrow(
            "Selecione somente moradores ativos desta residência."
        );
        expect(tx.subgrupo.update).not.toHaveBeenCalled();
        expect(tx.membro_subgrupo.updateMany).not.toHaveBeenCalled();
    });
});
