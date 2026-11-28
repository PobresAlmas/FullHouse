import { PasswordResetRepository } from "./password-reset.repository.js";

describe("PasswordResetRepository", () => {
  const prisma: {
    password_reset: {
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  } = {
    password_reset: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  };
  const repository = new PasswordResetRepository(prisma as never);
  const transaction = {
    password_reset: { updateMany: vi.fn() },
    usuario: { update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(transaction));
    transaction.password_reset.updateMany.mockResolvedValue({ count: 1 });
  });

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

  it("consumes a valid reset, updates the password, and clears login lockout atomically", async () => {
    await repository.consumeAndUpdatePassword("r1", "u1", "new-hash");

    expect(transaction.password_reset.updateMany).toHaveBeenCalledWith({
      where: {
        id: "r1",
        usuario_id: "u1",
        usado: false,
        expira_em: { gt: expect.any(Date) },
      },
      data: { usado: true },
    });
    expect(transaction.usuario.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        senha_hash: "new-hash",
        falhas_login: 0,
        login_bloqueado_ate: null,
      },
    });
  });

  it("does not update the password or lockout when the reset code is expired", async () => {
    transaction.password_reset.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.consumeAndUpdatePassword("r1", "u1", "new-hash"),
    ).rejects.toThrow("Código inválido ou expirado.");
    expect(transaction.usuario.update).not.toHaveBeenCalled();
  });
});
