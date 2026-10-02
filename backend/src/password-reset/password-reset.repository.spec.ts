import { PasswordResetRepository } from "./password-reset.repository.js";

describe("PasswordResetRepository", () => {
    const prisma: any = {
        password_reset: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    };
    const repository = new PasswordResetRepository(prisma);

    beforeEach(() => vi.clearAllMocks());

    it("creates a reset record", async () => {
        const data = { usuario_id: "u1", codigo: "123456", expira_em: new Date() };
        prisma.password_reset.create.mockResolvedValue(data);
        await expect(repository.create(data)).resolves.toBe(data);
        expect(prisma.password_reset.create).toHaveBeenCalledWith({ data });
    });

    it("finds only matching unused, unexpired codes", async () => {
        prisma.password_reset.findFirst.mockResolvedValue(null);
        await repository.findValid("u1", "123456");
        expect(prisma.password_reset.findFirst).toHaveBeenCalledWith({
            where: {
                usuario_id: "u1",
                codigo: "123456",
                usado: false,
                expira_em: { gt: expect.any(Date) },
            },
        });
    });

    it("marks a reset as used", async () => {
        prisma.password_reset.update.mockResolvedValue({ id: "r1", usado: true });
        await repository.markUsed("r1");
        expect(prisma.password_reset.update).toHaveBeenCalledWith({
            where: { id: "r1" },
            data: { usado: true },
        });
    });
});
