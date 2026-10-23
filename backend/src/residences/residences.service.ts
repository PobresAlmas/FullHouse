import { Injectable } from "@nestjs/common";
import { CreateResidenceDto } from "./dto/create-residence.dto.js";
import { ResidencesRepository } from "./residences.repository.js";

@Injectable()
export class ResidencesService {
    constructor(private readonly repository: ResidencesRepository) {}

    async create(data: CreateResidenceDto, userId: string) {
        const { residence, membership } = await this.repository.create(data.name.trim(), userId);

        return {
            id: residence.id,
            name: residence.nome,
            city: residence.cidade,
            neighborhood: residence.bairro,
            status: residence.status,
            membership: { id: membership.id, role: membership.papel },
            creationEditPolicy: "TODOS" as const,
        };
    }
}
