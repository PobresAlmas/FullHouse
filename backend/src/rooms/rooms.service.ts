import {
    ConflictException,
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { status_anuncio_enum, status_interesse_anuncio_enum } from "../generated/prisma/enums.js";
import { ResidenceAccessService } from "../residences/residence-access.service.js";
import { StorageService } from "../storage/storage.service.js";
import { CreateRoomInterestDto } from "./dto/create-room-interest.dto.js";
import { CreateRoomListingDto } from "./dto/create-room-listing.dto.js";
import { RoomListingQueryDto } from "./dto/room-listing-query.dto.js";
import type { RoomNegotiationMessagesQueryDto } from "./dto/room-negotiation-messages-query.dto.js";
import { UpdateRoomInterestDto } from "./dto/update-room-interest.dto.js";
import { UpdateRoomListingDto } from "./dto/update-room-listing.dto.js";
import { toRoomListingResponse } from "./rooms.mapper.js";
import { RoomsRepository } from "./rooms.repository.js";

@Injectable()
export class RoomsService {
    constructor(
        private readonly repository: RoomsRepository,
        private readonly residenceAccess: ResidenceAccessService,
        private readonly storage: StorageService
    ) {}

    async create(data: CreateRoomListingDto, userId: string) {
        let membership;
        try {
            membership = await this.residenceAccess.requireManager(data.casaId, userId);
        } catch (error: unknown) {
            if (error instanceof NotFoundException) {
                throw new ForbiddenException("Você não possui participação ativa nesta casa.");
            }
            throw error;
        }
        const listing = await this.repository.create(data, membership.memberId);
        return toRoomListingResponse(listing);
    }

    async findMany(query: RoomListingQueryDto, userId?: string) {
        if (
            query.precoMin !== undefined &&
            query.precoMax !== undefined &&
            query.precoMin > query.precoMax
        ) {
            throw new BadRequestException("precoMin não pode ser maior que precoMax.");
        }
        await this.requireNoActiveResidence(
            userId,
            "A busca de quartos está disponível apenas para pessoas sem residência ativa."
        );
        const result = await this.repository.findMany(query);
        return {
            data: result.data.map((listing) => toRoomListingResponse(listing)),
            meta: {
                total: result.total,
                page: query.page,
                limit: query.limit,
                totalPages: Math.ceil(result.total / query.limit),
            },
        };
    }

    async findById(id: string, userId?: string) {
        await this.requireNoActiveResidence(
            userId,
            "A visualização de anúncios públicos está disponível apenas para pessoas sem residência ativa."
        );
        const listing = await this.repository.findById(id);
        if (!listing || listing.status !== status_anuncio_enum.ABERTO) {
            throw new NotFoundException("Anúncio não encontrado.");
        }
        return toRoomListingResponse(listing);
    }

    async findMine(userId: string, residenceId?: string) {
        if (residenceId) await this.residenceAccess.requireMembership(residenceId, userId);
        return (await this.repository.findMine(userId, residenceId)).map((listing) =>
            toRoomListingResponse(listing, true)
        );
    }

    async findForHouse(userId: string, residenceId: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        const listings = await this.repository.findForHouse(residenceId);
        return listings.map((listing) => {
            const author = listing.participacao;
            const canManage = author.usuario_id === userId && author.data_saida === null;
            return {
                ...toRoomListingResponse(listing, canManage),
                autorNome: author.usuario.apelido || author.usuario.nome,
                canManage,
                pendingInterestCount: canManage ? listing._count.interesse_anuncio : null,
            };
        });
    }

    async update(id: string, data: UpdateRoomListingDto, userId: string) {
        const listing = await this.requireOwner(id, userId);
        const updated = await this.repository.update(listing.id, data);
        return toRoomListingResponse(updated);
    }

    async remove(id: string, userId: string) {
        const listing = await this.requireOwner(id, userId);
        await this.repository.close(listing.id);
    }

    async uploadPhoto(casaId: string, file: Express.Multer.File | undefined, userId: string) {
        if (!file) throw new ConflictException("Selecione uma imagem.");
        await this.residenceAccess.requireManager(casaId, userId);
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
            throw new ConflictException("Use uma imagem JPEG, PNG ou WebP.");
        }
        return { url: await this.storage.upload(file, "room-listings") };
    }

    async createInterest(id: string, data: CreateRoomInterestDto, userId: string) {
        await this.requireNoActiveResidence(
            userId,
            "A demonstração de interesse está disponível apenas para pessoas sem residência ativa."
        );
        const listing = await this.repository.findById(id);
        if (!listing || listing.status !== status_anuncio_enum.ABERTO) {
            throw new NotFoundException("Anúncio não encontrado ou fechado.");
        }
        const existing = await this.repository.findInterest(id, userId);
        if (existing) throw new ConflictException("Você já demonstrou interesse neste anúncio.");
        let interest;
        try {
            interest = await this.repository.createInterest(id, userId, data.mensagem);
        } catch (error: unknown) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "P2002"
            ) {
                throw new ConflictException("Você já demonstrou interesse neste anúncio.");
            }
            throw error;
        }
        return { id: interest.id, anuncioId: interest.anuncio_id, status: interest.status };
    }

    async listInterests(id: string, userId: string) {
        await this.requireOwner(id, userId);
        const interests = await this.repository.listInterests(id);
        return interests.map((interest) => ({
            id: interest.id,
            anuncio_id: interest.anuncio_id,
            usuario_id: interest.usuario_id,
            mensagem: interest.mensagem,
            status: interest.status,
            negotiationId: interest.negociacao_anuncio?.id ?? null,
            usuario: interest.usuario,
        }));
    }

    async updateInterest(
        id: string,
        interestId: string,
        data: UpdateRoomInterestDto,
        userId: string
    ) {
        await this.requireOwner(id, userId);
        if (
            data.status !== status_interesse_anuncio_enum.ACEITO &&
            data.status !== status_interesse_anuncio_enum.RECUSADO
        ) {
            throw new ConflictException("O interesse deve ser aceito ou recusado.");
        }
        const result = await this.repository.decideInterest(id, interestId, data.status);
        return {
            id: interestId,
            anuncioId: id,
            status: result.status,
            negotiationId: result.negotiationId,
        };
    }

    async listMyInterests(userId: string) {
        const interests = await this.repository.listMyInterests(userId);
        return Promise.all(
            interests.map(async (interest) => {
                let negotiationId = interest.negociacao_anuncio?.id ?? null;
                let status = interest.status;
                if (status === status_interesse_anuncio_enum.ACEITO && !negotiationId) {
                    negotiationId = (await this.repository.ensureNegotiation(interest.id)).id;
                }
                if (status === status_interesse_anuncio_enum.ACEITO && negotiationId) {
                    const negotiation =
                        await this.repository.findNegotiationForAccess(negotiationId);
                    if (negotiation && (await this.negotiationEndedAfterRemoval(negotiation))) {
                        await this.repository.closeNegotiationAfterMembershipRemoval(
                            negotiationId,
                            interest.id
                        );
                        status = status_interesse_anuncio_enum.RECUSADO;
                        negotiationId = null;
                    }
                } else {
                    negotiationId = null;
                }
                return {
                    id: interest.id,
                    status,
                    mensagem: interest.mensagem,
                    negotiationId,
                    anuncio: toRoomListingResponse(interest.anuncio_quarto),
                };
            })
        );
    }

    async getNegotiationMessages(
        negotiationId: string,
        userId: string,
        query: RoomNegotiationMessagesQueryDto
    ) {
        const negotiation = await this.requireNegotiationParticipant(negotiationId, userId, true);
        const listing = negotiation.interesse_anuncio.anuncio_quarto;
        const advertiserId = listing.participacao.usuario_id;
        const invitation = negotiation.convite_casa[0];
        const invitationStatus =
            invitation?.status === "PENDENTE" && invitation.expira_em.getTime() <= Date.now()
                ? "EXPIRADO"
                : invitation?.status;
        const endedAfterRemoval = await this.negotiationEndedAfterRemoval(negotiation);
        const displayedInvitationStatus = endedAfterRemoval ? "CANCELADO" : invitationStatus;
        const page = await this.repository.listNegotiationMessages(
            negotiationId,
            query.before,
            query.limit
        );
        let canInvite = false;
        if (
            advertiserId === userId &&
            negotiation.interesse_anuncio.status === status_interesse_anuncio_enum.ACEITO &&
            displayedInvitationStatus !== "PENDENTE" &&
            (displayedInvitationStatus !== "ACEITO" || endedAfterRemoval)
        ) {
            try {
                await this.residenceAccess.requireManager(listing.casa_id, userId);
                canInvite = true;
            } catch (error: unknown) {
                if (!(error instanceof ForbiddenException || error instanceof NotFoundException)) {
                    throw error;
                }
            }
        }
        return {
            id: negotiation.id,
            interestId: negotiation.interesse_id,
            status: negotiation.interesse_anuncio.status,
            casaId: listing.casa_id,
            podeConvidar: canInvite,
            convite:
                invitation && displayedInvitationStatus
                    ? {
                          id: invitation.id,
                          status: displayedInvitationStatus,
                          expiraEm: invitation.expira_em.toISOString(),
                          podeResponder:
                              invitation.usuario_convidado_id === userId &&
                              displayedInvitationStatus === "PENDENTE",
                      }
                    : null,
            anuncio: toRoomListingResponse(listing, advertiserId === userId),
            mensagens: page.data.map((message) => ({
                id: message.id,
                autorId: message.usuario.id,
                autorNome: message.usuario.nome,
                autorFotoUrl: message.usuario.foto_url,
                conteudo: message.conteudo,
                enviadaEm: message.enviada_em.toISOString(),
            })),
            hasMore: page.hasMore,
            nextCursor: page.nextCursor,
        };
    }

    async sendNegotiationMessage(negotiationId: string, content: string, userId: string) {
        const normalizedContent = content.trim();
        if (!normalizedContent) throw new BadRequestException("A mensagem não pode estar vazia.");
        if (normalizedContent.length > 2000) {
            throw new BadRequestException("A mensagem deve ter no máximo 2000 caracteres.");
        }
        const negotiation = await this.requireNegotiationParticipant(negotiationId, userId);
        const interest = negotiation.interesse_anuncio;
        const recipientUserId =
            interest.usuario.id === userId
                ? interest.anuncio_quarto.participacao.usuario_id
                : interest.usuario.id;
        const message = await this.repository.createNegotiationMessage(
            negotiationId,
            userId,
            recipientUserId,
            interest.anuncio_quarto.casa_id,
            normalizedContent
        );
        return {
            id: message.id,
            autorId: message.usuario.id,
            autorNome: message.usuario.nome,
            autorFotoUrl: message.usuario.foto_url,
            conteudo: message.conteudo,
            enviadaEm: message.enviada_em.toISOString(),
        };
    }

    async sendNegotiationInvitation(negotiationId: string, userId: string) {
        const negotiation = await this.requireNegotiationParticipant(negotiationId, userId, true);
        const interest = negotiation.interesse_anuncio;
        if (interest.usuario.id === userId) {
            throw new ForbiddenException("Somente o anunciante pode enviar o convite.");
        }
        const manager = await this.residenceAccess.requireManager(
            interest.anuncio_quarto.casa_id,
            userId
        );
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const invitation = await this.repository.createNegotiationInvitation(
            negotiationId,
            interest.usuario.id,
            manager.memberId,
            expiresAt
        );
        return {
            id: invitation.id,
            status: invitation.status,
            expiraEm: invitation.expira_em.toISOString(),
        };
    }

    async respondToNegotiationInvitation(
        invitationId: string,
        decision: "ACEITO" | "RECUSADO",
        userId: string
    ) {
        const result = await this.repository.respondToNegotiationInvitation(
            invitationId,
            userId,
            decision
        );
        if (result.status === "EXPIRADO") {
            throw new ConflictException("Este convite expirou.");
        }
        return result;
    }

    private async requireNegotiationParticipant(
        negotiationId: string,
        userId: string,
        allowClosedAdvertiser = false
    ) {
        const negotiation = await this.repository.findNegotiationForAccess(negotiationId);
        if (!negotiation) throw new NotFoundException("Negociação não encontrada.");
        const interest = negotiation.interesse_anuncio;
        const advertiserId = interest.anuncio_quarto.participacao.usuario_id;
        if (interest.usuario.id !== userId && advertiserId !== userId) {
            throw new NotFoundException("Negociação não encontrada.");
        }
        if (await this.negotiationEndedAfterRemoval(negotiation)) {
            if (interest.usuario.id === userId || !allowClosedAdvertiser) {
                throw new NotFoundException("Negociação não encontrada.");
            }
        }
        return negotiation;
    }

    private async negotiationEndedAfterRemoval(negotiation: {
        convite_casa: { status: string; usuario_convidado_id: string | null }[];
        interesse_anuncio: { anuncio_quarto: { casa_id: string } };
    }) {
        const invitation = negotiation.convite_casa[0];
        if (!invitation || !["ACEITO", "CANCELADO"].includes(invitation.status)) return false;
        if (invitation.status === "CANCELADO" || !invitation.usuario_convidado_id) return true;
        const residences = await this.residenceAccess.listForUser(invitation.usuario_convidado_id);
        return !residences.some(
            (residence) => residence.id === negotiation.interesse_anuncio.anuncio_quarto.casa_id
        );
    }

    private async requireOwner(id: string, userId: string) {
        const listing = await this.repository.findForOwner(id);
        if (!listing) throw new NotFoundException("Anúncio não encontrado.");
        if (listing.participacao.usuario_id !== userId) {
            throw new ForbiddenException("Somente o anunciante pode gerir este anúncio.");
        }
        if (listing.participacao.data_saida !== null) {
            throw new ForbiddenException("A participação do anunciante não está ativa.");
        }
        return listing;
    }

    private async requireNoActiveResidence(userId: string | undefined, message: string) {
        if (userId && (await this.residenceAccess.listForUser(userId)).length > 0) {
            throw new ForbiddenException(message);
        }
    }
}
