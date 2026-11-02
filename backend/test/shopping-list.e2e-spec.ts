import { ConflictException, INestApplication, NotFoundException } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types.js";
import { ShoppingListController } from "../src/shopping-list/shopping-list.controller.js";
import { ShoppingListService } from "../src/shopping-list/shopping-list.service.js";
import { createAuthenticatedTestApp } from "./utils/authenticated-test-app.js";

const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";
const RESIDENCE_ID = "4ca328bc-3d0c-4ce7-a26e-e827684cc634";
const ITEM_ID = "bc3c5c4b-3f52-4faf-9341-2370fcde6cee";
const item = {
    id: ITEM_ID,
    name: "Leite",
    quantity: 2,
    unit: "L",
    notes: null,
    status: "PENDENTE",
    createdByName: "Emilson",
    createdAt: "2026-10-30T10:00:00.000Z",
    updatedAt: "2026-10-30T10:00:00.000Z",
    purchasedByName: null,
    purchasedAt: null,
    version: 1,
};

describe("Shopping list HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authenticatedCookie: () => Promise<string>;
    const service = {
        findItems: vi.fn(),
        createItem: vi.fn(),
        updateItem: vi.fn(),
        updateStatus: vi.fn(),
        removeItem: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        service.findItems.mockResolvedValue([item]);
        service.createItem.mockResolvedValue(item);
        service.updateItem.mockResolvedValue({ ...item, name: "Leite integral", version: 2 });
        service.updateStatus.mockResolvedValue({
            ...item,
            status: "COMPRADO",
            purchasedByName: "Emilson",
            purchasedAt: "2026-10-30T12:00:00.000Z",
            version: 2,
        });
        service.removeItem.mockResolvedValue({ id: ITEM_ID, deleted: true });
        const testApp = await createAuthenticatedTestApp({
            controllers: [ShoppingListController],
            providers: [{ provide: ShoppingListService, useValue: service }],
        });
        app = testApp.app;
        authenticatedCookie = () =>
            testApp.authenticatedCookie({ id: USER_ID, email: "resident@example.com" });
    });

    it("requires an authenticated user for the shared list", async () => {
        await request(app.getHttpServer())
            .get(`/residences/${RESIDENCE_ID}/shopping-list/items`)
            .expect(401);
        expect(service.findItems).not.toHaveBeenCalled();
    });

    it("lists and creates items in the residence-scoped route", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .get(`/residences/${RESIDENCE_ID}/shopping-list/items`)
            .set("Cookie", cookie)
            .expect(200)
            .expect([item]);
        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/shopping-list/items`)
            .set("Cookie", cookie)
            .send({ name: "  Leite  integral ", quantity: "2", unit: "L", notes: "  Integral  " })
            .expect(201)
            .expect(item);
        expect(service.findItems).toHaveBeenCalledWith(RESIDENCE_ID, USER_ID);
        expect(service.createItem).toHaveBeenCalledWith(
            RESIDENCE_ID,
            { name: "Leite integral", quantity: 2, unit: "L", notes: "Integral" },
            USER_ID
        );
    });

    it("updates item details with a required concurrency version", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/shopping-list/items/${ITEM_ID}`)
            .set("Cookie", cookie)
            .send({ version: 1, name: " Leite integral " })
            .expect(200)
            .expect({ ...item, name: "Leite integral", version: 2 });
        expect(service.updateItem).toHaveBeenCalledWith(
            RESIDENCE_ID,
            ITEM_ID,
            { version: 1, name: "Leite integral" },
            USER_ID
        );
        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/shopping-list/items/${ITEM_ID}`)
            .set("Cookie", cookie)
            .send({ name: "Missing version" })
            .expect(400);
    });

    it("changes status and records the service response", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/shopping-list/items/${ITEM_ID}/status`)
            .set("Cookie", cookie)
            .send({ version: 1, status: "COMPRADO" })
            .expect(200)
            .expect({
                ...item,
                status: "COMPRADO",
                purchasedByName: "Emilson",
                purchasedAt: "2026-10-30T12:00:00.000Z",
                version: 2,
            });
        expect(service.updateStatus).toHaveBeenCalledWith(
            RESIDENCE_ID,
            ITEM_ID,
            { version: 1, status: "COMPRADO" },
            USER_ID
        );
    });

    it("deletes with the expected version in the query string", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .delete(`/residences/${RESIDENCE_ID}/shopping-list/items/${ITEM_ID}?version=3`)
            .set("Cookie", cookie)
            .expect(200)
            .expect({ id: ITEM_ID, deleted: true });
        expect(service.removeItem).toHaveBeenCalledWith(RESIDENCE_ID, ITEM_ID, 3, USER_ID);

        await request(app.getHttpServer())
            .delete(`/residences/${RESIDENCE_ID}/shopping-list/items/${ITEM_ID}?version=abc`)
            .set("Cookie", cookie)
            .expect(400);
    });

    it("rejects invalid values, unknown properties, and malformed identifiers before service calls", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/shopping-list/items`)
            .set("Cookie", cookie)
            .send({ name: " ", quantity: 0, unit: "BOX" })
            .expect(400);
        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/shopping-list/items`)
            .set("Cookie", cookie)
            .send({ name: "Leite", injectedResidenceId: "foreign" })
            .expect(400);
        await request(app.getHttpServer())
            .get("/residences/not-a-uuid/shopping-list/items")
            .set("Cookie", cookie)
            .expect(400);
        expect(service.createItem).not.toHaveBeenCalled();
        expect(service.findItems).not.toHaveBeenCalled();
    });

    it("preserves not-found and stale-version conflicts from the service", async () => {
        const cookie = await authenticatedCookie();
        service.updateItem.mockRejectedValueOnce(new NotFoundException());
        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/shopping-list/items/${ITEM_ID}`)
            .set("Cookie", cookie)
            .send({ version: 1, name: "Leite" })
            .expect(404);
        service.updateStatus.mockRejectedValueOnce(new ConflictException("stale version"));
        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/shopping-list/items/${ITEM_ID}/status`)
            .set("Cookie", cookie)
            .send({ version: 1, status: "COMPRADO" })
            .expect(409);
    });

    afterEach(async () => {
        await app.close();
    });
});
