import { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { RoomsController } from "../src/rooms/rooms.controller.js";
import type { anuncio_quarto } from "../src/generated/prisma/client.js";
import { toRoomListingResponse } from "../src/rooms/rooms.mapper.js";
import { RoomNegotiationsController } from "../src/rooms/room-negotiations.controller.js";
import { RoomsService } from "../src/rooms/rooms.service.js";
import { createAuthenticatedTestApp } from "./utils/authenticated-test-app.js";

const USER_ID = "821f394d-6215-48b4-89a9-0af953ba8a76";
const LISTING_ID = "bc3c5c4b-3f52-4faf-9341-2370fcde6cee";

describe("Room listings HTTP API (e2e)", () => {
    let app: INestApplication<App>;
    let authenticatedCookie: () => Promise<string>;
    const service = {
        findMany: vi.fn(),
        findById: vi.fn(),
        findMine: vi.fn(),
        findForHouse: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        uploadPhoto: vi.fn(),
        createInterest: vi.fn(),
        listInterests: vi.fn(),
        updateInterest: vi.fn(),
        listMyInterests: vi.fn(),
        getNegotiationMessages: vi.fn(),
        sendNegotiationMessage: vi.fn(),
        sendNegotiationInvitation: vi.fn(),
        respondToNegotiationInvitation: vi.fn(),
    };
    const listing = {
        id: LISTING_ID,
        titulo: "Quarto individual",
        descricao: null,
        preco: 450,
        cidade: "Quixadá",
        bairro: "Centro",
        enderecoCompleto: null,
        exibeEnderecoCompleto: false,
        contato: null,
        exibeContato: false,
        perfilConvivencia: null,
        tipoMoradia: "QUARTO_INDIVIDUAL",
        aceitaPets: false,
        fotos: [],
        status: "ABERTO",
        criadoEm: "2026-11-09T12:00:00.000Z",
        atualizadoEm: "2026-11-09T12:00:00.000Z",
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        service.findMany.mockResolvedValue({
            data: [listing],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });
        service.findById.mockResolvedValue(listing);
        service.findMine.mockResolvedValue([listing]);
        service.findForHouse.mockResolvedValue([
            { ...listing, autorNome: "Autora", canManage: true, pendingInterestCount: 1 },
        ]);
        service.create.mockResolvedValue(listing);
        service.uploadPhoto.mockResolvedValue({ url: "https://storage.example/quarto.png" });
        service.update.mockResolvedValue(listing);
        service.remove.mockResolvedValue(undefined);
        service.createInterest.mockResolvedValue({
            id: "interest-1",
            anuncioId: LISTING_ID,
            status: "PENDENTE",
        });
        service.listInterests.mockResolvedValue([]);
        service.listMyInterests.mockResolvedValue([]);
        service.getNegotiationMessages.mockResolvedValue({
            id: "negotiation-1",
            interestId: "interest-1",
            status: "ACEITO",
            anuncio: listing,
            mensagens: [],
            hasMore: false,
            nextCursor: null,
        });
        service.sendNegotiationMessage.mockResolvedValue({
            id: "message-1",
            autorId: USER_ID,
            autorNome: "Seeker",
            autorFotoUrl: null,
            conteudo: "Olá",
            enviadaEm: "2026-11-09T12:00:00.000Z",
        });
        service.sendNegotiationInvitation.mockResolvedValue({
            id: "invitation-1",
            status: "PENDENTE",
            expiraEm: "2026-11-16T12:00:00.000Z",
        });
        service.respondToNegotiationInvitation.mockResolvedValue({
            id: "invitation-1",
            status: "ACEITO",
            membershipId: "membership-1",
        });
        service.updateInterest.mockResolvedValue({
            id: "interest-1",
            anuncioId: LISTING_ID,
            status: "ACEITO",
        });
        const testApp = await createAuthenticatedTestApp({
            controllers: [RoomsController, RoomNegotiationsController],
            providers: [{ provide: RoomsService, useValue: service }],
        });
        app = testApp.app;
        authenticatedCookie = () =>
            testApp.authenticatedCookie({ id: USER_ID, email: "resident@example.com" });
    });

    it("allows public paginated search and applies query transforms", async () => {
        await request(app.getHttpServer())
            .get("/rooms/listings?cidade=Quixada&page=2&limit=5&aceitaPets=true")
            .expect(200)
            .expect({ data: [listing], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } });
        expect(service.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ cidade: "Quixada", page: 2, limit: 5, aceitaPets: true }),
            undefined
        );
    });

    it("authenticates house listings and validates the residence identifier", async () => {
        const houseId = "4ca328bc-3d0c-4ce7-a26a-e827684cc634";
        await request(app.getHttpServer())
            .get(`/rooms/listings/house?casaId=${houseId}`)
            .expect(401);
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .get("/rooms/listings/house?casaId=invalid")
            .set("Cookie", cookie)
            .expect(400);
        expect(service.findForHouse).not.toHaveBeenCalled();
        await request(app.getHttpServer())
            .get(`/rooms/listings/house?casaId=${houseId}`)
            .set("Cookie", cookie)
            .expect(200)
            .expect([
                { ...listing, autorNome: "Autora", canManage: true, pendingInterestCount: 1 },
            ]);
        expect(service.findForHouse).toHaveBeenCalledWith(USER_ID, houseId);
    });

    it("passes the authenticated identity to the public search policy", async () => {
        await request(app.getHttpServer())
            .get("/rooms/listings")
            .set("Cookie", await authenticatedCookie())
            .expect(200);

        expect(service.findMany).toHaveBeenCalledWith(expect.anything(), USER_ID);
    });

    it("rejects an invalid session cookie on the public search route", async () => {
        await request(app.getHttpServer())
            .get("/rooms/listings")
            .set("Cookie", "access_token=invalid")
            .expect(401);

        expect(service.findMany).not.toHaveBeenCalled();
    });

    it("keeps hidden address and contact null in the public HTTP response", async () => {
        const mapped = toRoomListingResponse({
            id: LISTING_ID,
            casa_id: "4ca328bc-3d0c-4ce7-a26a-e827684cc634",
            titulo: "Quarto individual",
            descricao: null,
            valor_mensal: 450,
            cidade: "Quixadá",
            bairro: "Centro",
            status: "ABERTO",
            exibeEnderecoCompleto: false,
            endereco_referencia: null,
            enderecoCompleto: "Rua Privada, 123",
            contato: "(88) 99999-9999",
            exibeContato: false,
            perfilConvivencia: null,
            tipoMoradia: "QUARTO_INDIVIDUAL",
            aceitaPets: false,
            fotos: [],
            criadoEm: new Date("2026-11-09T12:00:00.000Z"),
            atualizadoEm: new Date("2026-11-09T12:00:00.000Z"),
            criado_por_participacao_id: "member-1",
        } as unknown as anuncio_quarto);
        service.findMany.mockResolvedValueOnce({
            data: [mapped],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });
        await request(app.getHttpServer())
            .get("/rooms/listings")
            .expect(200)
            .expect(({ body }) => {
                expect(body.data[0].enderecoCompleto).toBeNull();
                expect(body.data[0].contato).toBeNull();
            });
    });

    it("passes optional authentication to listing detail", async () => {
        await request(app.getHttpServer())
            .get(`/rooms/listings/${LISTING_ID}`)
            .expect(200)
            .expect(listing);
        expect(service.findById).toHaveBeenCalledWith(LISTING_ID, undefined);

        await request(app.getHttpServer())
            .get(`/rooms/listings/${LISTING_ID}`)
            .set("Cookie", await authenticatedCookie())
            .expect(200)
            .expect(listing);
        expect(service.findById).toHaveBeenLastCalledWith(LISTING_ID, USER_ID);
    });

    it("requires JWT for listing mutations and creates with the session identity", async () => {
        await request(app.getHttpServer()).post("/rooms/listings").send({}).expect(401);
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post("/rooms/listings")
            .set("Cookie", cookie)
            .send({
                casaId: "4ca328bc-3d0c-4ce7-a26a-e827684cc634",
                titulo: "Quarto",
                preco: 450,
                cidade: "Quixadá",
                contato: "(88) 99999-9999",
                descricao: "Quarto com janela",
                exibeEnderecoCompleto: false,
                exibeContato: true,
                perfilConvivencia: "Visitas: combinar com antecedência.",
                aceitaPets: true,
                fotos: ["https://storage.example/quarto.png"],
            })
            .expect(201)
            .expect(listing);
        expect(service.create).toHaveBeenCalledWith(
            expect.objectContaining({
                casaId: "4ca328bc-3d0c-4ce7-a26a-e827684cc634",
                titulo: "Quarto",
                preco: 450,
                descricao: "Quarto com janela",
                exibeEnderecoCompleto: false,
                exibeContato: true,
                perfilConvivencia: "Visitas: combinar com antecedência.",
                aceitaPets: true,
                fotos: ["https://storage.example/quarto.png"],
            }),
            USER_ID
        );
    });

    it("requires JWT for photo upload and forwards the house and session identity", async () => {
        const houseId = "4ca328bc-3d0c-4ce7-a26a-e827684cc634";
        const route = `/rooms/listings/photos?casaId=${houseId}`;
        const image = Buffer.from("test image");
        await request(app.getHttpServer())
            .post(route)
            .attach("file", image, "quarto.png")
            .expect(401);
        expect(service.uploadPhoto).not.toHaveBeenCalled();

        await request(app.getHttpServer())
            .post(route)
            .set("Cookie", await authenticatedCookie())
            .attach("file", image, "quarto.png")
            .expect(201)
            .expect({ url: "https://storage.example/quarto.png" });
        expect(service.uploadPhoto).toHaveBeenCalledWith(
            houseId,
            expect.objectContaining({ originalname: "quarto.png", mimetype: "image/png" }),
            USER_ID
        );
    });

    it("rejects invalid listing fields before calling the service", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post("/rooms/listings")
            .set("Cookie", cookie)
            .send({
                casaId: "4ca328bc-3d0c-4ce7-a26a-e827684cc634",
                titulo: "",
                preco: -1,
                cidade: "",
                contato: "",
            })
            .expect(400);
        expect(service.create).not.toHaveBeenCalled();
    });

    it("supports detail, partial update and logical deletion", async () => {
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .get(`/rooms/listings/${LISTING_ID}`)
            .expect(200)
            .expect(listing);
        await request(app.getHttpServer())
            .patch(`/rooms/listings/${LISTING_ID}`)
            .set("Cookie", cookie)
            .send({ titulo: "Quarto amplo" })
            .expect(200);
        await request(app.getHttpServer())
            .delete(`/rooms/listings/${LISTING_ID}`)
            .set("Cookie", cookie)
            .expect(204);
        expect(service.update).toHaveBeenCalledWith(
            LISTING_ID,
            { titulo: "Quarto amplo" },
            USER_ID
        );
        expect(service.remove).toHaveBeenCalledWith(LISTING_ID, USER_ID);
    });

    it("requires JWT to express interest", async () => {
        await request(app.getHttpServer())
            .post(`/rooms/listings/${LISTING_ID}/interests`)
            .send({})
            .expect(401);
        await request(app.getHttpServer())
            .post(`/rooms/listings/${LISTING_ID}/interests`)
            .set("Cookie", await authenticatedCookie())
            .send({ mensagem: "Tenho interesse" })
            .expect(201);
    });

    it("lists only the authenticated user's interest inbox", async () => {
        service.listMyInterests.mockResolvedValue([
            {
                id: "interest-1",
                status: "ACEITO",
                negotiationId: "negotiation-1",
                anuncio: listing,
            },
        ]);
        await request(app.getHttpServer()).get("/rooms/negotiations/interests/mine").expect(401);
        await request(app.getHttpServer())
            .get("/rooms/negotiations/interests/mine")
            .set("Cookie", await authenticatedCookie())
            .expect(200)
            .expect([
                {
                    id: "interest-1",
                    status: "ACEITO",
                    negotiationId: "negotiation-1",
                    anuncio: listing,
                },
            ]);
        expect(service.listMyInterests).toHaveBeenCalledWith(USER_ID);
    });

    it("requires a valid authenticated message body and sends as the session user", async () => {
        const negotiationId = "d8957f13-2e5e-45c1-8c22-194b4f610f43";
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .get(`/rooms/negotiations/${negotiationId}/messages`)
            .set("Cookie", cookie)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toMatchObject({
                    mensagens: [],
                    hasMore: false,
                    nextCursor: null,
                });
            });
        await request(app.getHttpServer())
            .get(`/rooms/negotiations/${negotiationId}/messages?limit=51`)
            .set("Cookie", cookie)
            .expect(400);
        await request(app.getHttpServer())
            .get(`/rooms/negotiations/${negotiationId}/messages?before=invalid`)
            .set("Cookie", cookie)
            .expect(400);
        await request(app.getHttpServer())
            .post(`/rooms/negotiations/${negotiationId}/messages`)
            .set("Cookie", cookie)
            .send({ conteudo: "a".repeat(2001) })
            .expect(400);
        await request(app.getHttpServer())
            .post(`/rooms/negotiations/${negotiationId}/messages`)
            .set("Cookie", cookie)
            .send({ conteudo: "Olá" })
            .expect(201)
            .expect({
                id: "message-1",
                autorId: USER_ID,
                autorNome: "Seeker",
                autorFotoUrl: null,
                conteudo: "Olá",
                enviadaEm: "2026-11-09T12:00:00.000Z",
            });
        expect(service.getNegotiationMessages).toHaveBeenCalledWith(
            negotiationId,
            USER_ID,
            expect.objectContaining({ limit: 30 })
        );
        expect(service.getNegotiationMessages).toHaveBeenCalledTimes(1);
        expect(service.sendNegotiationMessage).toHaveBeenCalledWith(negotiationId, "Olá", USER_ID);
    });

    it("sends and answers invitations through authenticated actions", async () => {
        const negotiationId = "d8957f13-2e5e-45c1-8c22-194b4f610f43";
        const invitationId = "aa62190a-9340-46b4-9a9c-9e09d321c0c5";
        const cookie = await authenticatedCookie();
        await request(app.getHttpServer())
            .post(`/rooms/negotiations/${negotiationId}/invitations`)
            .set("Cookie", cookie)
            .expect(201)
            .expect({
                id: "invitation-1",
                status: "PENDENTE",
                expiraEm: "2026-11-16T12:00:00.000Z",
            });
        await request(app.getHttpServer())
            .patch(`/rooms/negotiations/invitations/${invitationId}`)
            .set("Cookie", cookie)
            .send({ status: "INVALIDO" })
            .expect(400);
        await request(app.getHttpServer())
            .patch(`/rooms/negotiations/invitations/${invitationId}`)
            .set("Cookie", cookie)
            .send({ status: "ACEITO" })
            .expect(200);
        expect(service.sendNegotiationInvitation).toHaveBeenCalledWith(negotiationId, USER_ID);
        expect(service.respondToNegotiationInvitation).toHaveBeenCalledWith(
            invitationId,
            "ACEITO",
            USER_ID
        );
    });
});
