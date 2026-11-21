import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { getNotifications } from "../notifications.api";

vi.mock("@/services/api", () => ({ api: { get: vi.fn() } }));

describe("notifications API client", () => {
    beforeEach(() => vi.clearAllMocks());

    it("requests the first page with the bounded default page size", async () => {
        const response = { items: [], unreadCount: 0, nextCursor: null };
        vi.mocked(api.get).mockResolvedValue({ data: response });

        await expect(getNotifications()).resolves.toEqual(response);
        expect(api.get).toHaveBeenCalledWith("/notifications", { params: { limit: 20 } });
    });

    it("requests a subsequent cursor page", async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { items: [], unreadCount: 0, nextCursor: null },
        });

        await getNotifications(10, "cursor-id");
        expect(api.get).toHaveBeenCalledWith("/notifications", {
            params: { limit: 10, cursor: "cursor-id" },
        });
    });

    it("requests only unread notifications when requested", async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { items: [], unreadCount: 0, nextCursor: null },
        });

        await getNotifications(10, undefined, true);
        expect(api.get).toHaveBeenCalledWith("/notifications", {
            params: { limit: 10, unreadOnly: true },
        });
    });
});
