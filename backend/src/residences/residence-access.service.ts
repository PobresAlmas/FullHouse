import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
    politica_criacao_edicao_enum,
    papel_participacao_enum,
} from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";

export type ResidenceMembership = {
    residenceId: string;
    memberId: string;
    role: papel_participacao_enum;
    creationEditPolicy: politica_criacao_edicao_enum;
};

export function isResidenceManager(role: papel_participacao_enum) {
    return role === "LIDER" || role === "ADMINISTRADOR";
}

@Injectable()
export class ResidenceAccessService {
    constructor(private readonly prisma: PrismaService) {}

    async listForUser(userId: string) {
        const residences = await this.prisma.casa.findMany({
            where: {
                status: "ATIVA",
                excluido_em: null,
                participacao: { some: { usuario_id: userId, data_saida: null } },
            },
            select: {
                id: true,
                nome: true,
                cidade: true,
                bairro: true,
                status: true,
                participacao: {
                    where: { usuario_id: userId, data_saida: null },
                    select: { id: true, papel: true },
                    take: 1,
                },
                configuracao_casa: { select: { politica_criacao_edicao: true } },
            },
            orderBy: { nome: "asc" },
        });

        return residences.map((residence) => ({
            id: residence.id,
            name: residence.nome,
            city: residence.cidade,
            neighborhood: residence.bairro,
            status: residence.status,
            membership: residence.participacao[0]
                ? { id: residence.participacao[0].id, role: residence.participacao[0].papel }
                : null,
            creationEditPolicy: residence.configuracao_casa?.politica_criacao_edicao ?? "TODOS",
        }));
    }

    async requireMembership(residenceId: string, userId: string): Promise<ResidenceMembership> {
        const residence = await this.prisma.casa.findFirst({
            where: {
                id: residenceId,
                status: "ATIVA",
                excluido_em: null,
                participacao: { some: { usuario_id: userId, data_saida: null } },
            },
            select: {
                id: true,
                participacao: {
                    where: { usuario_id: userId, data_saida: null },
                    select: { id: true, papel: true },
                    take: 1,
                },
                configuracao_casa: { select: { politica_criacao_edicao: true } },
            },
        });

        const membership = residence?.participacao[0];
        if (!residence || !membership) {
            throw new NotFoundException("A residência não está disponível.");
        }

        return {
            residenceId: residence.id,
            memberId: membership.id,
            role: membership.papel,
            creationEditPolicy: residence.configuracao_casa?.politica_criacao_edicao ?? "TODOS",
        };
    }

    async requireCreateEditPermission(residenceId: string, userId: string) {
        const membership = await this.requireMembership(residenceId, userId);
        if (membership.creationEditPolicy === "LIDERES" && !isResidenceManager(membership.role)) {
            throw new ForbiddenException(
                "Somente líderes e administradores podem criar ou editar este conteúdo."
            );
        }
        return membership;
    }

    async requireManager(residenceId: string, userId: string) {
        const membership = await this.requireMembership(residenceId, userId);
        if (!isResidenceManager(membership.role)) {
            throw new ForbiddenException("Somente líderes e administradores podem fazer isso.");
        }
        return membership;
    }

    async requireActiveMember(residenceId: string, memberId: string) {
        return this.prisma.participacao.findFirst({
            where: { id: memberId, casa_id: residenceId, data_saida: null },
            select: { id: true, usuario_id: true, papel: true },
        });
    }

    async getPermissionSettings(residenceId: string, userId: string) {
        const membership = await this.requireMembership(residenceId, userId);
        return {
            residenceId,
            creationEditPolicy: membership.creationEditPolicy,
            canManage: isResidenceManager(membership.role),
        };
    }

    async updatePermissionSettings(
        residenceId: string,
        userId: string,
        creationEditPolicy: politica_criacao_edicao_enum
    ) {
        await this.requireManager(residenceId, userId);
        await this.prisma.configuracao_casa.upsert({
            where: { casa_id: residenceId },
            create: {
                casa_id: residenceId,
                politica_criacao_edicao: creationEditPolicy,
            },
            update: { politica_criacao_edicao: creationEditPolicy },
        });
        return this.getPermissionSettings(residenceId, userId);
    }
}
