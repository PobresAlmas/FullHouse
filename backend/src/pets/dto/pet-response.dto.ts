import { PetCareType } from "./create-pet-care-log.dto.js";

export class PetCareLogResponseDto {
    id!: string;
    petId!: string;
    type!: PetCareType;
    title!: string;
    description!: string | null;
    date!: string;
    cost!: number | null;
    paidById!: string | null;
    expenseId!: string | null;
    createdById!: string;
    createdAt!: string;
}

export class PetResponseDto {
    id!: string;
    name!: string;
    species!: string;
    breed!: string | null;
    birthDate!: string | null;
    residenceId!: string;
    photoUrl!: string | null;
    createdById!: string;
    createdAt!: string;
    careLogs?: PetCareLogResponseDto[];
}
