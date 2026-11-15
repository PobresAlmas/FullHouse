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
            membership = await this.residenceAccess.requireMembership(data.casaId, userId);
        } catch (error: unknown) {
            if (error instanceof NotFoundException) {
                throw new ForbiddenException("Você não possui participação ativa nesta casa.");
            }
            throw error;
        }
        const listing = await this.repository.create(data, membership.memberId);
        return toRoomListingResponse(listing);
    }

    async findMany(query: RoomListingQueryDto) {
        if (
            query.precoMin !== undefined &&
            query.precoMax !== undefined &&
            query.precoMin > query.precoMax
        ) {
            throw new BadRequestException("precoMin não pode ser maior que precoMax.");
        }
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

    async findById(id: string) {
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
        await this.residenceAccess.requireMembership(casaId, userId);
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
            throw new ConflictException("Use uma imagem JPEG, PNG ou WebP.");
        }
        return { url: await this.storage.upload(file, "room-listings") };
    }

    async createInterest(id: string, data: CreateRoomInterestDto, userId: string) {
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
        return this.repository.listInterests(id);
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
        const result = await this.repository.updateInterest(id, interestId, data.status);
        if (!result.count) throw new NotFoundException("Interesse pendente não encontrado.");
        return { id: interestId, anuncioId: id, status: data.status };
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
}
