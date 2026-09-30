import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";


@Injectable()
export class PasswordResetRepository {

    constructor(
        private readonly prisma: PrismaService
    ) {}


    create(data: {
        usuario_id: string;
        codigo: string;
        expira_em: Date;
    }) {
        return this.prisma.password_reset.create({
            data
        });
    }

    findValid(
        usuario_id: string,
        codigo: string
    ) {
        return this.prisma.password_reset.findFirst({
            where: {
                usuario_id,
                codigo,
                usado: false,
                expira_em: {
                    gt: new Date()
                }
            }
        });
    }

    markUsed(id:string) {
        return this.prisma.password_reset.update({
            where:{
                id
            },
            data:{
                usado:true
            }
        });
    }
}