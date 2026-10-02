import { UserAlreadyExistsException } from './exceptions/user-already-exists.exception.js';
import { CodeGeneratorService } from '../common/utils/code-generator.service.js';
import { Injectable } from "@nestjs/common";
import { PasswordService } from "../crypto/password.service.js";
import { UserRepository } from './users.repository.js';
import { StorageService } from '../storage/storage.service.js';

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

    async create(data: {
        name:string;
        nickname:string;
        email:string;
        password:string;
    }) {
        const userExists = await this.repository.findByEmail(data.email);

        if (userExists)
            throw new UserAlreadyExistsException();

        const passwordHash = await this.passwordService.hash(data.password);
        const code = this.codeGenerator.generate();

        return this.repository.create({
            nome: data.name,
            apelido: data.nickname,
            email: data.email,
            senha_hash: passwordHash,
            codigo_pessoal: code
        })
    }

    async updateAvatar(userId: string, file: Express.Multer.File) {
        const url = await this.storage.upload(file);

        return this.repository.update(userId, { foto_url: url });
    }

    async updatePassword(userId: string, password: string) {
        return this.repository.update(userId, { senha_hash: password });
    }
}
