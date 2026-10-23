import type { Residence } from "@/features/residences/api/residences.api";

export function createResidenceFixture(overrides: Partial<Residence> = {}): Residence {
    return {
        id: "00000000-0000-4000-8000-000000000002",
        name: "Casa do Vale",
        city: "Fortaleza",
        neighborhood: "Centro",
        status: "ATIVA",
        membership: { id: "member-1", role: "ADMINISTRADOR" },
        creationEditPolicy: "TODOS",
        ...overrides,
    };
}
