import { api } from "@/services/api";

export const RESIDENCE_MEMBERSHIP_CHANGED_EVENT = "fullhouse:residence-membership-changed";
export type ResidenceRole = "LIDER" | "ADMINISTRADOR" | "MORADOR";
export type CreationEditPolicy = "TODOS" | "LIDERES";

export function announceResidenceMembershipChanged() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(RESIDENCE_MEMBERSHIP_CHANGED_EVENT));
    }
}

export interface Residence {
    id: string;
    name: string;
    city: string | null;
    neighborhood: string | null;
    status: string;
    createdAt?: string;
    membership: { id: string; role: ResidenceRole; canEditContent?: boolean | null } | null;
    creationEditPolicy: CreationEditPolicy;
}

export interface ResidencePermissionSettings {
    residenceId: string;
    creationEditPolicy: CreationEditPolicy;
    canManage: boolean;
}

export interface ResidenceMember {
    id: string;
    name: string;
    role: ResidenceRole;
    userId?: string;
    email?: string;
    photo?: string;
    avatarBackgroundColor?: string;
    canManage?: boolean;
    canEditContent?: boolean;
    accessIsInherited?: boolean;
}

export async function getResidences(): Promise<Residence[]> {
    const response = await api.get<Residence[]>("/residences");
    return response.data;
}

export async function createResidence(name: string): Promise<Residence> {
    const response = await api.post<Residence>("/residences", { name });
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

export async function updateResidenceName(
    residenceId: string,
    name: string
): Promise<Pick<Residence, "id" | "name" | "city" | "neighborhood" | "status">> {
    const response = await api.patch<
        Pick<Residence, "id" | "name" | "city" | "neighborhood" | "status">
    >(`/residences/${residenceId}`, { name });
    return response.data;
}

export async function getResidenceMembers(residenceId: string): Promise<ResidenceMember[]> {
    const response = await api.get<ResidenceMember[]>(
        `/residences/${residenceId}/settings/members`
    );
    return response.data;
}

export async function updateResidenceMemberAccess(
    residenceId: string,
    memberId: string,
    canEditContent: boolean | null
): Promise<ResidenceMember> {
    const response = await api.patch<ResidenceMember>(
        `/residences/${residenceId}/settings/members/${memberId}/access`,
        { canEditContent }
    );
    return response.data;
}

export async function removeResidenceMember(residenceId: string, memberId: string) {
    await api.delete(`/residences/${residenceId}/members/${memberId}`);
}
