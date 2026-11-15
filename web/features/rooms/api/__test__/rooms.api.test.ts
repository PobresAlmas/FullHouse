import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { createRoomListing, searchRoomListings, updateRoomListing } from "../rooms.api";

vi.mock("@/services/api", () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("room listings API client", () => {
    beforeEach(() => vi.clearAllMocks());

    it("sends cumulative search filters", async () => {
        const page = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
        vi.mocked(api.get).mockResolvedValue({ data: page });
        await expect(
            searchRoomListings({ cidade: "Quixadá", aceitaPets: true, page: 1 })
        ).resolves.toEqual(page);
        expect(api.get).toHaveBeenCalledWith("/rooms/listings", {
            params: { cidade: "Quixadá", aceitaPets: true, page: 1 },
        });
    });

    it("creates and updates only the submitted listing fields", async () => {
        const listing = { id: "listing-1" };
        vi.mocked(api.post).mockResolvedValue({ data: listing });
        await expect(
            createRoomListing({
                casaId: "house-1",
                titulo: "Quarto",
                preco: 450,
                cidade: "Quixadá",
                contato: "(88) 99999-9999",
            })
        ).resolves.toEqual(listing);
        expect(api.post).toHaveBeenCalledWith(
            "/rooms/listings",
            expect.objectContaining({ casaId: "house-1" })
        );
        vi.mocked(api.patch).mockResolvedValue({ data: listing });
        await updateRoomListing("listing-1", { status: "FECHADO" });
        expect(api.patch).toHaveBeenCalledWith("/rooms/listings/listing-1", { status: "FECHADO" });
    });
});
