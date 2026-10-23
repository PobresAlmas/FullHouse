import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ExpensesService } from "../../../src/expenses/expenses.service.js";

describe("ExpensesService CRUD", () => {
    const memberParticipationId = "member-id";
    const home = { id: "home-id", participacao: [{ id: memberParticipationId }] };
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
        casa_id: "home-id",
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
        findAvailableHomes: ReturnType<typeof vi.fn>;
        findHomeForUser: ReturnType<typeof vi.fn>;
        findSubgroupForUser: ReturnType<typeof vi.fn>;
        findForUser: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        softDelete: ReturnType<typeof vi.fn>;
    };
    let service: ExpensesService;

    beforeEach(() => {
        repository = {
            findEditableExpense: vi.fn().mockResolvedValue(accessibleExpense),
            findAvailableHomes: vi.fn().mockResolvedValue([{ id: "home-id", nome: "Grifinória" }]),
            findHomeForUser: vi.fn().mockResolvedValue(home),
            findSubgroupForUser: vi.fn().mockResolvedValue(subgroup),
            findForUser: vi.fn().mockResolvedValue([mappedExpense]),
            create: vi.fn().mockResolvedValue(mappedExpense),
            update: vi.fn().mockResolvedValue(mappedExpense),
            softDelete: vi.fn().mockResolvedValue(undefined),
        };
        service = new ExpensesService(repository as never);
    });

    it("updates an accessible expense and preserves the paid status", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-10-11T12:00:00.000Z"));
        try {
            await expect(service.update("expense-id", dto, "user-id")).resolves.toMatchObject({
                id: "expense-id",
                paidBy: "Emilson",
                paymentStatus: "PAID",
            });
            expect(repository.update).toHaveBeenCalledWith(
                "expense-id",
                dto,
                "home-id",
                memberParticipationId,
                new Date("2026-10-11T12:00:00.000Z")
            );
        } finally {
            vi.useRealTimers();
        }
    });

    it("does not update an expense outside the active residence membership", async () => {
        repository.findEditableExpense.mockResolvedValue(null);

        await expect(service.update("expense-id", dto, "user-id")).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("does not move an expense to a subgroup the user cannot access", async () => {
        repository.findSubgroupForUser.mockResolvedValue(null);

        await expect(service.update("expense-id", dto, "user-id")).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("does not create an expense in a subgroup the user cannot access", async () => {
        repository.findSubgroupForUser.mockResolvedValue(null);

        await expect(service.create(dto, "user-id")).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("creates an expense in the explicitly selected residence without a subgroup", async () => {
        const body = {
            description: "Conta de energia",
            amount: "119.87",
            date: "2026-10-11",
            subgroupId: null,
            homeId: "home-id",
            paymentStatus: "PENDING" as const,
        };

        await expect(service.create(body, "user-id")).resolves.toMatchObject({
            id: "expense-id",
        });
        expect(repository.findHomeForUser).toHaveBeenCalledWith("home-id", "user-id");
        expect(repository.create).toHaveBeenCalledWith(body, "home-id", memberParticipationId);
        expect(repository.findSubgroupForUser).not.toHaveBeenCalled();
    });

    it("requires a selected residence when creating an expense without a subgroup", async () => {
        const body = { ...dto, subgroupId: null };

        await expect(service.create(body, "user-id")).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.findAvailableHomes).not.toHaveBeenCalled();
        expect(repository.findHomeForUser).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("uses the subgroup's residence when creating an expense", async () => {
        await expect(service.create(dto, "user-id")).resolves.toMatchObject({
            id: "expense-id",
        });
        expect(repository.findHomeForUser).toHaveBeenCalledWith("home-id", "user-id");
        expect(repository.create).toHaveBeenCalledWith(dto, "home-id", memberParticipationId);
    });

    it("uses the subgroup residence and rejects a conflicting selected residence", async () => {
        const body = { ...dto, homeId: "another-home-id" };

        await expect(service.create(body, "user-id")).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.findHomeForUser).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("passes an optional status filter to the repository", async () => {
        await service.findAll("user-id", "PENDING");
        expect(repository.findForUser).toHaveBeenCalledWith("user-id", "PENDING");
    });

    it("maps listed expenses to the public response shape", async () => {
        repository.findForUser.mockResolvedValue([
            {
                ...mappedExpense,
                status: "ABERTA",
                quitada_em: null,
                subgrupo: null,
                casa_id: "home-id",
                casa: { nome: "Grifinória" },
                participacao: null,
            },
        ]);

        await expect(service.findAll("user-id")).resolves.toEqual([
            {
                id: "expense-id",
                description: "Conta de energia",
                amount: "119.87",
                date: "2026-10-11",
                homeId: "home-id",
                homeName: "Grifinória",
                subgroup: null,
                paidBy: null,
                paidAt: null,
                paymentStatus: "PENDING",
            },
        ]);
    });

    it("clears payment metadata when changing a paid expense back to pending", async () => {
        repository.findEditableExpense.mockResolvedValue({
            ...accessibleExpense,
            status: "QUITADA",
            quitada_em: new Date("2026-10-10T12:00:00.000Z"),
            pago_por_participacao_id: memberParticipationId,
        });
        const pendingDto = { ...dto, paymentStatus: "PENDING" as const };

        await service.update("expense-id", pendingDto, "user-id");

        expect(repository.update).toHaveBeenCalledWith(
            "expense-id",
            pendingDto,
            "home-id",
            null,
            null
        );
    });

    it("soft-deletes an accessible expense to preserve related records", async () => {
        await expect(service.remove("expense-id", "user-id")).resolves.toEqual({
            id: "expense-id",
            deleted: true,
        });
        expect(repository.softDelete).toHaveBeenCalledWith("expense-id");
    });

    it("does not delete an expense outside the active residence membership", async () => {
        repository.findEditableExpense.mockResolvedValue(null);

        await expect(service.remove("expense-id", "user-id")).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(repository.softDelete).not.toHaveBeenCalled();
    });
});
