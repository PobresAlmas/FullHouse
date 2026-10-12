import { PetsRepository } from "./pets.repository.js";

describe("PetsRepository", () => {
    let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
    let repository: PetsRepository;

    beforeEach(() => {
        prisma = {
            casa: { findMany: vi.fn(), findFirst: vi.fn() },
            participacao: { findMany: vi.fn(), findFirst: vi.fn() },
            pet: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
            cuidado_pet: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
            despesa: { findFirst: vi.fn() },
        };
        repository = new PetsRepository(prisma as never);
    });

    it("limits residence discovery to active memberships in active homes", () => {
        repository.findResidencesForUser("user-1");
        expect(prisma.casa.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                status: "ATIVA",
                excluido_em: null,
                participacao: { some: { usuario_id: "user-1", data_saida: null } },
            }),
        }));
    });

    it("orders pet care history newest first", () => {
        repository.findPetCareLogs("pet-1", {});
        expect(prisma.cuidado_pet.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { pet_id: "pet-1" },
            orderBy: [{ data_cuidado: "desc" }, { criado_em: "desc" }],
        }));
    });

    it("checks that linked expenses belong to the same active residence", () => {
        repository.findResidenceExpense("residence-1", "expense-1");
        expect(prisma.despesa.findFirst).toHaveBeenCalledWith({
            where: { id: "expense-1", casa_id: "residence-1", status: { not: "CANCELADA" } },
            select: { id: true },
        });
    });
});
