import { ForbiddenException, INestApplication, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import cookieParser from "cookie-parser";
import request from "supertest";
import { App } from "supertest/types.js";
import { JwtStrategy } from "../src/auth/jwt.strategy.js";
import { PantryController } from "../src/pantry/pantry.controller.js";
import { PantryService } from "../src/pantry/pantry.service.js";

const JWT_SECRET = "pantry-e2e-test-secret";
const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";
const RESIDENCE_ID = "4ca328bc-3d0c-4ce7-a26a-e827684cc634";
const ITEM_ID = "bc3c5c4b-3f52-4faf-9341-2370fcde6cee";
const item = {
    id: ITEM_ID,
    name: "Arroz",
    category: "Grãos",
    property: "COMUNITARIO",
    ownerMemberId: null,
    ownerName: "Casa",
    isMine: false,
    unit: "KG",
    quantity: 2.5,
    minimumQuantity: null,
    expirationDate: null,
};

describe("Pantry HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let jwt: JwtService;
    const pantryService = {
        findMembers: vi.fn(),
        findItems: vi.fn(),
        createItem: vi.fn(),
        updateItem: vi.fn(),
        createMovement: vi.fn(),
        removeItem: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        pantryService.findMembers.mockResolvedValue([{ id: "member-1", name: "Emilson" }]);
        pantryService.findItems.mockResolvedValue([item]);
        pantryService.createItem.mockResolvedValue(item);
        pantryService.updateItem.mockResolvedValue(item);
        pantryService.createMovement.mockResolvedValue(item);
        pantryService.removeItem.mockResolvedValue({ id: ITEM_ID, deleted: true });

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                PassportModule,
                JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: "5m" } }),
            ],
            controllers: [PantryController],
            providers: [
                JwtStrategy,
                { provide: ConfigService, useValue: { getOrThrow: () => JWT_SECRET } },
                { provide: PantryService, useValue: pantryService },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        jwt = app.get(JwtService);
    });

    async function authenticatedCookie() {
        const token = await jwt.signAsync({ sub: USER_ID, email: "resident@example.com" });
        return `access_token=${token}`;
    }

    it("requires an authenticated user", async () => {
        await request(app.getHttpServer())
            .get(`/residences/${RESIDENCE_ID}/pantry/items`)
            .expect(401);
    });

    it("lists household members and trims search queries on the HTTP route", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .get(`/residences/${RESIDENCE_ID}/pantry/members`)
            .set("Cookie", cookie)
            .expect(200)
            .expect([{ id: "member-1", name: "Emilson" }]);
        await request(app.getHttpServer())
            .get(`/residences/${RESIDENCE_ID}/pantry/items?search=%20arroz%20`)
            .set("Cookie", cookie)
            .expect(200)
            .expect([item]);
        expect(pantryService.findMembers).toHaveBeenCalledWith(RESIDENCE_ID, USER_ID);
        expect(pantryService.findItems).toHaveBeenCalledWith(RESIDENCE_ID, USER_ID, "arroz");
    });

    it("creates and updates items through validated residence-scoped routes", async () => {
        const cookie = await authenticatedCookie();
        const payload = {
            name: "  Arroz  ",
            category: " Grãos ",
            property: "COMUNITARIO",
            unit: "KG",
            initialQuantity: "2.5",
            untrustedResidenceId: "another-home",
        };
        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/pantry/items`)
            .set("Cookie", cookie)
            .send(payload)
            .expect(201)
            .expect(item);
        expect(pantryService.createItem).toHaveBeenCalledWith(
            RESIDENCE_ID,
            {
                name: "Arroz",
                category: "Grãos",
                property: "COMUNITARIO",
                unit: "KG",
                initialQuantity: 2.5,
            },
            USER_ID
        );

        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/pantry/items/${ITEM_ID}`)
            .set("Cookie", cookie)
            .send({ minimumQuantity: "0.5" })
            .expect(200)
            .expect(item);
        expect(pantryService.updateItem).toHaveBeenCalledWith(
            RESIDENCE_ID,
            ITEM_ID,
            { minimumQuantity: 0.5 },
            USER_ID
        );
    });

    it("validates movement amounts and forwards a numeric quantity", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/pantry/items/${ITEM_ID}/movements`)
            .set("Cookie", cookie)
            .send({ type: "CONSUMO", quantity: "0.5", unexpected: true })
            .expect(201)
            .expect(item);
        expect(pantryService.createMovement).toHaveBeenCalledWith(
            RESIDENCE_ID,
            ITEM_ID,
            { type: "CONSUMO", quantity: 0.5 },
            USER_ID
        );

        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/pantry/items/${ITEM_ID}/movements`)
            .set("Cookie", cookie)
            .send({ type: "CONSUMO", quantity: "0.001" })
            .expect(400);
        expect(pantryService.createMovement).toHaveBeenCalledOnce();
    });

    it("rejects invalid UUIDs and invalid item values before calling the service", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .get("/residences/not-a-uuid/pantry/items")
            .set("Cookie", cookie)
            .expect(400);
        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/pantry/items`)
            .set("Cookie", cookie)
            .send({
                name: "",
                category: "Grãos",
                property: "PUBLICO",
                unit: "KG",
                initialQuantity: 1,
            })
            .expect(400);
        expect(pantryService.findItems).not.toHaveBeenCalled();
        expect(pantryService.createItem).not.toHaveBeenCalled();
    });

    it("registers movements and deletes items through their authenticated routes", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/pantry/items/${ITEM_ID}/movements`)
            .set("Cookie", cookie)
            .send({ type: "ENTRADA", quantity: 1 })
            .expect(201);
        await request(app.getHttpServer())
            .delete(`/residences/${RESIDENCE_ID}/pantry/items/${ITEM_ID}`)
            .set("Cookie", cookie)
            .expect(200)
            .expect({ id: ITEM_ID, deleted: true });
        expect(pantryService.removeItem).toHaveBeenCalledWith(RESIDENCE_ID, ITEM_ID, USER_ID);
    });

    it("preserves authorization and not-found service responses", async () => {
        const cookie = await authenticatedCookie();
        pantryService.createMovement.mockRejectedValueOnce(new ForbiddenException());
        await request(app.getHttpServer())
            .post(`/residences/${RESIDENCE_ID}/pantry/items/${ITEM_ID}/movements`)
            .set("Cookie", cookie)
            .send({ type: "CONSUMO", quantity: 1 })
            .expect(403);

        pantryService.updateItem.mockRejectedValueOnce(new NotFoundException());
        await request(app.getHttpServer())
            .patch(`/residences/${RESIDENCE_ID}/pantry/items/${ITEM_ID}`)
            .set("Cookie", cookie)
            .send({ name: "Arroz integral" })
            .expect(404);
    });

    afterEach(async () => {
        await app.close();
    });
});
