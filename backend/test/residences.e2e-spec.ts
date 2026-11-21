import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types.js";
import { ResidenceAccessService } from "../src/residences/residence-access.service.js";
import { ResidencesController } from "../src/residences/residences.controller.js";
import { ResidencesService } from "../src/residences/residences.service.js";
import { createAuthenticatedTestApp } from "./utils/authenticated-test-app.js";

const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";

describe("Residence creation HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authenticatedCookie: () => Promise<string>;
    const residencesService = { create: vi.fn() };
    const residenceAccessService = {
        listForUser: vi.fn(),
        getPermissionSettings: vi.fn(),
        updatePermissionSettings: vi.fn(),
        getPreferences: vi.fn(),
        updatePreferences: vi.fn(),
        updateMemberAccess: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        residencesService.create.mockResolvedValue({
            id: "residence-id",
            name: "Casa do Vale",
            city: null,
            neighborhood: null,
            status: "ATIVA",
            membership: { id: "membership-id", role: "LIDER" },
            creationEditPolicy: "TODOS",
        });
        residenceAccessService.getPreferences.mockResolvedValue({
            notifications: { newTasks: true, newExpenses: true, upcomingDueDates: true, residentInvitations: true, houseUpdates: false },
            pantry: { expirationNoticeDays: 5, showExpired: true },
            finance: { dueNoticeDays: 5, showOverdue: true },
            pets: { vaccineReminders: true, dewormingReminders: true, appointmentReminders: true },
        });
        residenceAccessService.updatePreferences.mockResolvedValue({
            notifications: { newTasks: true, newExpenses: true, upcomingDueDates: true, residentInvitations: true, houseUpdates: false },
            pantry: { expirationNoticeDays: 14, showExpired: false },
            finance: { dueNoticeDays: 5, showOverdue: true },
            pets: { vaccineReminders: true, dewormingReminders: true, appointmentReminders: true },
        });
        const testApp = await createAuthenticatedTestApp({
            controllers: [ResidencesController],
            providers: [
                { provide: ResidencesService, useValue: residencesService },
                { provide: ResidenceAccessService, useValue: residenceAccessService },
            ],
            validateRequests: true,
        });
        app = testApp.app;
        authenticatedCookie = () =>
            testApp.authenticatedCookie({ id: USER_ID, email: "resident@example.com" });
    });

    it("requires authentication", async () => {
        await request(app.getHttpServer()).post("/residences").send({ name: "Casa" }).expect(401);
    });

    it("validates trimmed nonempty names and rejects caller supplied identity or role", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post("/residences")
            .set("Cookie", cookie)
            .send({ name: "   " })
            .expect(400);
        await request(app.getHttpServer())
            .post("/residences")
            .set("Cookie", cookie)
            .send({ name: "Casa", creatorId: USER_ID, role: "LIDER" })
            .expect(400);
        expect(residencesService.create).not.toHaveBeenCalled();
    });

    it("passes only the validated name and JWT identity to the creation service", async () => {
        await request(app.getHttpServer())
            .post("/residences")
            .set("Cookie", await authenticatedCookie())
            .send({ name: "  Casa do Vale  " })
            .expect(201)
            .expect(({ body }) =>
                expect(body).toMatchObject({
                    id: "residence-id",
                    name: "Casa do Vale",
                    membership: { id: "membership-id", role: "LIDER" },
                })
            );
        expect(residencesService.create).toHaveBeenCalledWith({ name: "Casa do Vale" }, USER_ID);
    });

    it("integrates authenticated preference reads and sparse updates with DTO validation", async () => {
        const cookie = await authenticatedCookie();
        const path = "/residences/821f394d-6215-48b4-89a9-0af953ba8a76/settings/preferences";
        await request(app.getHttpServer()).get(path).expect(401);
        await request(app.getHttpServer()).get(path).set("Cookie", cookie).expect(200);
        expect(residenceAccessService.getPreferences).toHaveBeenCalledWith(
            "821f394d-6215-48b4-89a9-0af953ba8a76", USER_ID
        );

        await request(app.getHttpServer()).patch(path).set("Cookie", cookie)
            .send({ pantry: { expirationNoticeDays: 14, showExpired: false } }).expect(200);
        expect(residenceAccessService.updatePreferences).toHaveBeenCalledWith(
            "821f394d-6215-48b4-89a9-0af953ba8a76", USER_ID,
            { pantry: { expirationNoticeDays: 14, showExpired: false } }
        );
        await request(app.getHttpServer()).patch(path).set("Cookie", cookie)
            .send({ pantry: { expirationNoticeDays: 2 } }).expect(400);
        await request(app.getHttpServer()).patch(path).set("Cookie", cookie)
            .send({ pets: { vaccineReminders: "yes" } }).expect(400);
        await request(app.getHttpServer()).get("/residences/not-a-uuid/settings/preferences")
            .set("Cookie", cookie).expect(400);
    });

    it("validates member access overrides including inherited null", async () => {
        const cookie = await authenticatedCookie();
        const path = "/residences/821f394d-6215-48b4-89a9-0af953ba8a76/settings/members/821f394d-6215-48b4-89a9-0af953ba8a76/access";
        residenceAccessService.updateMemberAccess.mockResolvedValue({ id: "member", canEditContent: null });
        await request(app.getHttpServer()).patch(path).set("Cookie", cookie).send({ canEditContent: null }).expect(200);
        expect(residenceAccessService.updateMemberAccess).toHaveBeenCalledWith(
            "821f394d-6215-48b4-89a9-0af953ba8a76", "821f394d-6215-48b4-89a9-0af953ba8a76", USER_ID,
            { canEditContent: null }
        );
        await request(app.getHttpServer()).patch(path).set("Cookie", cookie).send({ canEditContent: "true" }).expect(400);
        await request(app.getHttpServer()).patch(path).set("Cookie", cookie).send({ unexpected: true }).expect(400);
    });

});
