import { UserAlreadyExistsException } from "./exceptions/user-already-exists.exception.js";
import { UsersService } from "./users.service.js";

describe("UsersService", () => {
    let repository: {
        findAll: ReturnType<typeof vi.fn>;
        findByEmail: ReturnType<typeof vi.fn>;
        findById: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        recordFailedLogin: ReturnType<typeof vi.fn>;
        clearLoginFailures: ReturnType<typeof vi.fn>;
        clearExpiredLoginLock: ReturnType<typeof vi.fn>;
    };
    let password: {
        hash: ReturnType<typeof vi.fn>;
        compare: ReturnType<typeof vi.fn>;
    };
    let codes: { generate: ReturnType<typeof vi.fn> };
    let storage: { upload: ReturnType<typeof vi.fn> };
    let service: UsersService;

    beforeEach(() => {
        repository = {
            findAll: vi.fn().mockResolvedValue([]),
            findByEmail: vi.fn().mockResolvedValue(null),
            findById: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "u1" }),
            update: vi.fn().mockResolvedValue({ id: "u1" }),
            recordFailedLogin: vi.fn().mockResolvedValue(undefined),
            clearLoginFailures: vi.fn().mockResolvedValue(undefined),
            clearExpiredLoginLock: vi.fn().mockResolvedValue({ count: 1 }),
        };
        password = {
            hash: vi.fn().mockResolvedValue("hash"),
            compare: vi.fn().mockResolvedValue(true),
        };
        codes = { generate: vi.fn().mockReturnValue("ABC123") };
        storage = { upload: vi.fn().mockResolvedValue("https://cdn/avatar.png") };
        service = new UsersService(
            repository as never,
            password as never,
            codes as never,
            storage as never
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
        const input = { name: "Ana", nickname: "Nina", email: "a@example.com", password: "secret" };
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
            })
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
            })
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
        await expect(service.updateAvatar("u1", {})).rejects.toThrow("upload failed");
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("updates profile name and clears a blank nickname", async () => {
        repository.findById.mockResolvedValue({
            id: "u1",
            nome: "Ana",
            apelido: "Nina",
            email: "a@example.com",
            senha_hash: "old-hash",
            codigo_pessoal: "ABC123",
            foto_url: null,
            status_moradia: "PROCURANDO",
        });
        repository.update.mockResolvedValue({
            id: "u1",
            nome: "Ana Silva",
            apelido: null,
            email: "a@example.com",
            senha_hash: "old-hash",
            codigo_pessoal: "ABC123",
            foto_url: null,
            status_moradia: "PROCURANDO",
        });

        await service.updateProfile("u1", { name: "Ana Silva", nickname: "" });

        expect(repository.update).toHaveBeenCalledWith("u1", {
            nome: "Ana Silva",
            apelido: null,
        });
        expect(password.compare).not.toHaveBeenCalled();
    });

    it("requires the current password for email or password changes", async () => {
        repository.findById.mockResolvedValue({
            id: "u1",
            email: "a@example.com",
            senha_hash: "old-hash",
        });

        await expect(service.updateProfile("u1", { email: "new@example.com" })).rejects.toThrow(
            "Informe sua senha atual"
        );
        await expect(service.updateProfile("u1", { newPassword: "new-password" })).rejects.toThrow(
            "Informe sua senha atual"
        );

        expect(repository.update).not.toHaveBeenCalled();
    });

    it("verifies the current password before changing email or password", async () => {
        repository.findById.mockResolvedValue({
            id: "u1",
            email: "a@example.com",
            senha_hash: "old-hash",
        });
        password.compare.mockResolvedValue(false);

        await expect(
            service.updateProfile("u1", {
                email: "new@example.com",
                currentPassword: "wrong",
            })
        ).rejects.toThrow("A senha atual está incorreta.");

        expect(repository.update).not.toHaveBeenCalled();
        expect(password.hash).not.toHaveBeenCalled();
    });

    it("updates email and stores only a hashed new password after verification", async () => {
        repository.findById.mockResolvedValue({
            id: "u1",
            nome: "Ana",
            apelido: null,
            email: "a@example.com",
            senha_hash: "old-hash",
            codigo_pessoal: "ABC123",
            foto_url: null,
            status_moradia: "PROCURANDO",
        });
        repository.findByEmail.mockResolvedValue(null);
        repository.update.mockResolvedValue({
            id: "u1",
            nome: "Ana",
            apelido: null,
            email: "new@example.com",
            senha_hash: "hash",
            codigo_pessoal: "ABC123",
            foto_url: null,
            status_moradia: "PROCURANDO",
        });

        await service.updateProfile("u1", {
            email: "new@example.com",
            currentPassword: "old-password",
            newPassword: "new-password",
        });

        expect(password.compare).toHaveBeenCalledWith("old-password", "old-hash");
        expect(password.hash).toHaveBeenCalledWith("new-password");
        expect(repository.update).toHaveBeenCalledWith("u1", {
            email: "new@example.com",
            senha_hash: "hash",
        });
    });

    it("rejects an email already used by another account", async () => {
        repository.findById.mockResolvedValue({
            id: "u1",
            email: "a@example.com",
            senha_hash: "old-hash",
        });
        repository.findByEmail.mockResolvedValue({ id: "u2" });

        await expect(
            service.updateProfile("u1", {
                email: "taken@example.com",
                currentPassword: "old-password",
            })
        ).rejects.toThrow("Usuário já cadastrado");

        expect(repository.update).not.toHaveBeenCalled();
    });

    it("updates password hash supplied by caller", async () => {
        await service.updatePassword("u1", "pre-hashed");
        expect(repository.update).toHaveBeenCalledWith("u1", { senha_hash: "pre-hashed" });
    });
});
