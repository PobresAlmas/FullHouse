import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

describe("UsersController", () => {
    let service: {
        findAll: ReturnType<typeof vi.fn>;
        updateAvatar: ReturnType<typeof vi.fn>;
    };
    let controller: UsersController;

    beforeEach(() => {
        service = {
            findAll: vi.fn().mockResolvedValue([{ id: "u1" }]),
            updateAvatar: vi.fn().mockResolvedValue({ id: "u1" }),
        };
        controller = new UsersController(service as unknown as UsersService);
    });

    it("returns all users from the service", async () => {
        await expect(controller.findAll()).resolves.toEqual([{ id: "u1" }]);
        expect(service.findAll).toHaveBeenCalledOnce();
    });

    it("uploads the current user avatar", async () => {
        const file = { originalname: "photo.png" };
        await expect(controller.uploadAvatar(file, { user: { id: "u1" } })).resolves.toEqual({
            id: "u1",
        });
        expect(service.updateAvatar).toHaveBeenCalledWith("u1", file);
    });

    it("propagates avatar update failures", async () => {
        service.updateAvatar.mockRejectedValue(new Error("upload failed"));
        await expect(controller.uploadAvatar({}, { user: { id: "u1" } })).rejects.toThrow(
            "upload failed"
        );
    });
});
