import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import type { tipo_cuidado_pet_enum as PrismaPetCareType } from "../generated/prisma/enums.js";
import { CreatePetCareLogDto } from "./dto/create-pet-care-log.dto.js";
import { CreatePetDto } from "./dto/create-pet.dto.js";
import { PetCareLogResponseDto, PetResponseDto } from "./dto/pet-response.dto.js";
import { UpdatePetCareLogDto } from "./dto/update-pet-care-log.dto.js";
import { UpdatePetDto } from "./dto/update-pet.dto.js";
import { PetsRepository } from "./pets.repository.js";

function dateToString(date: Date | null) {
    return date?.toISOString().slice(0, 10) ?? null;
}

type CareLogRecord = {
    id: string;
    pet_id: string;
    tipo: PrismaPetCareType;
    titulo: string;
    descricao: string | null;
    data_cuidado: Date;
    valor: { toNumber: () => number } | null;
    pago_por_participacao_id: string | null;
    despesa_id: string | null;
    registrado_por_participacao_id: string;
    criado_em: Date;
};

@Injectable()
export class PetsService {
    constructor(private readonly repository: PetsRepository) {}

    async findResidences(userId: string) {
        const residences = await this.repository.findResidencesForUser(userId);
        return residences.map((residence) => ({
            id: residence.id,
            name: residence.nome,
            city: residence.cidade,
            neighborhood: residence.bairro,
            status: residence.status,
            membership: residence.participacao[0]
                ? { id: residence.participacao[0].id, role: residence.participacao[0].papel }
                : null,
        }));
    }

    async findResidenceMembers(residenceId: string, userId: string) {
        await this.requireResidence(residenceId, userId);
        const members = await this.repository.findResidenceMembers(residenceId);
        return members.map((member) => ({
            id: member.id,
            name: member.usuario.apelido || member.usuario.nome,
            role: member.papel,
        }));
    }

    async findAll(residenceId: string, userId: string, search?: string) {
        await this.requireResidence(residenceId, userId);
        const pets = await this.repository.findPets(residenceId, search?.trim() || undefined);
        return pets.map((pet) => this.mapPet(pet));
    }

    async findOne(residenceId: string, petId: string, userId: string) {
        await this.requireResidence(residenceId, userId);
        const pet = await this.repository.findPet(residenceId, petId);
        if (!pet) throw new NotFoundException("O pet não está disponível.");
        return this.mapPet(pet, true);
    }

    async create(residenceId: string, data: CreatePetDto, userId: string) {
        const residence = await this.requireResidence(residenceId, userId);
        const pet = await this.repository.createPet({
            residenceId,
            createdById: residence.participacao[0].id,
            ...data,
        });
        return this.mapPet(pet);
    }

    async update(residenceId: string, petId: string, data: UpdatePetDto, userId: string) {
        await this.requireResidence(residenceId, userId);
        const pet = await this.repository.findPet(residenceId, petId);
        if (!pet) throw new NotFoundException("O pet não está disponível.");
        const updated = await this.repository.updatePet(petId, data);
        return this.mapPet(updated);
    }

    async remove(residenceId: string, petId: string, userId: string) {
        await this.requireResidence(residenceId, userId);
        const pet = await this.repository.findPetForUser(petId, userId);
        if (!pet || pet.casa.id !== residenceId) {
            throw new NotFoundException("O pet não está disponível.");
        }

        const currentMembership = pet.casa.participacao[0];
        if (
            pet.participacao.usuario_id !== userId &&
            currentMembership?.papel !== "ADMINISTRADOR"
        ) {
            throw new ForbiddenException(
                "Somente quem cadastrou o pet ou um administrador pode removê-lo."
            );
        }

        await this.repository.deletePet(petId);
        return { id: petId, deleted: true };
    }

    async findCareLogs(
        petId: string,
        userId: string,
        filters: { type?: string; from?: string; to?: string }
    ) {
        const pet = await this.requirePetForUser(petId, userId);
        const logs = await this.repository.findPetCareLogs(pet.id, {
            type: filters.type as PrismaPetCareType | undefined,
            from: filters.from,
            to: filters.to,
        });
        return logs.map((log) => this.mapCareLog(log));
    }

    async createCareLog(petId: string, data: CreatePetCareLogDto, userId: string) {
        const pet = await this.requirePetForUser(petId, userId);
        const membership = pet.casa.participacao[0];
        await this.validateCareReferences(pet.casa.id, data.paidById, data.expenseId);
        const log = await this.repository.createCareLog({
            petId,
            createdById: membership.id,
            ...data,
            type: data.type as PrismaPetCareType,
        });
        return this.mapCareLog(log);
    }

    async updateCareLog(
        petId: string,
        careLogId: string,
        data: UpdatePetCareLogDto,
        userId: string
    ) {
        const pet = await this.requirePetForUser(petId, userId);
        const existing = await this.repository.findCareLog(petId, careLogId);
        if (!existing) throw new NotFoundException("O registro de cuidado não está disponível.");
        await this.validateCareReferences(pet.casa.id, data.paidById, data.expenseId);
        const log = await this.repository.updateCareLog(careLogId, {
            ...data,
            type: data.type as PrismaPetCareType | undefined,
        });
        return this.mapCareLog(log);
    }

    async removeCareLog(petId: string, careLogId: string, userId: string) {
        await this.requirePetForUser(petId, userId);
        const existing = await this.repository.findCareLog(petId, careLogId);
        if (!existing) throw new NotFoundException("O registro de cuidado não está disponível.");
        await this.repository.deleteCareLog(careLogId);
        return { id: careLogId, deleted: true };
    }

    private async requireResidence(residenceId: string, userId: string) {
        const residence = await this.repository.findResidenceMembership(residenceId, userId);
        if (!residence || residence.participacao.length === 0) {
            throw new NotFoundException("A residência não está disponível.");
        }
        return residence;
    }

    private async requirePetForUser(petId: string, userId: string) {
        const pet = await this.repository.findPetForUser(petId, userId);
        if (!pet || pet.casa.participacao.length === 0) {
            throw new NotFoundException("O pet não está disponível.");
        }
        return pet;
    }

    private async validateCareReferences(
        residenceId: string,
        paidById?: string | null,
        expenseId?: string | null
    ) {
        if (paidById) {
            const participation = await this.repository.findActiveParticipation(
                residenceId,
                paidById
            );
            if (!participation) {
                throw new BadRequestException("O morador pagador não pertence à residência ativa.");
            }
        }
        if (expenseId) {
            const expense = await this.repository.findResidenceExpense(residenceId, expenseId);
            if (!expense) {
                throw new BadRequestException(
                    "A despesa informada não pertence à residência do pet."
                );
            }
        }
    }

    private mapPet(
        pet: {
            id: string;
            casa_id: string;
            nome: string;
            especie: string;
            raca: string | null;
            data_nascimento: Date | null;
            foto_url: string | null;
            criado_por_participacao_id: string;
            criado_em: Date;
            participacao?: { usuario: { id: string; nome: string; apelido: string | null } };
            cuidado_pet?: CareLogRecord[];
        },
        includeCareLogs = false
    ): PetResponseDto {
        return {
            id: pet.id,
            name: pet.nome,
            species: pet.especie,
            breed: pet.raca,
            birthDate: dateToString(pet.data_nascimento),
            residenceId: pet.casa_id,
            photoUrl: pet.foto_url,
            createdById: pet.criado_por_participacao_id,
            createdAt: pet.criado_em.toISOString(),
            ...(includeCareLogs
                ? { careLogs: pet.cuidado_pet?.map((log) => this.mapCareLog(log)) ?? [] }
                : {}),
        };
    }

    private mapCareLog(log: CareLogRecord): PetCareLogResponseDto {
        return {
            id: log.id,
            petId: log.pet_id,
            type: log.tipo as PetCareLogResponseDto["type"],
            title: log.titulo,
            description: log.descricao,
            date: dateToString(log.data_cuidado) ?? "",
            cost: log.valor?.toNumber() ?? null,
            paidById: log.pago_por_participacao_id,
            expenseId: log.despesa_id,
            createdById: log.registrado_por_participacao_id,
            createdAt: log.criado_em.toISOString(),
        };
    }
}
