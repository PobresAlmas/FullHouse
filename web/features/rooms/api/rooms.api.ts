import { api } from "@/services/api";

export type RoomStatus = "ABERTO" | "FECHADO";
export type RoomType = "QUARTO_INDIVIDUAL" | "VAGA_COMPARTILHADA" | "REPUBLICA";

export interface RoomListing {
    id: string;
    titulo: string;
    descricao: string | null;
    preco: number;
    cidade: string;
    bairro: string | null;
    enderecoCompleto: string | null;
    exibeEnderecoCompleto: boolean;
    contato: string | null;
    exibeContato: boolean;
    perfilConvivencia: string | null;
    tipoMoradia: RoomType;
    aceitaPets: boolean;
    fotos: string[];
    status: RoomStatus;
    criadoEm: string;
    atualizadoEm: string;
}

export interface RoomListingInput {
    casaId: string;
    titulo: string;
    descricao?: string;
    preco: number;
    cidade: string;
    bairro?: string;
    enderecoCompleto?: string;
    exibeEnderecoCompleto?: boolean;
    contato: string;
    exibeContato?: boolean;
    perfilConvivencia?: string;
    tipoMoradia?: RoomType;
    aceitaPets?: boolean;
    fotos?: string[];
}

export type RoomListingFilters = {
    cidade?: string;
    bairro?: string;
    precoMin?: number;
    precoMax?: number;
    tipoMoradia?: RoomType;
    aceitaPets?: boolean;
    status?: RoomStatus;
    page?: number;
    limit?: number;
};

export interface RoomListingPage {
    data: RoomListing[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface RoomInterest {
    id: string;
    anuncio_id: string;
    usuario_id: string;
    mensagem: string | null;
    status: "PENDENTE" | "ACEITO" | "RECUSADO";
    usuario: { id: string; nome: string; email: string; foto_url: string | null };
}

export async function searchRoomListings(filters: RoomListingFilters = {}) {
    const response = await api.get<RoomListingPage>("/rooms/listings", { params: filters });
    return response.data;
}

export async function getRoomListing(id: string) {
    const response = await api.get<RoomListing>(`/rooms/listings/${id}`);
    return response.data;
}

export async function getMyRoomListings(casaId?: string) {
    const response = await api.get<RoomListing[]>("/rooms/listings/mine", {
        params: casaId ? { casaId } : undefined,
    });
    return response.data;
}

export async function createRoomListing(data: RoomListingInput) {
    const response = await api.post<RoomListing>("/rooms/listings", data);
    return response.data;
}

export async function updateRoomListing(
    id: string,
    data: Partial<Omit<RoomListingInput, "casaId">> & { status?: RoomStatus }
) {
    const response = await api.patch<RoomListing>(`/rooms/listings/${id}`, data);
    return response.data;
}

export async function deleteRoomListing(id: string) {
    await api.delete(`/rooms/listings/${id}`);
}

export async function uploadRoomPhoto(casaId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post<{ url: string }>("/rooms/listings/photos", form, {
        params: { casaId },
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url;
}

export async function expressRoomInterest(id: string, mensagem?: string) {
    const response = await api.post<{ id: string; anuncioId: string; status: string }>(
        `/rooms/listings/${id}/interests`,
        { mensagem }
    );
    return response.data;
}

export async function getRoomInterests(id: string) {
    const response = await api.get<RoomInterest[]>(`/rooms/listings/${id}/interests`);
    return response.data;
}

export async function updateRoomInterest(
    id: string,
    interestId: string,
    status: "ACEITO" | "RECUSADO"
) {
    const response = await api.patch(`/rooms/listings/${id}/interests/${interestId}`, { status });
    return response.data;
}
