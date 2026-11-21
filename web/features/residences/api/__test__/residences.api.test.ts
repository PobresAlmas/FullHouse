import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import {
    createResidence,
    getResidences,
    getResidencePermissionSettings,
    getResidenceMembers,
    updateResidencePermissionSettings,
    updateResidenceName,
} from "../residences.api";

vi.mock("@/services/api", () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe("residences API client", () => {
    beforeEach(() => vi.clearAllMocks());

    it("loads and creates residences", async () => {
        const residence = { id: "home-1", name: "Casa Azul" };
        vi.mocked(api.get).mockResolvedValue({ data: [residence] });
        vi.mocked(api.post).mockResolvedValue({ data: residence });

        await expect(getResidences()).resolves.toEqual([residence]);
        expect(api.get).toHaveBeenCalledWith("/residences");
        await expect(createResidence("Casa Azul")).resolves.toEqual(residence);
        expect(api.post).toHaveBeenCalledWith("/residences", { name: "Casa Azul" });
    });

    it("loads and updates permission settings for a residence", async () => {
        const settings = {
            residenceId: "home-1",
            creationEditPolicy: "LIDERES" as const,
            canManage: true,
        };
        vi.mocked(api.get).mockResolvedValue({ data: settings });
        vi.mocked(api.patch).mockResolvedValue({ data: settings });

        await expect(getResidencePermissionSettings("home-1")).resolves.toEqual(settings);
        expect(api.get).toHaveBeenCalledWith("/residences/home-1/settings/permissions");
        await expect(updateResidencePermissionSettings("home-1", "LIDERES")).resolves.toEqual(
            settings
        );
        expect(api.patch).toHaveBeenCalledWith("/residences/home-1/settings/permissions", {
            creationEditPolicy: "LIDERES",
        });
    });

    it("loads public member DTOs and updates a residence name via the residence API", async () => {
        const members = [{ id: "member-1", name: "Ana", role: "LIDER" as const }];
        const residence = {
            id: "home-1",
            name: "Casa Nova",
            city: null,
            neighborhood: null,
            status: "ATIVA",
        };
        vi.mocked(api.get).mockResolvedValue({ data: members });
        vi.mocked(api.patch).mockResolvedValue({ data: residence });

        await expect(getResidenceMembers("home-1")).resolves.toEqual(members);
        expect(api.get).toHaveBeenCalledWith("/residences/home-1/settings/members");
        await expect(updateResidenceName("home-1", "Casa Nova")).resolves.toEqual(residence);
        expect(api.patch).toHaveBeenCalledWith("/residences/home-1", { name: "Casa Nova" });
    });
});
