import type { CreationEditPolicy, ResidenceRole } from "./api/residences.api";

export function isResidenceManager(role?: ResidenceRole | null) {
    return role === "LIDER" || role === "ADMINISTRADOR";
}

export function canCreateOrEditResidenceContent(
    role: ResidenceRole | null | undefined,
    policy: CreationEditPolicy | undefined,
    override?: boolean | null
) {
    return isResidenceManager(role) || (role === "MORADOR" && (override ?? policy === "TODOS"));
}
