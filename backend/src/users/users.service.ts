import { UserAlreadyExistsException } from "./exceptions/user-already-exists.exception.js";
import { CodeGeneratorService } from "../common/utils/code-generator.service.js";
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { PasswordService } from "../crypto/password.service.js";
import { UserRepository } from "./users.repository.js";
import { StorageService } from "../storage/storage.service.js";
import { toUserResponse } from "./users.mapper.js";
import { UpdateProfileDto } from "./dto/update-profile.dto.js";

@Injectable()
export class UsersService {
    constructor(
        private readonly repository: UserRepository,
        private readonly passwordService: PasswordService,
        private readonly codeGenerator: CodeGeneratorService,
        private readonly storage: StorageService
    ) {}

    async findAll() {
        return this.repository.findAll();
    }

    async findByEmail(email: string) {
        return this.repository.findByEmail(email);
    }

    async findById(userId: string) {
        const user = await this.repository.findById(userId);
        if (!user) throw new NotFoundException("Usuário não encontrado.");
        return user;
    }

    async getProfile(userId: string) {
        return toUserResponse(await this.findById(userId));
    }

    async updateProfile(userId: string, data: UpdateProfileDto) {
        const user = await this.findById(userId);
        const email = data.email?.trim();
        const emailChanged = Boolean(email && email.toLowerCase() !== user.email.toLowerCase());
        const passwordChanged = data.newPassword !== undefined;
        const requiresCurrentPassword = emailChanged || passwordChanged;
        const currentPassword = data.currentPassword;

        if (requiresCurrentPassword) {
            if (!currentPassword) {
                throw new BadRequestException(
                    "Informe sua senha atual para alterar o e-mail ou a senha."
                );
            }
            if (!(await this.passwordService.compare(currentPassword, user.senha_hash))) {
                throw new UnauthorizedException("A senha atual está incorreta.");
            }
        }

        if (emailChanged) {
            const existing = await this.repository.findByEmail(email!);
            if (existing && existing.id !== userId) throw new UserAlreadyExistsException();
        }

        const update: {
            nome?: string;
            apelido?: string | null;
            email?: string;
            senha_hash?: string;
        } = {};
        if (data.name !== undefined) update.nome = data.name;
        if (data.nickname !== undefined) update.apelido = data.nickname || null;
        if (emailChanged) update.email = email;
        if (passwordChanged) update.senha_hash = await this.passwordService.hash(data.newPassword!);

        if (Object.keys(update).length === 0) {
            throw new BadRequestException("Informe pelo menos uma alteração no perfil.");
        }

        try {
            return toUserResponse(await this.repository.update(userId, update));
        } catch (error: unknown) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "P2002"
            ) {
                throw new ConflictException("Este e-mail já está em uso.");
            }
            throw error;
        }
    recordFailedLogin(userId: string, maxAttempts: number, lockDurationMs: number) {
        return this.repository.recordFailedLogin(userId, maxAttempts, lockDurationMs);
    }

    clearLoginFailures(userId: string) {
        return this.repository.clearLoginFailures(userId);
    }

    clearExpiredLoginLock(userId: string, now: Date) {
        return this.repository.clearExpiredLoginLock(userId, now);
    }

    async create(data: { name: string; nickname: string; email: string; password: string }) {
        const userExists = await this.repository.findByEmail(data.email);

        if (userExists) throw new UserAlreadyExistsException();

        const passwordHash = await this.passwordService.hash(data.password);
        const code = this.codeGenerator.generate();

        return this.repository.create({
            nome: data.name,
            apelido: data.nickname,
            email: data.email,
            senha_hash: passwordHash,
            codigo_pessoal: code,
        });
    }

    async updateAvatar(userId: string, file: Express.Multer.File) {
        const url = await this.storage.upload(file);

        return toUserResponse(await this.repository.update(userId, { foto_url: url }));
    }

    async updatePassword(userId: string, password: string) {
        return this.repository.update(userId, { senha_hash: password });
    }
}
