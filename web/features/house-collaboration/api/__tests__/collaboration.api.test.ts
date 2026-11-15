import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { createChatEventSource, getChat, getChatMessages, sendChatMessage } from "../chat.api";
import { createHouseRule, getHouseRules, updateHouseRule } from "../house-rules.api";
import {
    cancelMeeting,
    createMeeting,
    getMeetings,
    respondToMeeting,
    rescheduleMeeting,
} from "../meetings.api";

vi.mock("@/services/api", () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe("house collaboration API clients", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        class FakeEventSource {
            url: string;
            withCredentials: boolean;
            constructor(url: string, options?: EventSourceInit) {
                this.url = url;
                this.withCredentials = options?.withCredentials ?? false;
            }
        }
        vi.stubGlobal("EventSource", FakeEventSource);
    });

    it("loads chat history, fetches after an event ID, and sends text", async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { messages: [] } });
        await getChat("home-1");
        expect(api.get).toHaveBeenCalledWith("/residences/home-1/chat");
        vi.mocked(api.get).mockResolvedValue({ data: [] });
        await getChatMessages("home-1", "message-7");
        expect(api.get).toHaveBeenCalledWith("/residences/home-1/chat/messages", {
            params: { afterId: "message-7" },
        });
        vi.mocked(api.post).mockResolvedValue({ data: { id: "message-8" } });
        await sendChatMessage("home-1", "Olá");
        expect(api.post).toHaveBeenCalledWith("/residences/home-1/chat/messages", {
            content: "Olá",
        });
    });

    it("uses the authenticated SSE endpoint with cookies", () => {
        const source = createChatEventSource("home-1");
        expect(source).toBeInstanceOf(EventSource);
        expect(source.url).toContain("/residences/home-1/chat/stream");
        expect(source.withCredentials).toBe(true);
    });

    it("lists, creates, and edits residence rules", async () => {
        vi.mocked(api.get).mockResolvedValue({ data: [] });
        await getHouseRules("home-1");
        expect(api.get).toHaveBeenCalledWith("/residences/home-1/rules");
        vi.mocked(api.post).mockResolvedValue({ data: { id: "rule-1" } });
        await createHouseRule("home-1", { title: "Silêncio", description: "Após 22h" });
        expect(api.post).toHaveBeenCalledWith("/residences/home-1/rules", {
            title: "Silêncio",
            description: "Após 22h",
        });
        vi.mocked(api.patch).mockResolvedValue({ data: { id: "rule-1" } });
        await updateHouseRule("home-1", "rule-1", { title: "Silêncio", description: "Após 23h" });
        expect(api.patch).toHaveBeenCalledWith("/residences/home-1/rules/rule-1", {
            title: "Silêncio",
            description: "Após 23h",
        });
    });

    it("supports meeting scheduling, invitation responses, rescheduling, and cancellation", async () => {
        const draft = { dateTime: "2027-01-02T10:00:00.000Z", agenda: "Pauta" };
        vi.mocked(api.get).mockResolvedValue({ data: [] });
        await getMeetings("home-1");
        expect(api.get).toHaveBeenCalledWith("/residences/home-1/meetings");
        vi.mocked(api.post).mockResolvedValue({ data: { id: "meeting-1" } });
        await createMeeting("home-1", draft);
        expect(api.post).toHaveBeenCalledWith("/residences/home-1/meetings", draft);
        vi.mocked(api.patch).mockResolvedValue({ data: { id: "meeting-1" } });
        await respondToMeeting("home-1", "meeting-1", "CONFIRMADO");
        await rescheduleMeeting("home-1", "meeting-1", draft);
        await cancelMeeting("home-1", "meeting-1");
        expect(api.patch).toHaveBeenNthCalledWith(
            1,
            "/residences/home-1/meetings/meeting-1/respond",
            { response: "CONFIRMADO" }
        );
        expect(api.patch).toHaveBeenNthCalledWith(
            2,
            "/residences/home-1/meetings/meeting-1/reschedule",
            draft
        );
        expect(api.patch).toHaveBeenNthCalledWith(
            3,
            "/residences/home-1/meetings/meeting-1/cancel"
        );
    });
});
