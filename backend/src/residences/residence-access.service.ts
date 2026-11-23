import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import type {
    politica_criacao_edicao_enum,
    papel_participacao_enum,
} from "../generated/prisma/enums.js";
import type { UpdateResidencePreferencesDto } from "./dto/update-residence-preferences.dto.js";
import type { UpdateMemberAccessDto } from "./dto/update-member-access.dto.js";
import { PrismaService } from "../prisma/prisma.service.js";

export type ResidenceMembership = {
    residenceId: string;
    memberId: string;
    role: papel_participacao_enum;
    creationEditPolicy: politica_criacao_edicao_enum;
    canEditContent: boolean | null;
};

export function isResidenceManager(role: papel_participacao_enum) {
    return role === "LIDER" || role === "ADMINISTRADOR";
}

const defaultPreferences = {
    notifications: {
        newTasks: true,
        newExpenses: true,
        upcomingDueDates: true,
        residentInvitations: true,
        houseUpdates: false,
    },
    pantry: { expirationNoticeDays: 5, showExpired: true },
    finance: { dueNoticeDays: 5, showOverdue: true },
    pets: { vaccineReminders: true, dewormingReminders: true, appointmentReminders: true },
};

function mapPreferences(record: {
    aviso_novas_tarefas: boolean;
    aviso_novas_despesas: boolean;
    aviso_vencimentos: boolean;
    aviso_convites: boolean;
    aviso_atualizacoes_casa: boolean;
    validade_aviso_dias: number;
    mostrar_vencidos: boolean;
    financeiro_aviso_dias: number;
    mostrar_atrasadas: boolean;
    lembrete_vacinas: boolean;
    lembrete_vermifugo: boolean;
    lembrete_consultas: boolean;
}) {
    return {
        notifications: {
            newTasks: record.aviso_novas_tarefas,
            newExpenses: record.aviso_novas_despesas,
            upcomingDueDates: record.aviso_vencimentos,
            residentInvitations: record.aviso_convites,
            houseUpdates: record.aviso_atualizacoes_casa,
        },
        pantry: {
            expirationNoticeDays: record.validade_aviso_dias,
            showExpired: record.mostrar_vencidos,
        },
        finance: {
            dueNoticeDays: record.financeiro_aviso_dias,
            showOverdue: record.mostrar_atrasadas,
        },
        pets: {
            vaccineReminders: record.lembrete_vacinas,
            dewormingReminders: record.lembrete_vermifugo,
            appointmentReminders: record.lembrete_consultas,
        },
    };
}

function preferenceFields(data: UpdateResidencePreferencesDto) {
    return {
        ...(data.notifications?.newTasks !== undefined
            ? { aviso_novas_tarefas: data.notifications.newTasks }
            : {}),
        ...(data.notifications?.newExpenses !== undefined
            ? { aviso_novas_despesas: data.notifications.newExpenses }
            : {}),
        ...(data.notifications?.upcomingDueDates !== undefined
            ? { aviso_vencimentos: data.notifications.upcomingDueDates }
            : {}),
        ...(data.notifications?.residentInvitations !== undefined
            ? { aviso_convites: data.notifications.residentInvitations }
            : {}),
        ...(data.notifications?.houseUpdates !== undefined
            ? { aviso_atualizacoes_casa: data.notifications.houseUpdates }
            : {}),
        ...(data.pantry?.expirationNoticeDays !== undefined
            ? { validade_aviso_dias: data.pantry.expirationNoticeDays }
            : {}),
        ...(data.pantry?.showExpired !== undefined
            ? { mostrar_vencidos: data.pantry.showExpired }
            : {}),
        ...(data.finance?.dueNoticeDays !== undefined
            ? { financeiro_aviso_dias: data.finance.dueNoticeDays }
            : {}),
        ...(data.finance?.showOverdue !== undefined
            ? { mostrar_atrasadas: data.finance.showOverdue }
            : {}),
        ...(data.pets?.vaccineReminders !== undefined
            ? { lembrete_vacinas: data.pets.vaccineReminders }
            : {}),
        ...(data.pets?.dewormingReminders !== undefined
            ? { lembrete_vermifugo: data.pets.dewormingReminders }
            : {}),
        ...(data.pets?.appointmentReminders !== undefined
            ? { lembrete_consultas: data.pets.appointmentReminders }
            : {}),
    };
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
                criada_em: true,
                participacao: {
                    where: { usuario_id: userId, data_saida: null },
                    select: { id: true, papel: true, edicao_conteudo_override: true },
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
            createdAt: residence.criada_em.toISOString().slice(0, 10),
            membership: residence.participacao[0]
                ? {
                      id: residence.participacao[0].id,
                      role: residence.participacao[0].papel,
                      canEditContent: residence.participacao[0].edicao_conteudo_override,
                  }
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
                    select: { id: true, papel: true, edicao_conteudo_override: true },
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
            canEditContent: membership.edicao_conteudo_override,
        };
    }

    async requireCreateEditPermission(residenceId: string, userId: string) {
        const membership = await this.requireMembership(residenceId, userId);
        const canEdit = isResidenceManager(membership.role)
            ? true
            : (membership.canEditContent ?? membership.creationEditPolicy === "TODOS");
        if (!canEdit) {
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
            select: { id: true, usuario_id: true, papel: true, edicao_conteudo_override: true },
        });
    }

    async listSettingsMembers(residenceId: string, userId: string) {
        await this.requireMembership(residenceId, userId);
        const [members, policy] = await Promise.all([
            this.prisma.participacao.findMany({
                where: { casa_id: residenceId, data_saida: null },
                select: {
                    id: true,
                    papel: true,
                    edicao_conteudo_override: true,
                    usuario: {
                        select: {
                            id: true,
                            nome: true,
                            apelido: true,
                            email: true,
                            foto_url: true,
                            cor_avatar: true,
                        },
                    },
                },
                orderBy: [{ data_entrada: "asc" }, { id: "asc" }],
            }),
            this.prisma.configuracao_casa.findUnique({
                where: { casa_id: residenceId },
                select: { politica_criacao_edicao: true },
            }),
        ]);
        const creationEditPolicy = policy?.politica_criacao_edicao ?? "TODOS";
        return members.map((member) => ({
            id: member.id,
            userId: member.usuario.id,
            name: member.usuario.apelido || member.usuario.nome,
            email: member.usuario.email,
            photo: member.usuario.foto_url ?? undefined,
            avatarBackgroundColor: member.usuario.cor_avatar,
            role: member.papel,
            canManage: isResidenceManager(member.papel),
            canEditContent: isResidenceManager(member.papel)
                ? true
                : (member.edicao_conteudo_override ?? creationEditPolicy === "TODOS"),
            accessIsInherited: member.edicao_conteudo_override === null,
        }));
    }

    async updateMemberAccess(
        residenceId: string,
        memberId: string,
        userId: string,
        data: UpdateMemberAccessDto
    ) {
        await this.requireManager(residenceId, userId);
        const target = await this.requireActiveMember(residenceId, memberId);
        if (!target) throw new NotFoundException("O morador não está ativo nesta casa.");
        if (isResidenceManager(target.papel)) {
            throw new ConflictException(
                "O acesso de administradores é definido pelo papel de gestão."
            );
        }
        if (data.canEditContent === undefined) {
            throw new ConflictException("Informe a permissão de edição.");
        }
        await this.prisma.participacao.update({
            where: { id: memberId },
            data: { edicao_conteudo_override: data.canEditContent },
        });
        const updated = (await this.listSettingsMembers(residenceId, userId)).find(
            (member) => member.id === memberId
        );
        if (!updated) throw new NotFoundException("O morador não está ativo nesta casa.");
        return updated;
    }

    async removeMember(residenceId: string, memberId: string, userId: string) {
        await this.requireManager(residenceId, userId);
        await this.prisma.$transaction(async (tx) => {
            // Serialize removals for this residence so concurrent admin actions cannot
            // remove the last remaining administrator.
            await tx.$queryRaw`SELECT id FROM casa WHERE id = ${residenceId}::uuid FOR UPDATE`;
            const target = await tx.participacao.findFirst({
                where: { id: memberId, casa_id: residenceId, data_saida: null },
                select: { id: true, usuario_id: true, papel: true },
            });
            if (!target) throw new NotFoundException("O morador não está ativo nesta casa.");
            if (target.usuario_id === userId) {
                throw new ConflictException("Você não pode remover a si mesmo da casa.");
            }
            if (target.papel === "LIDER") {
                throw new ConflictException(
                    "Transfira a liderança antes de remover o líder da casa."
                );
            }
            if (isResidenceManager(target.papel)) {
                const otherManagers = await tx.participacao.count({
                    where: {
                        casa_id: residenceId,
                        data_saida: null,
                        id: { not: memberId },
                        papel: { in: ["LIDER", "ADMINISTRADOR"] },
                    },
                });
                if (otherManagers === 0) {
                    throw new ConflictException("A casa precisa manter ao menos um administrador.");
                }
            }
            await tx.convite_casa.updateMany({
                where: {
                    casa_id: residenceId,
                    usuario_convidado_id: target.usuario_id,
                    status: { in: ["PENDENTE", "ACEITO"] },
                    negociacao_anuncio: {
                        interesse_anuncio: { usuario_id: target.usuario_id },
                    },
                },
                data: { status: "CANCELADO" },
            });
            await tx.interesse_anuncio.updateMany({
                where: {
                    usuario_id: target.usuario_id,
                    status: { in: ["PENDENTE", "ACEITO"] },
                    anuncio_quarto: { casa_id: residenceId },
                },
                data: { status: "RECUSADO" },
            });
            await tx.participacao.update({
                where: { id: memberId },
                data: { data_saida: new Date() },
            });
            const otherActiveHomes = await tx.participacao.count({
                where: {
                    usuario_id: target.usuario_id,
                    data_saida: null,
                    casa_id: { not: residenceId },
                },
            });
            if (otherActiveHomes === 0) {
                await tx.usuario.update({
                    where: { id: target.usuario_id },
                    data: { status_moradia: "PROCURANDO" },
                });
            }
        });
        return { id: memberId, removed: true };
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

    async getPreferences(residenceId: string, userId: string) {
        await this.requireMembership(residenceId, userId);
        const preferences = await this.prisma.preferencia_residencia.findUnique({
            where: { usuario_id_casa_id: { usuario_id: userId, casa_id: residenceId } },
        });
        return preferences ? mapPreferences(preferences) : defaultPreferences;
    }

    async updatePreferences(
        residenceId: string,
        userId: string,
        data: UpdateResidencePreferencesDto
    ) {
        await this.requireMembership(residenceId, userId);
        const fields = preferenceFields(data);
        const saved = await this.prisma.preferencia_residencia.upsert({
            where: { usuario_id_casa_id: { usuario_id: userId, casa_id: residenceId } },
            create: { usuario_id: userId, casa_id: residenceId, ...fields },
            update: fields,
        });
        return mapPreferences(saved);
    }

    async updateResidenceName(residenceId: string, userId: string, name: string) {
        await this.requireManager(residenceId, userId);
        const residence = await this.prisma.casa.update({
            where: { id: residenceId },
            data: { nome: name },
            select: {
                id: true,
                nome: true,
                cidade: true,
                bairro: true,
                status: true,
            },
        });
        return {
            id: residence.id,
            name: residence.nome,
            city: residence.cidade,
            neighborhood: residence.bairro,
            status: residence.status,
        };
    }
}
