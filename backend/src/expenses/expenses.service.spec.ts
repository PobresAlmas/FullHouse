import { NotFoundException } from "@nestjs/common";
import { ExpensesService } from "./expenses.service.js";

describe("ExpensesService CRUD", () => {
    const memberParticipationId = "member-id";
    const subgroup = {
        casa_id: "home-id",
        membro_subgrupo: [{ participacao_id: memberParticipationId }],
    };
    const dto = {
        description: "Conta de energia",
        amount: "119.87",
        date: "2026-10-11",
        subgroupId: "subgroup-id",
        paymentStatus: "PAID" as const,
    };
    const accessibleExpense = {
        id: "expense-id",
        subgrupo_id: "subgroup-id",
        status: "ABERTA",
        quitada_em: null,
        pago_por_participacao_id: null,
    };
    const mappedExpense = {
        id: "expense-id",
        descricao: "Conta de energia",
        valor_total: { toFixed: () => "119.87" },
        data_vencimento: new Date("2026-10-11T00:00:00.000Z"),
        status: "QUITADA",
        quitada_em: new Date("2026-10-11T00:00:00.000Z"),
        subgrupo: { id: "subgroup-id", nome: "Casa" },
        participacao: { usuario: { nome: "Emilson", apelido: null } },
    };

    let repository: {
        findEditableExpense: ReturnType<typeof vi.fn>;
        findSubgroupForUser: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        softDelete: ReturnType<typeof vi.fn>;
    };
    let service: ExpensesService;

    beforeEach(() => {
        repository = {
            findEditableExpense: vi.fn().mockResolvedValue(accessibleExpense),
            findSubgroupForUser: vi.fn().mockResolvedValue(subgroup),
            update: vi.fn().mockResolvedValue(mappedExpense),
            softDelete: vi.fn().mockResolvedValue(undefined),
        };
        service = new ExpensesService(repository as never);
    });

    it("updates an accessible expense with the selected subgroup and payment state", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-10-11T12:00:00.000Z"));

        await expect(service.update("expense-id", dto, "user-id")).resolves.toMatchObject({
            id: "expense-id",
            paidBy: "Emilson",
            paymentStatus: "PAID",
        });
        expect(repository.findEditableExpense).toHaveBeenCalledWith("expense-id", "user-id");
        expect(repository.findSubgroupForUser).toHaveBeenCalledWith("subgroup-id", "user-id");
        expect(repository.update).toHaveBeenCalledWith(
            "expense-id",
            dto,
            "home-id",
            memberParticipationId,
            new Date("2026-10-11T12:00:00.000Z"),
        );
        vi.useRealTimers();
    });

    it("does not update an expense outside the active membership scope", async () => {
        repository.findEditableExpense.mockResolvedValue(null);

        await expect(service.update("expense-id", dto, "user-id")).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("does not move an expense to a subgroup the user cannot access", async () => {
        repository.findSubgroupForUser.mockResolvedValue(null);

        await expect(service.update("expense-id", dto, "user-id")).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("soft-deletes an accessible expense to preserve related records", async () => {
        await expect(service.remove("expense-id", "user-id")).resolves.toEqual({
            id: "expense-id",
            deleted: true,
        });
        expect(repository.findEditableExpense).toHaveBeenCalledWith("expense-id", "user-id");
        expect(repository.softDelete).toHaveBeenCalledWith("expense-id");
    });
});
