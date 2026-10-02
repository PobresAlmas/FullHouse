import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { Prisma } from "../generated/prisma/client.js";

@Injectable()
export class UserRepository {
    constructor(private readonly prisma: PrismaService) {}

    findAll() {
        return this.prisma.usuario.findMany();
    }

    findByEmail(email: string) {
        return this.prisma.usuario.findUnique({
            where: { email },
        });
    }

    create(data: {
        nome: string;
        apelido?: string;
        email: string;
        senha_hash: string;
        codigo_pessoal: string;
    }) {
        return this.prisma.usuario.create({ data });
    }

    update(id: string, data: Prisma.usuarioUpdateInput) {
        return this.prisma.usuario.update({
            where: { id },
            data,
        });
    }
}
