import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { getResidencePreferences, updateResidencePreferences } from "../settings.api";

vi.mock("@/services/api", () => ({ api: { get: vi.fn(), patch: vi.fn() } }));

describe("settings preferences API", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches preferences for the requested residence", async () => {
        const preferences = { notifications: { newTasks: false } };
        vi.mocked(api.get).mockResolvedValue({ data: preferences });
        await expect(getResidencePreferences("house-1")).resolves.toEqual(preferences);
        expect(api.get).toHaveBeenCalledWith("/residences/house-1/settings/preferences");
    });

    it("patches only the supplied nested preference fields", async () => {
        const update = { notifications: { houseUpdates: true }, pantry: { showExpired: false } };
        vi.mocked(api.patch).mockResolvedValue({ data: update });
        await expect(updateResidencePreferences("house-1", update)).resolves.toEqual(update);
        expect(api.patch).toHaveBeenCalledWith("/residences/house-1/settings/preferences", update);
    });

    it("propagates API failures instead of silently returning defaults", async () => {
        const error = new Error("No permission");
        vi.mocked(api.get).mockRejectedValue(error);
        await expect(getResidencePreferences("house-2")).rejects.toBe(error);
    });
});
