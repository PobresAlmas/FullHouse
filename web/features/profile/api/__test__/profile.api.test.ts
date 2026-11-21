import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { updateProfile, uploadProfilePhoto } from "../profile.api";

vi.mock("@/services/api", () => ({
    api: { patch: vi.fn(), post: vi.fn() },
}));

describe("profile API", () => {
    beforeEach(() => vi.clearAllMocks());

    it("patches profile fields and returns the server response", async () => {
        vi.mocked(api.patch).mockResolvedValue({ data: { name: "Ana" } });
        const result = await updateProfile({ name: "Ana", avatarBackgroundColor: "#e8f3e8" });
        expect(api.patch).toHaveBeenCalledWith("/users/me", {
            name: "Ana",
            avatarBackgroundColor: "#e8f3e8",
        });
        expect(result).toEqual({ name: "Ana" });
    });

    it("sends a photo as multipart form data without hand-setting its content type", async () => {
        vi.mocked(api.post).mockResolvedValue({ data: { photo: "https://cdn.test/a.png" } });
        const photo = new File(["image bytes"], "avatar.png", { type: "image/png" });

        await expect(uploadProfilePhoto(photo)).resolves.toEqual({
            photo: "https://cdn.test/a.png",
        });

        expect(api.post).toHaveBeenCalledOnce();
        const [url, body] = vi.mocked(api.post).mock.calls[0];
        expect(url).toBe("/users/me/avatar");
        expect(body).toBeInstanceOf(FormData);
        expect((body as FormData).get("photo")).toBe(photo);
        expect(vi.mocked(api.post).mock.calls[0][2]).toBeUndefined();
    });

    it("propagates transport errors to the profile screen", async () => {
        const error = new Error("Upload failed");
        vi.mocked(api.post).mockRejectedValue(error);
        await expect(
            uploadProfilePhoto(new File(["x"], "a.jpg", { type: "image/jpeg" }))
        ).rejects.toBe(error);
    });
});
