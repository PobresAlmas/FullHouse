import {
    BadRequestException,
    ForbiddenException,
    INestApplication,
    NotFoundException,
} from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types.js";
import { MeetingsController } from "../src/meetings/meetings.controller.js";
import { MeetingsService } from "../src/meetings/meetings.service.js";
import { createAuthenticatedTestApp } from "./utils/authenticated-test-app.js";

const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";
const HOME_ID = "4ca328bc-3d0c-4ce7-a26a-e827684cc634";
const MEETING_ID = "bc3c5c4b-3f52-4faf-9341-2370fcde6cee";
const futureDate = "2027-01-02T10:00:00.000Z";

describe("Residence meetings HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authenticatedCookie: () => Promise<string>;
    const service = {
        findAll: vi.fn(),
        create: vi.fn(),
        respond: vi.fn(),
        reschedule: vi.fn(),
        cancel: vi.fn(),
        removeCancelled: vi.fn(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        service.findAll.mockResolvedValue([]);
        service.create.mockResolvedValue({ id: MEETING_ID, status: "AGENDADA" });
        service.respond.mockResolvedValue({ id: MEETING_ID });
        service.reschedule.mockResolvedValue({
            id: "replacement-id",
            rescheduledFromId: MEETING_ID,
        });
        service.cancel.mockResolvedValue({ id: MEETING_ID, status: "CANCELADA" });
        service.removeCancelled.mockResolvedValue({ id: MEETING_ID, deleted: true });
        const testApp = await createAuthenticatedTestApp({
            controllers: [MeetingsController],
            providers: [{ provide: MeetingsService, useValue: service }],
        });
        app = testApp.app;
        authenticatedCookie = () =>
            testApp.authenticatedCookie({ id: USER_ID, email: "resident@example.com" });
    });

    it("requires authentication and lists meetings for a residence", async () => {
        await request(app.getHttpServer()).get(`/residences/${HOME_ID}/meetings`).expect(401);
        await request(app.getHttpServer())
            .get(`/residences/${HOME_ID}/meetings`)
            .set("Cookie", await authenticatedCookie())
            .expect(200);
        expect(service.findAll).toHaveBeenCalledWith(HOME_ID, USER_ID);
    });

    it("validates meeting time and agenda before create", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post(`/residences/${HOME_ID}/meetings`)
            .set("Cookie", cookie)
            .send({ dateTime: "yesterday", agenda: "" })
            .expect(400);
        await request(app.getHttpServer())
            .post(`/residences/${HOME_ID}/meetings`)
            .set("Cookie", cookie)
            .send({ dateTime: futureDate, agenda: "Reunião" })
            .expect(201);
        expect(service.create).toHaveBeenCalledWith(
            HOME_ID,
            { dateTime: futureDate, agenda: "Reunião" },
            USER_ID
        );
        service.create.mockRejectedValueOnce(new BadRequestException());
        await request(app.getHttpServer())
            .post(`/residences/${HOME_ID}/meetings`)
            .set("Cookie", cookie)
            .send({ dateTime: futureDate, agenda: "Pauta" })
            .expect(400);
    });

    it("supports invitation responses, organizer changes, and missing resources", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .patch(`/residences/${HOME_ID}/meetings/${MEETING_ID}/respond`)
            .set("Cookie", cookie)
            .send({ response: "CONFIRMADO" })
            .expect(200);
        await request(app.getHttpServer())
            .patch(`/residences/${HOME_ID}/meetings/${MEETING_ID}/reschedule`)
            .set("Cookie", cookie)
            .send({ dateTime: futureDate, agenda: "Nova pauta" })
            .expect(200);
        await request(app.getHttpServer())
            .patch(`/residences/${HOME_ID}/meetings/${MEETING_ID}/cancel`)
            .set("Cookie", cookie)
            .expect(200);
        await request(app.getHttpServer())
            .delete(`/residences/${HOME_ID}/meetings/${MEETING_ID}`)
            .set("Cookie", cookie)
            .expect(200);
        expect(service.removeCancelled).toHaveBeenCalledWith(HOME_ID, MEETING_ID, USER_ID);
        service.respond.mockRejectedValueOnce(new ForbiddenException());
        await request(app.getHttpServer())
            .patch(`/residences/${HOME_ID}/meetings/${MEETING_ID}/respond`)
            .set("Cookie", cookie)
            .send({ response: "RECUSADO" })
            .expect(403);
        service.cancel.mockRejectedValueOnce(new NotFoundException());
        await request(app.getHttpServer())
            .patch(`/residences/${HOME_ID}/meetings/${MEETING_ID}/cancel`)
            .set("Cookie", cookie)
            .expect(404);
    });
});
