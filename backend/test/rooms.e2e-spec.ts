import { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { RoomsController } from "../src/rooms/rooms.controller.js";
import type { anuncio_quarto } from "../src/generated/prisma/client.js";
import { toRoomListingResponse } from "../src/rooms/rooms.mapper.js";
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
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        uploadPhoto: vi.fn(),
        createInterest: vi.fn(),
        listInterests: vi.fn(),
        updateInterest: vi.fn(),
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
        service.create.mockResolvedValue(listing);
        service.update.mockResolvedValue(listing);
        service.remove.mockResolvedValue(undefined);
        service.createInterest.mockResolvedValue({
            id: "interest-1",
            anuncioId: LISTING_ID,
            status: "PENDENTE",
        });
        service.listInterests.mockResolvedValue([]);
        service.updateInterest.mockResolvedValue({
            id: "interest-1",
            anuncioId: LISTING_ID,
            status: "ACEITO",
        });
        const testApp = await createAuthenticatedTestApp({
            controllers: [RoomsController],
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
            expect.objectContaining({ cidade: "Quixada", page: 2, limit: 5, aceitaPets: true })
        );
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
            })
            .expect(201)
            .expect(listing);
        expect(service.create).toHaveBeenCalledWith(
            expect.objectContaining({ titulo: "Quarto", preco: 450 }),
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
});
