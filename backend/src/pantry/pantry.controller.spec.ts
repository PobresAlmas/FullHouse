import { ValidationPipe } from "@nestjs/common";
import { GUARDS_METADATA, PATH_METADATA, PIPES_METADATA } from "@nestjs/common/constants";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { PantryController } from "./pantry.controller.js";

describe("PantryController", () => {
    let service: Record<string, ReturnType<typeof vi.fn>>;
    let controller: PantryController;

    beforeEach(() => {
        service = {
            findMembers: vi.fn().mockResolvedValue([]),
            findItems: vi.fn().mockResolvedValue([]),
            createItem: vi.fn().mockResolvedValue({ id: "item-1" }),
            updateItem: vi.fn().mockResolvedValue({ id: "item-1" }),
            createMovement: vi.fn().mockResolvedValue({ id: "item-1" }),
            removeItem: vi.fn().mockResolvedValue({ id: "item-1", deleted: true }),
        };
        controller = new PantryController(service as never);
    });

    it("protects pantry endpoints with JWT authentication and request validation", () => {
        expect(Reflect.getMetadata(PATH_METADATA, PantryController)).toBe(
            "residences/:residenceId/pantry"
        );
        expect(Reflect.getMetadata(GUARDS_METADATA, PantryController)).toContain(JwtAuthGuard);
        const [pipe] = Reflect.getMetadata(PIPES_METADATA, PantryController) as ValidationPipe[];
        expect(pipe).toBeInstanceOf(ValidationPipe);
        expect(pipe.validatorOptions.whitelist).toBe(true);
        expect(pipe.isTransformEnabled).toBe(true);
    });

    it("keeps the pantry endpoint paths attached to their handlers", () => {
        const handlers = PantryController.prototype;
        expect(Reflect.getMetadata(PATH_METADATA, handlers.findMembers)).toBe("members");
        expect(Reflect.getMetadata(PATH_METADATA, handlers.findItems)).toBe("items");
        expect(Reflect.getMetadata(PATH_METADATA, handlers.createItem)).toBe("items");
        expect(Reflect.getMetadata(PATH_METADATA, handlers.updateItem)).toBe("items/:itemId");
        expect(Reflect.getMetadata(PATH_METADATA, handlers.createMovement)).toBe(
            "items/:itemId/movements"
        );
        expect(Reflect.getMetadata(PATH_METADATA, handlers.removeItem)).toBe("items/:itemId");
    });

    it("forwards each route's residence, authenticated user, resource, and payload", async () => {
        const user = { id: "user-1" };
        const itemData = { name: "Arroz" } as never;
        const movementData = { type: "CONSUMO", quantity: 1 } as never;
        const query = { search: "arroz" } as never;

        await controller.findMembers("home-1", user);
        await controller.findItems("home-1", query, user);
        await controller.createItem("home-1", itemData, user);
        await controller.updateItem("home-1", "item-1", itemData, user);
        await controller.createMovement("home-1", "item-1", movementData, user);
        await controller.removeItem("home-1", "item-1", user);

        expect(service.findMembers).toHaveBeenCalledWith("home-1", "user-1");
        expect(service.findItems).toHaveBeenCalledWith("home-1", "user-1", "arroz");
        expect(service.createItem).toHaveBeenCalledWith("home-1", itemData, "user-1");
        expect(service.updateItem).toHaveBeenCalledWith("home-1", "item-1", itemData, "user-1");
        expect(service.createMovement).toHaveBeenCalledWith(
            "home-1",
            "item-1",
            movementData,
            "user-1"
        );
        expect(service.removeItem).toHaveBeenCalledWith("home-1", "item-1", "user-1");
    });
});
