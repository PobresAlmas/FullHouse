import { UserRepository } from "./users.repository.js";

describe("UserRepository", () => {
    const prisma: {
        usuario: {
            findMany: ReturnType<typeof vi.fn>;
            findUnique: ReturnType<typeof vi.fn>;
            create: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
        };
    } = {
        usuario: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    };
    const repository = new UserRepository(prisma as never);

    beforeEach(() => vi.clearAllMocks());

    it("lists users", async () => {
        prisma.usuario.findMany.mockResolvedValue([]);
        await repository.findAll();
        expect(prisma.usuario.findMany).toHaveBeenCalledWith();
    });

    it("looks up by email", async () => {
        prisma.usuario.findUnique.mockResolvedValue(null);
        await repository.findByEmail("a@example.com");
        expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
            where: { email: "a@example.com" },
        });
    });

    it("creates and updates user records", async () => {
        const data = {
            nome: "Ana",
            email: "a@example.com",
            senha_hash: "hash",
            codigo_pessoal: "ABC123",
        };
        await repository.create(data);
        expect(prisma.usuario.create).toHaveBeenCalledWith({ data });
        await repository.update("u1", { foto_url: "https://cdn/avatar.png" });
        expect(prisma.usuario.update).toHaveBeenCalledWith({
            where: { id: "u1" },
            data: { foto_url: "https://cdn/avatar.png" },
        });
    });
});
