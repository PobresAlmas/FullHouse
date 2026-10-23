import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { getPersonalHome } from "../home.api";

vi.mock("@/services/api", () => ({
    api: {
        get: vi.fn(),
    },
}));

describe("home API client", () => {
    beforeEach(() => vi.clearAllMocks());

    it("loads the personal Home data from the authenticated endpoint", async () => {
        const data = { tasks: [], expenses: [] };
        vi.mocked(api.get).mockResolvedValue({ data });

        await expect(getPersonalHome()).resolves.toEqual(data);
        expect(api.get).toHaveBeenCalledWith("/home/personal");
    });
});
