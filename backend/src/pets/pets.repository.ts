import { Injectable } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.js";
import { tipo_cuidado_pet_enum } from "../generated/prisma/enums.js";
import { PrismaService } from "../prisma/prisma.service.js";

function dateFromString(value: string) {
    return new Date(value + "T00:00:00.000Z");
}

@Injectable()
export class PetsRepository {
    constructor(private readonly prisma: PrismaService) {}

    findResidencesForUser(userId: string) {
        return this.prisma.casa.findMany({
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
            },
            orderBy: { nome: "asc" },
        });
    }

    findResidenceMembership(residenceId: string, userId: string) {
        return this.prisma.casa.findFirst({
            where: {
                id: residenceId,
                status: "ATIVA",
                excluido_em: null,
                participacao: { some: { usuario_id: userId, data_saida: null } },
            },
            select: {
                id: true,
                nome: true,
                cidade: true,
                bairro: true,
                participacao: {
                    where: { usuario_id: userId, data_saida: null },
                    select: { id: true, papel: true },
                    take: 1,
                },
            },
        });
    }

    findResidenceMembers(residenceId: string) {
        return this.prisma.participacao.findMany({
            where: { casa_id: residenceId, data_saida: null },
            select: {
                id: true,
                papel: true,
                usuario: { select: { nome: true, apelido: true } },
            },
            orderBy: [{ papel: "asc" }, { id: "asc" }],
        });
    }

    findPets(residenceId: string, search?: string) {
        return this.prisma.pet.findMany({
            where: {
                casa_id: residenceId,
                ...(search ? { nome: { contains: search, mode: "insensitive" } } : {}),
            },
            include: {
                participacao: {
                    select: { usuario: { select: { id: true, nome: true, apelido: true } } },
                },
            },
            orderBy: [{ nome: "asc" }, { id: "asc" }],
        });
    }

    findPet(residenceId: string, petId: string) {
        return this.prisma.pet.findFirst({
            where: { id: petId, casa_id: residenceId },
            include: {
                participacao: {
                    select: { usuario: { select: { id: true, nome: true, apelido: true } } },
                },
                cuidado_pet: {
                    orderBy: [{ data_cuidado: "desc" }, { criado_em: "desc" }],
                    include: {
                        participacao_cuidado_pet_pago_por_participacao_idToparticipacao: {
                            select: {
                                usuario: { select: { id: true, nome: true, apelido: true } },
                            },
                        },
                        participacao_cuidado_pet_registrado_por_participacao_idToparticipacao: {
                            select: {
                                id: true,
                                usuario: { select: { id: true, nome: true, apelido: true } },
                            },
                        },
                    },
                },
            },
        });
    }

    findPetForUser(petId: string, userId: string) {
        return this.prisma.pet.findFirst({
            where: {
                id: petId,
                casa: {
                    is: {
                        status: "ATIVA",
                        excluido_em: null,
                        participacao: { some: { usuario_id: userId, data_saida: null } },
                    },
                },
            },
            include: {
                participacao: { select: { usuario_id: true } },
                casa: {
                    select: {
                        id: true,
                        participacao: {
                            where: { usuario_id: userId, data_saida: null },
                            select: { id: true, papel: true },
                            take: 1,
                        },
                    },
                },
            },
        });
    }

    createPet(data: {
        residenceId: string;
        createdById: string;
        name: string;
        species: string;
        breed?: string | null;
        birthDate?: string | null;
        photoUrl?: string | null;
    }) {
        return this.prisma.pet.create({
            data: {
                casa_id: data.residenceId,
                criado_por_participacao_id: data.createdById,
                nome: data.name,
                especie: data.species,
                raca: data.breed ?? null,
                data_nascimento: data.birthDate ? dateFromString(data.birthDate) : null,
                foto_url: data.photoUrl ?? null,
            },
        });
    }

    updatePet(
        petId: string,
        data: {
            name?: string;
            species?: string;
            breed?: string | null;
            birthDate?: string | null;
            photoUrl?: string | null;
        }
    ) {
        return this.prisma.pet.update({
            where: { id: petId },
            data: {
                ...(data.name !== undefined ? { nome: data.name } : {}),
                ...(data.species !== undefined ? { especie: data.species } : {}),
                ...(data.breed !== undefined ? { raca: data.breed } : {}),
                ...(data.birthDate !== undefined
                    ? { data_nascimento: data.birthDate ? dateFromString(data.birthDate) : null }
                    : {}),
                ...(data.photoUrl !== undefined ? { foto_url: data.photoUrl } : {}),
            },
        });
    }

    deletePet(petId: string) {
        return this.prisma.pet.delete({ where: { id: petId } });
    }

    findPetCareLogs(
        petId: string,
        filters: { type?: tipo_cuidado_pet_enum; from?: string; to?: string }
    ) {
        return this.prisma.cuidado_pet.findMany({
            where: {
                pet_id: petId,
                ...(filters.type ? { tipo: filters.type } : {}),
                ...(filters.from || filters.to
                    ? {
                          data_cuidado: {
                              ...(filters.from ? { gte: dateFromString(filters.from) } : {}),
                              ...(filters.to ? { lte: dateFromString(filters.to) } : {}),
                          },
                      }
                    : {}),
            },
            include: {
                participacao_cuidado_pet_pago_por_participacao_idToparticipacao: {
                    select: { usuario: { select: { id: true, nome: true, apelido: true } } },
                },
                participacao_cuidado_pet_registrado_por_participacao_idToparticipacao: {
                    select: {
                        id: true,
                        usuario: { select: { id: true, nome: true, apelido: true } },
                    },
                },
            },
            orderBy: [{ data_cuidado: "desc" }, { criado_em: "desc" }],
        });
    }

    findActiveParticipation(residenceId: string, participationId: string) {
        return this.prisma.participacao.findFirst({
            where: { id: participationId, casa_id: residenceId, data_saida: null },
            select: { id: true },
        });
    }

    findResidenceExpense(residenceId: string, expenseId: string) {
        return this.prisma.despesa.findFirst({
            where: { id: expenseId, casa_id: residenceId, status: { not: "CANCELADA" } },
            select: { id: true },
        });
    }

    findCareLog(petId: string, careLogId: string) {
        return this.prisma.cuidado_pet.findFirst({
            where: {
                id: careLogId,
                pet_id: petId,
                pet: { is: { casa: { is: { status: "ATIVA", excluido_em: null } } } },
            },
        });
    }

    createCareLog(data: {
        petId: string;
        createdById: string;
        type: tipo_cuidado_pet_enum;
        title: string;
        description?: string | null;
        date: string;
        cost?: number | null;
        paidById?: string | null;
        expenseId?: string | null;
    }) {
        return this.prisma.cuidado_pet.create({
            data: {
                pet_id: data.petId,
                registrado_por_participacao_id: data.createdById,
                tipo: data.type,
                titulo: data.title,
                descricao: data.description ?? null,
                data_cuidado: dateFromString(data.date),
                valor:
                    data.cost === undefined || data.cost === null
                        ? null
                        : new Prisma.Decimal(data.cost),
                pago_por_participacao_id: data.paidById ?? null,
                despesa_id: data.expenseId ?? null,
            },
        });
    }

    updateCareLog(
        careLogId: string,
        data: {
            type?: tipo_cuidado_pet_enum;
            title?: string;
            description?: string | null;
            date?: string;
            cost?: number | null;
            paidById?: string | null;
            expenseId?: string | null;
        }
    ) {
        return this.prisma.cuidado_pet.update({
            where: { id: careLogId },
            data: {
                ...(data.type !== undefined ? { tipo: data.type } : {}),
                ...(data.title !== undefined ? { titulo: data.title } : {}),
                ...(data.description !== undefined ? { descricao: data.description } : {}),
                ...(data.date !== undefined ? { data_cuidado: dateFromString(data.date) } : {}),
                ...(data.cost !== undefined
                    ? { valor: data.cost === null ? null : new Prisma.Decimal(data.cost) }
                    : {}),
                ...(data.paidById !== undefined ? { pago_por_participacao_id: data.paidById } : {}),
                ...(data.expenseId !== undefined ? { despesa_id: data.expenseId } : {}),
            },
        });
    }

    deleteCareLog(careLogId: string) {
        return this.prisma.cuidado_pet.delete({ where: { id: careLogId } });
    }
}
