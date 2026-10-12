import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types.js";
import { JwtAuthGuard } from "../src/auth/guards/jwt-auth-guard.js";
import { PetsController } from "../src/pets/pets.controller.js";
import { PetsService } from "../src/pets/pets.service.js";

describe("Pets API (e2e)", () => {
    let app: INestApplication<App>;
    const pet = {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Mel",
        species: "Cachorro",
        breed: null,
        birthDate: null,
        residenceId: "00000000-0000-4000-8000-000000000002",
        photoUrl: null,
        createdById: "participation-1",
        createdAt: "2026-10-11T12:00:00.000Z",
    };
    const careId = "00000000-0000-4000-8000-000000000003";
    const service = {
        findResidences: vi.fn().mockResolvedValue([]),
        findResidenceMembers: vi.fn().mockResolvedValue([]),
        findAll: vi.fn().mockResolvedValue([pet]),
        findOne: vi.fn().mockResolvedValue({ ...pet, careLogs: [] }),
        create: vi.fn().mockResolvedValue(pet),
        update: vi.fn().mockResolvedValue({ ...pet, name: "Thor" }),
        remove: vi.fn().mockResolvedValue({ id: pet.id, deleted: true }),
        findCareLogs: vi.fn().mockResolvedValue([]),
        createCareLog: vi.fn().mockResolvedValue({ id: careId }),
        updateCareLog: vi.fn().mockResolvedValue({ id: careId }),
        removeCareLog: vi.fn().mockResolvedValue({ id: careId, deleted: true }),
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [PetsController],
            providers: [{ provide: PetsService, useValue: service }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }) => {
                    context.switchToHttp().getRequest().user = { id: "user-1" };
                    return true;
                },
            })
            .compile();
        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it("lists pets for a residence", async () => {
        await request(app.getHttpServer())
            .get("/residences/" + pet.residenceId + "/pets")
            .expect(200)
            .expect([pet]);
        expect(service.findAll).toHaveBeenCalledWith(pet.residenceId, "user-1", undefined);
    });

    it("validates request bodies and creates a pet", async () => {
        await request(app.getHttpServer())
            .post("/residences/" + pet.residenceId + "/pets")
            .send({ name: "Mel", species: "Cachorro", residenceId: "untrusted" })
            .expect(201)
            .expect(pet);
        expect(service.create).toHaveBeenCalledWith(
            pet.residenceId,
            { name: "Mel", species: "Cachorro" },
            "user-1",
        );
    });

    it("returns pet details with care history", async () => {
        await request(app.getHttpServer())
            .get("/residences/" + pet.residenceId + "/pets/" + pet.id)
            .expect(200)
            .expect({ ...pet, careLogs: [] });
    });

    it("updates and deletes a pet through the residence-scoped routes", async () => {
        await request(app.getHttpServer())
            .patch("/residences/" + pet.residenceId + "/pets/" + pet.id)
            .send({ name: "Thor" })
            .expect(200)
            .expect({ ...pet, name: "Thor" });
        await request(app.getHttpServer())
            .delete("/residences/" + pet.residenceId + "/pets/" + pet.id)
            .expect(200)
            .expect({ id: pet.id, deleted: true });
    });

    it("creates, lists, updates, and deletes care records under the pet route", async () => {
        await request(app.getHttpServer())
            .post("/pets/" + pet.id + "/care-logs")
            .send({ type: "VACCINE", title: "Vacina anual", date: "2026-10-11" })
            .expect(201)
            .expect({ id: careId });
        await request(app.getHttpServer())
            .get("/pets/" + pet.id + "/care-logs")
            .expect(200)
            .expect([]);
        await request(app.getHttpServer())
            .patch("/pets/" + pet.id + "/care-logs/" + careId)
            .send({ title: "Reforço anual" })
            .expect(200)
            .expect({ id: careId });
        await request(app.getHttpServer())
            .delete("/pets/" + pet.id + "/care-logs/" + careId)
            .expect(200)
            .expect({ id: careId, deleted: true });
    });

    it("rejects invalid care date ranges", async () => {
        await request(app.getHttpServer())
            .get("/pets/" + pet.id + "/care-logs?from=2026-10-12&to=2026-10-10")
            .expect(400);
        expect(service.findCareLogs).not.toHaveBeenCalled();
    });
});
