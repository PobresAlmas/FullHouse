import { UserRepository } from "./users.repository.js";

describe("UserRepository", () => {
  const prisma: {
    usuario: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  } = {
    usuario: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const repository = new UserRepository(prisma as never);
  const transaction = { usuario: { update: vi.fn() } };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(transaction));
  });

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

  it("increments failed logins atomically and sets the lock once the threshold is met", async () => {
    transaction.usuario.update
      .mockResolvedValueOnce({ falhas_login: 4 })
      .mockResolvedValueOnce({
        falhas_login: 5,
        login_bloqueado_ate: new Date(),
      });

    await repository.recordFailedLogin("u1", 5, 15 * 60 * 1000);
    await repository.recordFailedLogin("u1", 5, 15 * 60 * 1000);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(transaction.usuario.update).toHaveBeenNthCalledWith(1, {
      where: { id: "u1" },
      data: { falhas_login: { increment: 1 } },
      select: { falhas_login: true },
    });
    expect(transaction.usuario.update).toHaveBeenNthCalledWith(2, {
      where: { id: "u1" },
      data: { falhas_login: { increment: 1 } },
      select: { falhas_login: true },
    });
    expect(transaction.usuario.update).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: { id: "u1" },
        data: { login_bloqueado_ate: expect.any(Date) },
      }),
    );
  });

  it("clears the failed login count and lock date after a successful login", async () => {
    await repository.clearLoginFailures("u1");

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { falhas_login: 0, login_bloqueado_ate: null },
    });
  });

  it("resets the attempt window only when the stored lock has expired", async () => {
    const now = new Date("2026-11-15T15:00:00.000Z");
    await repository.clearExpiredLoginLock("u1", now);

    expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", login_bloqueado_ate: { lte: now } },
      data: { falhas_login: 0, login_bloqueado_ate: null },
    });
  });
});
