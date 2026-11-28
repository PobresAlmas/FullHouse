import { UserAlreadyExistsException } from "./exceptions/user-already-exists.exception.js";
import { UsersService } from "./users.service.js";

describe("UsersService", () => {
  let repository: {
    findAll: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    recordFailedLogin: ReturnType<typeof vi.fn>;
    clearLoginFailures: ReturnType<typeof vi.fn>;
    clearExpiredLoginLock: ReturnType<typeof vi.fn>;
  };
  let password: { hash: ReturnType<typeof vi.fn> };
  let codes: { generate: ReturnType<typeof vi.fn> };
  let storage: { upload: ReturnType<typeof vi.fn> };
  let service: UsersService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn().mockResolvedValue([]),
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "u1" }),
      update: vi.fn().mockResolvedValue({ id: "u1" }),
      recordFailedLogin: vi.fn().mockResolvedValue(undefined),
      clearLoginFailures: vi.fn().mockResolvedValue(undefined),
      clearExpiredLoginLock: vi.fn().mockResolvedValue({ count: 1 }),
    };
    password = { hash: vi.fn().mockResolvedValue("hash") };
    codes = { generate: vi.fn().mockReturnValue("ABC123") };
    storage = { upload: vi.fn().mockResolvedValue("https://cdn/avatar.png") };
    service = new UsersService(
      repository as never,
      password as never,
      codes as never,
      storage as never,
    );
  });

  it("delegates listing and email lookup", async () => {
    await expect(service.findAll()).resolves.toEqual([]);
    await service.findByEmail("a@example.com");
    expect(repository.findByEmail).toHaveBeenCalledWith("a@example.com");
  });

  it("delegates login lockout state changes", async () => {
    const now = new Date();
    await service.recordFailedLogin("u1", 5, 900_000);
    await service.clearLoginFailures("u1");
    await service.clearExpiredLoginLock("u1", now);

    expect(repository.recordFailedLogin).toHaveBeenCalledWith("u1", 5, 900_000);
    expect(repository.clearLoginFailures).toHaveBeenCalledWith("u1");
    expect(repository.clearExpiredLoginLock).toHaveBeenCalledWith("u1", now);
  });

  it("creates a user with a hashed password and generated code", async () => {
    const input = {
      name: "Ana",
      nickname: "Nina",
      email: "a@example.com",
      password: "secret",
    };
    await service.create(input);
    expect(repository.create).toHaveBeenCalledWith({
      nome: "Ana",
      apelido: "Nina",
      email: input.email,
      senha_hash: "hash",
      codigo_pessoal: "ABC123",
    });
  });

  it("rejects duplicate email before hashing or creating", async () => {
    repository.findByEmail.mockResolvedValue({ id: "existing" });
    await expect(
      service.create({
        name: "Ana",
        nickname: "",
        email: "a@example.com",
        password: "secret",
      }),
    ).rejects.toBeInstanceOf(UserAlreadyExistsException);
    expect(password.hash).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("propagates repository failure after hashing", async () => {
    repository.create.mockRejectedValue(new Error("database unavailable"));
    await expect(
      service.create({
        name: "Ana",
        nickname: "",
        email: "a@example.com",
        password: "secret",
      }),
    ).rejects.toThrow("database unavailable");
  });

  it("uploads an avatar then saves its URL", async () => {
    const file = { originalname: "photo.png" };
    await service.updateAvatar("u1", file);
    expect(storage.upload).toHaveBeenCalledWith(file);
    expect(repository.update).toHaveBeenCalledWith("u1", {
      foto_url: "https://cdn/avatar.png",
    });
  });

  it("does not update the avatar if upload fails", async () => {
    storage.upload.mockRejectedValue(new Error("upload failed"));
    await expect(service.updateAvatar("u1", {})).rejects.toThrow(
      "upload failed",
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("updates password hash supplied by caller", async () => {
    await service.updatePassword("u1", "pre-hashed");
    expect(repository.update).toHaveBeenCalledWith("u1", {
      senha_hash: "pre-hashed",
    });
  });
});
