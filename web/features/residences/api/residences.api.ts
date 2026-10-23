import { api } from "@/services/api";

export type ResidenceRole = "LIDER" | "ADMINISTRADOR" | "MORADOR";
export type CreationEditPolicy = "TODOS" | "LIDERES";

export interface Residence {
    id: string;
    name: string;
    city: string | null;
    neighborhood: string | null;
    status: string;
    membership: { id: string; role: ResidenceRole } | null;
    creationEditPolicy: CreationEditPolicy;
}

export interface ResidencePermissionSettings {
    residenceId: string;
    creationEditPolicy: CreationEditPolicy;
    canManage: boolean;
}

export async function getResidences(): Promise<Residence[]> {
    const response = await api.get<Residence[]>("/residences");
    return response.data;
}

export async function getResidencePermissionSettings(
    residenceId: string
): Promise<ResidencePermissionSettings> {
    const response = await api.get<ResidencePermissionSettings>(
        `/residences/${residenceId}/settings/permissions`
    );
    return response.data;
}

export async function updateResidencePermissionSettings(
    residenceId: string,
    creationEditPolicy: CreationEditPolicy
): Promise<ResidencePermissionSettings> {
    const response = await api.patch<ResidencePermissionSettings>(
        `/residences/${residenceId}/settings/permissions`,
        { creationEditPolicy }
    );
    return response.data;
}
