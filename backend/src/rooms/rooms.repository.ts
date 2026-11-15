import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
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
            where: { anuncio_id: anuncioId, usuario_id: userId, status: "PENDENTE" },
        });
    }

    createInterest(anuncioId: string, userId: string, message?: string) {
        return this.prisma.$transaction(async (transaction) => {
            const openListing = await transaction.$queryRaw<{ id: string }[]>`
                SELECT "id" FROM "anuncio_quarto"
                WHERE "id" = ${anuncioId}::uuid AND "status" = 'ABERTO'
                FOR UPDATE
            `;
            if (!openListing.length) throw new NotFoundException("Anúncio não encontrado ou fechado.");
            const existing = await transaction.interesse_anuncio.findFirst({
                where: { anuncio_id: anuncioId, usuario_id: userId, status: "PENDENTE" },
            });
            if (existing)
                throw new ConflictException("Você já demonstrou interesse neste anúncio.");
            return transaction.interesse_anuncio.create({
                data: {
                    anuncio_id: anuncioId,
                    usuario_id: userId,
                    mensagem: message?.trim() || null,
                },
            });
        });
    }

    listInterests(anuncioId: string) {
        return this.prisma.interesse_anuncio.findMany({
            where: { anuncio_id: anuncioId },
            include: { usuario: { select: { id: true, nome: true, email: true, foto_url: true } } },
            orderBy: { id: "desc" },
        });
    }

    updateInterest(anuncioId: string, interestId: string, status: status_interesse_anuncio_enum) {
        return this.prisma.interesse_anuncio.updateMany({
            where: { id: interestId, anuncio_id: anuncioId, status: "PENDENTE" },
            data: { status },
        });
    }
}
