import type { CreationEditPolicy, ResidenceRole } from "./api/residences.api";

export function isResidenceManager(role?: ResidenceRole | null) {
  return role === "LIDER" || role === "ADMINISTRADOR";
}

export function canCreateOrEditResidenceContent(
  role: ResidenceRole | null | undefined,
  policy: CreationEditPolicy | undefined,
  memberOverride?: boolean | null,
) {
  if (isResidenceManager(role)) return true;
  if (memberOverride !== undefined && memberOverride !== null)
    return memberOverride;
  return policy === "TODOS";
}
