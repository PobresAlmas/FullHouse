import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import type { status_interesse_anuncio_enum } from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateRoomListingDto } from "./dto/create-room-listing.dto.js";
import type { RoomListingQueryDto } from "./dto/room-listing-query.dto.js";
import type { UpdateRoomListingDto } from "./dto/update-room-listing.dto.js";

const ownerInclude = { participacao: { select: { usuario_id: true, data_saida: true } } } as const;

@Injectable()
export class RoomsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateRoomListingDto, memberId: string) {
        return this.prisma.anuncio_quarto.create({
            data: {
                casa_id: data.casaId,
                criado_por_participacao_id: memberId,
                titulo: data.titulo.trim(),
                descricao: data.descricao?.trim() || null,
                valor_mensal: data.preco,
                cidade: data.cidade.trim(),
                bairro: data.bairro?.trim() || null,
                enderecoCompleto: data.enderecoCompleto?.trim() || null,
                exibeEnderecoCompleto: data.exibeEnderecoCompleto ?? false,
                contato: data.contato.trim(),
                exibeContato: data.exibeContato ?? false,
                perfilConvivencia: data.perfilConvivencia?.trim() || null,
                tipoMoradia: data.tipoMoradia ?? "QUARTO_INDIVIDUAL",
                aceitaPets: data.aceitaPets ?? false,
                fotos: data.fotos ?? [],
            },
        });
    }

    async findMany(query: RoomListingQueryDto) {
        const where: Prisma.anuncio_quartoWhereInput = {
            status: query.status ?? "ABERTO",
            ...(query.cidade
                ? { cidade: { contains: query.cidade.trim(), mode: "insensitive" } }
                : {}),
            ...(query.bairro
                ? { bairro: { contains: query.bairro.trim(), mode: "insensitive" } }
                : {}),
            ...(query.precoMin !== undefined || query.precoMax !== undefined
                ? {
                      valor_mensal: {
                          ...(query.precoMin !== undefined ? { gte: query.precoMin } : {}),
                          ...(query.precoMax !== undefined ? { lte: query.precoMax } : {}),
                      },
                  }
                : {}),
            ...(query.tipoMoradia ? { tipoMoradia: query.tipoMoradia } : {}),
            ...(query.aceitaPets !== undefined ? { aceitaPets: query.aceitaPets } : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.anuncio_quarto.findMany({
                where,
                orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.anuncio_quarto.count({ where }),
        ]);
        return { data, total };
    }

    findById(id: string) {
        return this.prisma.anuncio_quarto.findUnique({ where: { id } });
    }

    findForOwner(id: string) {
        return this.prisma.anuncio_quarto.findUnique({ where: { id }, include: ownerInclude });
    }

    findMine(userId: string, residenceId?: string) {
        return this.prisma.anuncio_quarto.findMany({
            where: {
                participacao: { usuario_id: userId },
                ...(residenceId ? { casa_id: residenceId } : {}),
            },
            orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
        });
    }

    findForHouse(residenceId: string) {
        return this.prisma.anuncio_quarto.findMany({
            where: { casa_id: residenceId },
            include: {
                participacao: {
                    select: {
                        usuario_id: true,
                        data_saida: true,
                        usuario: { select: { nome: true, apelido: true } },
                    },
                },
                _count: { select: { interesse_anuncio: { where: { status: "PENDENTE" } } } },
            },
            orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
        });
    }

    update(id: string, data: UpdateRoomListingDto) {
        return this.prisma.anuncio_quarto.update({
            where: { id },
            data: {
                ...(data.titulo !== undefined ? { titulo: data.titulo.trim() } : {}),
                ...(data.descricao !== undefined
                    ? { descricao: data.descricao.trim() || null }
                    : {}),
                ...(data.preco !== undefined ? { valor_mensal: data.preco } : {}),
                ...(data.cidade !== undefined ? { cidade: data.cidade.trim() } : {}),
                ...(data.bairro !== undefined ? { bairro: data.bairro.trim() || null } : {}),
                ...(data.enderecoCompleto !== undefined
                    ? { enderecoCompleto: data.enderecoCompleto.trim() || null }
                    : {}),
                ...(data.exibeEnderecoCompleto !== undefined
                    ? { exibeEnderecoCompleto: data.exibeEnderecoCompleto }
                    : {}),
                ...(data.contato !== undefined ? { contato: data.contato.trim() || null } : {}),
                ...(data.exibeContato !== undefined ? { exibeContato: data.exibeContato } : {}),
                ...(data.perfilConvivencia !== undefined
                    ? { perfilConvivencia: data.perfilConvivencia.trim() || null }
                    : {}),
                ...(data.tipoMoradia !== undefined ? { tipoMoradia: data.tipoMoradia } : {}),
                ...(data.aceitaPets !== undefined ? { aceitaPets: data.aceitaPets } : {}),
                ...(data.fotos !== undefined ? { fotos: data.fotos } : {}),
                ...(data.status !== undefined ? { status: data.status } : {}),
            },
        });
    }

    close(id: string) {
        return this.prisma.anuncio_quarto.update({ where: { id }, data: { status: "FECHADO" } });
    }

    findInterest(anuncioId: string, userId: string) {
        return this.prisma.interesse_anuncio.findFirst({
            where: {
                anuncio_id: anuncioId,
                usuario_id: userId,
                status: { in: ["PENDENTE", "ACEITO"] },
            },
        });
    }

    createInterest(anuncioId: string, userId: string, message?: string) {
        return this.prisma.$transaction(async (transaction) => {
            const [listing] = await transaction.$queryRaw<
                { casa_id: string; titulo: string; usuario_id: string }[]
            >`
                SELECT anuncio."casa_id", anuncio."titulo", autor."usuario_id"
                FROM "anuncio_quarto" anuncio
                JOIN "participacao" autor ON autor."id" = anuncio."criado_por_participacao_id"
                WHERE anuncio."id" = ${anuncioId}::uuid AND anuncio."status" = 'ABERTO'
                FOR UPDATE OF anuncio
            `;
            if (!listing) throw new NotFoundException("Anúncio não encontrado ou fechado.");
            const existing = await transaction.interesse_anuncio.findFirst({
                where: {
                    anuncio_id: anuncioId,
                    usuario_id: userId,
                    status: { in: ["PENDENTE", "ACEITO"] },
                },
            });
            if (existing)
                throw new ConflictException("Você já demonstrou interesse neste anúncio.");
            const declined = await transaction.interesse_anuncio.findFirst({
                where: { anuncio_id: anuncioId, usuario_id: userId, status: "RECUSADO" },
                include: { negociacao_anuncio: { select: { id: true } } },
            });
            const interest =
                declined && !declined.negociacao_anuncio
                    ? await transaction.interesse_anuncio.update({
                          where: { id: declined.id },
                          data: { status: "PENDENTE", mensagem: message?.trim() || null },
                      })
                    : await transaction.interesse_anuncio.create({
                          data: {
                              anuncio_id: anuncioId,
                              usuario_id: userId,
                              mensagem: message?.trim() || null,
                          },
                      });
            await transaction.notificacao.create({
                data: {
                    usuario_id: listing.usuario_id,
                    casa_id: listing.casa_id,
                    tipo: "SISTEMA",
                    titulo: "Novo interesse em um quarto",
                    mensagem: `Alguém se interessou pelo anúncio “${listing.titulo}”.`,
                    entidade_tipo: "INTERESSE_QUARTO",
                    entidade_id: anuncioId,
                },
            });
            return interest;
        });
    }

    listInterests(anuncioId: string) {
        return this.prisma.interesse_anuncio.findMany({
            where: { anuncio_id: anuncioId },
            include: {
                usuario: { select: { id: true, nome: true, email: true, foto_url: true } },
                negociacao_anuncio: { select: { id: true } },
            },
            orderBy: { id: "desc" },
        });
    }

    listMyInterests(userId: string) {
        return this.prisma.interesse_anuncio.findMany({
            where: { usuario_id: userId },
            include: {
                anuncio_quarto: true,
                negociacao_anuncio: { select: { id: true } },
            },
            orderBy: { id: "desc" },
        });
    }

    ensureNegotiation(interestId: string) {
        return this.prisma.negociacao_anuncio.upsert({
            where: { interesse_id: interestId },
            update: {},
            create: { interesse_id: interestId },
            select: { id: true },
        });
    }

    async closeNegotiationAfterMembershipRemoval(negotiationId: string, interestId: string) {
        await this.prisma.$transaction(async (transaction) => {
            await transaction.convite_casa.updateMany({
                where: {
                    negociacao_anuncio_id: negotiationId,
                    status: { in: ["PENDENTE", "ACEITO"] },
                },
                data: { status: "CANCELADO" },
            });
            await transaction.interesse_anuncio.updateMany({
                where: {
                    id: interestId,
                    status: { in: ["PENDENTE", "ACEITO"] },
                },
                data: { status: "RECUSADO" },
            });
        });
    }

    findNegotiationForAccess(id: string) {
        return this.prisma.negociacao_anuncio.findUnique({
            where: { id },
            include: {
                convite_casa: {
                    orderBy: [{ expira_em: "desc" }, { id: "desc" }],
                    take: 1,
                    select: { id: true, status: true, expira_em: true, usuario_convidado_id: true },
                },
                interesse_anuncio: {
                    include: {
                        usuario: { select: { id: true } },
                        anuncio_quarto: {
                            include: {
                                participacao: { select: { usuario_id: true } },
                            },
                        },
                    },
                },
            },
        });
    }

    async listNegotiationMessages(
        negotiationId: string,
        before: string | undefined,
        limit: number
    ) {
        if (before) {
            const cursor = await this.prisma.mensagem_negociacao_anuncio.findFirst({
                where: { id: before, negociacao_id: negotiationId },
                select: { id: true },
            });
            if (!cursor) throw new BadRequestException("Cursor de mensagem inválido.");
        }

        const messages = await this.prisma.mensagem_negociacao_anuncio.findMany({
            where: { negociacao_id: negotiationId },
            include: { usuario: { select: { id: true, nome: true, foto_url: true } } },
            orderBy: [{ enviada_em: "desc" }, { id: "desc" }],
            take: limit + 1,
            ...(before ? { cursor: { id: before }, skip: 1 } : {}),
        });
        const hasMore = messages.length > limit;
        const page = messages.slice(0, limit);
        const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;
        return {
            data: page.reverse(),
            hasMore,
            nextCursor,
        };
    }

    createNegotiationMessage(
        negotiationId: string,
        userId: string,
        recipientUserId: string,
        casaId: string,
        content: string
    ) {
        return this.prisma.$transaction(async (transaction) => {
            const message = await transaction.mensagem_negociacao_anuncio.create({
                data: {
                    negociacao_id: negotiationId,
                    autor_usuario_id: userId,
                    conteudo: content,
                },
                include: { usuario: { select: { id: true, nome: true, foto_url: true } } },
            });
            await transaction.notificacao.create({
                data: {
                    usuario_id: recipientUserId,
                    casa_id: casaId,
                    tipo: "SISTEMA",
                    titulo: "Nova mensagem sobre um quarto",
                    mensagem: "Você recebeu uma mensagem na negociação do anúncio.",
                    entidade_tipo: "NEGOCIACAO_QUARTO",
                    entidade_id: negotiationId,
                },
            });
            return message;
        });
    }

    decideInterest(anuncioId: string, interestId: string, status: status_interesse_anuncio_enum) {
        return this.prisma.$transaction(async (transaction) => {
            const pending = await transaction.$queryRaw<{ id: string }[]>`
                SELECT "id" FROM "interesse_anuncio"
                WHERE "id" = ${interestId}::uuid
                  AND "anuncio_id" = ${anuncioId}::uuid
                  AND "status" = 'PENDENTE'
                FOR UPDATE
            `;
            if (!pending.length) throw new NotFoundException("Interesse pendente não encontrado.");

            const interest = await transaction.interesse_anuncio.findUniqueOrThrow({
                where: { id: interestId },
                select: {
                    id: true,
                    usuario_id: true,
                    anuncio_quarto: { select: { casa_id: true } },
                },
            });
            await transaction.interesse_anuncio.update({
                where: { id: interestId },
                data: { status },
            });

            if (status !== "ACEITO") return { status, negotiationId: null };

            const negotiation = await transaction.negociacao_anuncio.upsert({
                where: { interesse_id: interestId },
                update: {},
                create: { interesse_id: interestId },
                select: { id: true },
            });
            await transaction.notificacao.create({
                data: {
                    usuario_id: interest.usuario_id,
                    casa_id: interest.anuncio_quarto.casa_id,
                    tipo: "SISTEMA",
                    titulo: "Seu interesse foi aceito",
                    mensagem: "O anunciante aceitou conversar sobre o quarto.",
                    entidade_tipo: "NEGOCIACAO_QUARTO",
                    entidade_id: negotiation.id,
                },
            });
            return { status, negotiationId: negotiation.id };
        });
    }

    createNegotiationInvitation(
        negotiationId: string,
        invitedUserId: string,
        managerParticipationId: string,
        expiresAt: Date
    ) {
        return this.prisma.$transaction(async (transaction) => {
            const negotiation = await transaction.$queryRaw<{ casa_id: string }[]>`
                SELECT a."casa_id"
                FROM "negociacao_anuncio" n
                JOIN "interesse_anuncio" i ON i."id" = n."interesse_id"
                JOIN "anuncio_quarto" a ON a."id" = i."anuncio_id"
                JOIN "participacao" p ON p."id" = ${managerParticipationId}::uuid
                    AND p."casa_id" = a."casa_id"
                    AND p."data_saida" IS NULL
                    AND p."papel" IN ('LIDER', 'ADMINISTRADOR')
                WHERE n."id" = ${negotiationId}::uuid
                  AND i."usuario_id" = ${invitedUserId}::uuid
                  AND i."status" = 'ACEITO'
                FOR UPDATE OF n, p
            `;
            if (!negotiation.length) {
                throw new NotFoundException(
                    "Negociação não encontrada ou indisponível para convite."
                );
            }

            const existing = await transaction.convite_casa.findFirst({
                where: {
                    negociacao_anuncio_id: negotiationId,
                    status: "PENDENTE",
                    expira_em: { gt: new Date() },
                },
                select: { id: true, status: true, expira_em: true },
            });
            if (existing) return existing;

            await transaction.convite_casa.updateMany({
                where: {
                    negociacao_anuncio_id: negotiationId,
                    status: "PENDENTE",
                    expira_em: { lte: new Date() },
                },
                data: { status: "EXPIRADO" },
            });
            const invitation = await transaction.convite_casa.create({
                data: {
                    casa_id: negotiation[0].casa_id,
                    negociacao_anuncio_id: negotiationId,
                    usuario_convidado_id: invitedUserId,
                    convidado_por_participacao_id: managerParticipationId,
                    expira_em: expiresAt,
                },
                select: { id: true, status: true, expira_em: true },
            });
            await transaction.notificacao.create({
                data: {
                    usuario_id: invitedUserId,
                    casa_id: negotiation[0].casa_id,
                    tipo: "SISTEMA",
                    titulo: "Você recebeu um convite para uma casa",
                    mensagem: "Acesse a negociação do quarto para aceitar ou recusar o convite.",
                    entidade_tipo: "CONVITE_CASA",
                    entidade_id: invitation.id,
                },
            });
            return invitation;
        });
    }

    async respondToNegotiationInvitation(
        invitationId: string,
        userId: string,
        decision: "ACEITO" | "RECUSADO"
    ) {
        try {
            return await this.prisma.$transaction(async (transaction) => {
                const invitation = await transaction.convite_casa.findUnique({
                    where: { id: invitationId },
                    select: {
                        id: true,
                        casa_id: true,
                        negociacao_anuncio_id: true,
                        usuario_convidado_id: true,
                        convidado_por_participacao_id: true,
                        status: true,
                        expira_em: true,
                        casa: { select: { status: true, excluido_em: true } },
                    },
                });
                if (!invitation) throw new NotFoundException("Convite não encontrado.");
                if (invitation.usuario_convidado_id !== userId) {
                    throw new ForbiddenException("Somente a pessoa convidada pode responder.");
                }
                if (invitation.status !== "PENDENTE") {
                    throw new ConflictException("Este convite já foi respondido.");
                }

                const pending = await transaction.$queryRaw<{ id: string }[]>`
                SELECT "id" FROM "convite_casa"
                WHERE "id" = ${invitationId}::uuid AND "status" = 'PENDENTE'
                FOR UPDATE
            `;
                if (!pending.length) throw new ConflictException("Este convite já foi respondido.");
                if (invitation.expira_em <= new Date()) {
                    await transaction.convite_casa.update({
                        where: { id: invitationId },
                        data: { status: "EXPIRADO" },
                    });
                    return { id: invitationId, status: "EXPIRADO", membershipId: null };
                }

                let membershipId: string | null = null;
                if (decision === "ACEITO") {
                    if (
                        invitation.casa.status !== "ATIVA" ||
                        invitation.casa.excluido_em !== null
                    ) {
                        throw new ConflictException("A casa deste convite não está mais ativa.");
                    }
                    const activeMembership = await transaction.participacao.findFirst({
                        where: {
                            usuario_id: userId,
                            data_saida: null,
                        },
                        select: { id: true, casa_id: true },
                    });
                    if (activeMembership && activeMembership.casa_id !== invitation.casa_id) {
                        throw new ConflictException("Você já possui uma residência ativa.");
                    }
                    const membership =
                        activeMembership ??
                        (await transaction.participacao.create({
                            data: {
                                casa_id: invitation.casa_id,
                                usuario_id: userId,
                                papel: "MORADOR",
                                convite_id: invitationId,
                            },
                            select: { id: true },
                        }));
                    membershipId = membership.id;
                    await transaction.usuario.update({
                        where: { id: userId },
                        data: { status_moradia: "MORANDO" },
                    });
                }

                await transaction.convite_casa.update({
                    where: { id: invitationId },
                    data: { status: decision },
                });

                const inviter = await transaction.participacao.findUniqueOrThrow({
                    where: { id: invitation.convidado_por_participacao_id },
                    select: { usuario_id: true },
                });
                await transaction.notificacao.create({
                    data: {
                        usuario_id: inviter.usuario_id,
                        casa_id: invitation.casa_id,
                        tipo: "SISTEMA",
                        titulo: decision === "ACEITO" ? "Convite aceito" : "Convite recusado",
                        mensagem:
                            decision === "ACEITO"
                                ? "A pessoa convidada agora faz parte da casa."
                                : "A pessoa convidada recusou o convite.",
                        entidade_tipo: "CONVITE_CASA",
                        entidade_id: invitationId,
                    },
                });
                return { id: invitationId, status: decision, membershipId };
            });
        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "P2002"
            ) {
                throw new ConflictException("Você já possui uma residência ativa.");
            }
            throw error;
        }
    }
}
