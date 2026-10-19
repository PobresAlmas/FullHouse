import { api } from "@/services/api";

export interface PetResidence {
    id: string;
    name: string;
    city: string | null;
    neighborhood: string | null;
    status: string;
    membership: { id: string; role: "LIDER" | "ADMINISTRADOR" | "MORADOR" } | null;
}

export interface PetResidenceMember {
    id: string;
    name: string;
    role: "LIDER" | "ADMINISTRADOR" | "MORADOR";
}

export type PetCareType = "VACCINE" | "FOOD" | "VET_VISIT" | "MEDICATION" | "OTHER";

export interface PetCareLog {
    id: string;
    petId: string;
    type: PetCareType;
    title: string;
    description: string | null;
    date: string;
    cost: number | null;
    paidById: string | null;
    expenseId: string | null;
    createdById: string;
    createdAt: string;
}

export interface Pet {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    birthDate: string | null;
    residenceId: string;
    photoUrl: string | null;
    createdById: string;
    createdAt: string;
    careLogs?: PetCareLog[];
}

export interface PetInput {
    name: string;
    species: string;
    breed?: string | null;
    birthDate?: string | null;
    photoUrl?: string | null;
}

export interface PetCareLogInput {
    type: PetCareType;
    title: string;
    description?: string | null;
    date: string;
    cost?: number | null;
    paidById?: string | null;
    expenseId?: string | null;
}

export async function getPetResidences(): Promise<PetResidence[]> {
    const response = await api.get<PetResidence[]>("/residences");
    return response.data;
}

export async function getPetResidenceMembers(residenceId: string): Promise<PetResidenceMember[]> {
    const response = await api.get<PetResidenceMember[]>("/residences/" + residenceId + "/members");
    return response.data;
}

export async function getPets(residenceId: string, search?: string): Promise<Pet[]> {
    const response = await api.get<Pet[]>("/residences/" + residenceId + "/pets", {
        params: { search },
    });
    return response.data;
}

export async function getPet(residenceId: string, petId: string): Promise<Pet> {
    const response = await api.get<Pet>("/residences/" + residenceId + "/pets/" + petId);
    return response.data;
}

export async function createPet(residenceId: string, data: PetInput): Promise<Pet> {
    const response = await api.post<Pet>("/residences/" + residenceId + "/pets", data);
    return response.data;
}

export async function updatePet(residenceId: string, petId: string, data: PetInput): Promise<Pet> {
    const response = await api.patch<Pet>("/residences/" + residenceId + "/pets/" + petId, data);
    return response.data;
}

export async function deletePet(residenceId: string, petId: string): Promise<void> {
    await api.delete("/residences/" + residenceId + "/pets/" + petId);
}

export async function getPetCareLogs(petId: string): Promise<PetCareLog[]> {
    const response = await api.get<PetCareLog[]>("/pets/" + petId + "/care-logs");
    return response.data;
}

export async function createPetCareLog(petId: string, data: PetCareLogInput): Promise<PetCareLog> {
    const response = await api.post<PetCareLog>("/pets/" + petId + "/care-logs", data);
    return response.data;
}

export async function updatePetCareLog(
    petId: string,
    careLogId: string,
    data: Partial<PetCareLogInput>
): Promise<PetCareLog> {
    const response = await api.patch<PetCareLog>(
        "/pets/" + petId + "/care-logs/" + careLogId,
        data
    );
    return response.data;
}

export async function deletePetCareLog(petId: string, careLogId: string): Promise<void> {
    await api.delete("/pets/" + petId + "/care-logs/" + careLogId);
}
