import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomsService } from "./rooms.service.js";

describe("RoomsService", () => {
    const repository = {
        create: vi.fn(),
        findMany: vi.fn(),
        findById: vi.fn(),
        findMine: vi.fn(),
        findForHouse: vi.fn(),
        findForOwner: vi.fn(),
        update: vi.fn(),
        close: vi.fn(),
        findInterest: vi.fn(),
        createInterest: vi.fn(),
        listInterests: vi.fn(),
        decideInterest: vi.fn(),
        listMyInterests: vi.fn(),
        ensureNegotiation: vi.fn(),
        findNegotiationForAccess: vi.fn(),
        listNegotiationMessages: vi.fn(),
        createNegotiationMessage: vi.fn(),
        createNegotiationInvitation: vi.fn(),
        respondToNegotiationInvitation: vi.fn(),
    };
    const residenceAccess = {
        requireMembership: vi.fn(),
        requireManager: vi.fn(),
        listForUser: vi.fn(),
    };
    const storage = { upload: vi.fn() };
    const service = new RoomsService(
        repository as never,
        residenceAccess as never,
        storage as never
    );
    const negotiationRecord = {
        id: "negotiation-1",
        interesse_id: "interest-1",
        convite_casa: [],
        interesse_anuncio: {
            status: "ACEITO",
            usuario: { id: "seeker-1" },
            anuncio_quarto: {
                id: "listing-1",
                casa_id: "house-1",
                titulo: "Quarto",
                descricao: null,
                valor_mensal: 450,
                cidade: "Quixadá",
                bairro: null,
                status: "ABERTO",
                exibeEnderecoCompleto: false,
                endereco_referencia: null,
                enderecoCompleto: "Rua privada",
                contato: "88999999999",
                exibeContato: false,
                perfilConvivencia: null,
                tipoMoradia: "QUARTO_INDIVIDUAL",
                aceitaPets: false,
                fotos: [],
                criadoEm: new Date("2026-11-09T12:00:00.000Z"),
                atualizadoEm: new Date("2026-11-09T12:00:00.000Z"),
                criado_por_participacao_id: "member-1",
                participacao: { usuario_id: "owner-1" },
            },
        },
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("lists house announcements with private fields and pending counts only for the active author", async () => {
        const rawListing = negotiationRecord.interesse_anuncio.anuncio_quarto;
        residenceAccess.requireMembership.mockResolvedValue({ memberId: "active-member-1" });
        repository.findForHouse.mockResolvedValue([
            {
                ...rawListing,
                participacao: {
                    usuario_id: "owner-1",
                    data_saida: null,
                    usuario: { nome: "Ana", apelido: "Aninha" },
                },
                _count: { interesse_anuncio: 2 },
            },
        ]);

        await expect(service.findForHouse("owner-1", "house-1")).resolves.toMatchObject([
            {
                autorNome: "Aninha",
                canManage: true,
                pendingInterestCount: 2,
                enderecoCompleto: "Rua privada",
                contato: "88999999999",
            },
        ]);
        await expect(service.findForHouse("other-resident", "house-1")).resolves.toMatchObject([
            {
                autorNome: "Aninha",
                canManage: false,
                pendingInterestCount: null,
                enderecoCompleto: null,
                contato: null,
            },
        ]);
        expect(repository.findForHouse).toHaveBeenLastCalledWith("house-1");
        residenceAccess.requireMembership.mockRejectedValueOnce(new NotFoundException());
        await expect(service.findForHouse("owner-1", "other-house")).rejects.toBeInstanceOf(
            NotFoundException
        );
        expect(repository.findForHouse).toHaveBeenCalledTimes(2);
    });

    it("uses the authenticated active participation as the creator", async () => {
        const row = {
            id: "listing-1",
            titulo: "Quarto",
            descricao: null,
            valor_mensal: 450,
            cidade: "Quixadá",
            bairro: null,
            status: "ABERTO",
            exibeEnderecoCompleto: false,
            enderecoCompleto: "Rua A",
            contato: "(88) 99999-9999",
            exibeContato: false,
            perfilConvivencia: null,
            tipoMoradia: "QUARTO_INDIVIDUAL",
            aceitaPets: false,
            fotos: [],
            criadoEm: new Date(),
            atualizadoEm: new Date(),
        };
        residenceAccess.requireManager.mockResolvedValue({ memberId: "member-1" });
        repository.create.mockResolvedValue(row);
        await service.create(
            {
                casaId: "house-1",
                titulo: "Quarto",
                preco: 450,
                cidade: "Quixadá",
                contato: "(88) 99999-9999",
            } as never,
            "user-1"
        );
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({ casaId: "house-1" }),
            "member-1"
        );
    });

    it("prevents non-managers from publishing room listings", async () => {
        residenceAccess.requireManager.mockRejectedValue(
            new ForbiddenException("Somente líderes e administradores podem fazer isso.")
        );

        await expect(
            service.create(
                {
                    casaId: "house-1",
                    titulo: "Quarto",
                    preco: 450,
                    cidade: "Quixadá",
                    contato: "(88) 99999-9999",
                } as never,
                "user-1"
            )
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("prevents non-managers from uploading listing photos", async () => {
        residenceAccess.requireManager.mockRejectedValue(new ForbiddenException());

        await expect(
            service.uploadPhoto(
                "house-1",
                {
                    mimetype: "image/png",
                } as Express.Multer.File,
                "user-1"
            )
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(storage.upload).not.toHaveBeenCalled();
    });

    it("uses the residence in the request to authorize upload and publication", async () => {
        residenceAccess.requireManager.mockImplementation(async (residenceId: string) => {
            if (residenceId !== "house-1") throw new NotFoundException();
            return { memberId: "manager-1" };
        });
        const file = { mimetype: "image/png" } as Express.Multer.File;
        storage.upload.mockResolvedValue("https://storage.example/quarto.png");

        await expect(service.uploadPhoto("house-1", file, "user-1")).resolves.toEqual({
            url: "https://storage.example/quarto.png",
        });
        await expect(service.uploadPhoto("house-2", file, "user-1")).rejects.toBeInstanceOf(
            NotFoundException
        );
        await expect(
            service.create({ casaId: "house-2" } as never, "user-1")
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(residenceAccess.requireManager.mock.calls).toEqual([
            ["house-1", "user-1"],
            ["house-2", "user-1"],
            ["house-2", "user-1"],
        ]);
        expect(storage.upload).toHaveBeenCalledExactlyOnceWith(file, "room-listings");
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("does not expose a closed listing through public detail", async () => {
        repository.findById.mockResolvedValue({ id: "listing-1", status: "FECHADO" });
        await expect(service.findById("listing-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("blocks direct listing detail for users with an active residence", async () => {
        residenceAccess.listForUser.mockResolvedValue([{ id: "house-1" }]);

        await expect(service.findById("listing-1", "user-1")).rejects.toBeInstanceOf(
            ForbiddenException
        );
        expect(repository.findById).not.toHaveBeenCalled();
    });

    it("prevents another user from managing a listing", async () => {
        repository.findForOwner.mockResolvedValue({
            id: "listing-1",
            participacao: { usuario_id: "owner-1", data_saida: null },
        });
        await expect(service.update("listing-1", {} as never, "other-user")).rejects.toBeInstanceOf(
            ForbiddenException
        );
        expect(repository.update).not.toHaveBeenCalled();
    });

    it("rejects a reversed price range before querying the repository", async () => {
        await expect(
            service.findMany({ precoMin: 500, precoMax: 100, page: 1, limit: 10 } as never)
        ).rejects.toThrow();
        expect(repository.findMany).not.toHaveBeenCalled();
    });

    it("allows anonymous search without looking up residence membership", async () => {
        repository.findMany.mockResolvedValue({ data: [], total: 0 });

        await service.findMany({ page: 1, limit: 10 } as never);

        expect(residenceAccess.listForUser).not.toHaveBeenCalled();
        expect(repository.findMany).toHaveBeenCalled();
    });

    it("allows authenticated users without an active residence to search", async () => {
        residenceAccess.listForUser.mockResolvedValue([]);
        repository.findMany.mockResolvedValue({ data: [], total: 0 });

        await service.findMany({ page: 1, limit: 10 } as never, "user-1");

        expect(residenceAccess.listForUser).toHaveBeenCalledWith("user-1");
        expect(repository.findMany).toHaveBeenCalled();
    });

    it("blocks search for users with an active residence", async () => {
        residenceAccess.listForUser.mockResolvedValue([{ id: "house-1" }]);

        await expect(service.findMany({ page: 1, limit: 10 } as never, "user-1")).rejects.toThrow(
            "A busca de quartos está disponível apenas para pessoas sem residência ativa."
        );

        expect(repository.findMany).not.toHaveBeenCalled();
    });

    it("prevents a seeker from sending another interest after acceptance", async () => {
        residenceAccess.listForUser.mockResolvedValue([]);
        repository.findById.mockResolvedValue({ id: "listing-1", status: "ABERTO" });
        repository.findInterest.mockResolvedValue({ id: "interest-1", status: "ACEITO" });

        await expect(
            service.createInterest(
                "listing-1",
                { mensagem: "Outra tentativa" } as never,
                "seeker-1"
            )
        ).rejects.toBeInstanceOf(ConflictException);
        expect(repository.createInterest).not.toHaveBeenCalled();
    });

    it("blocks residents from creating an interest through the API", async () => {
        residenceAccess.listForUser.mockResolvedValue([{ id: "house-1" }]);

        await expect(
            service.createInterest("listing-1", { mensagem: "Tenho interesse" } as never, "user-1")
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.findById).not.toHaveBeenCalled();
        expect(repository.createInterest).not.toHaveBeenCalled();
    });

    it("returns the negotiation created when the advertiser accepts an interest", async () => {
        repository.findForOwner.mockResolvedValue({
            id: "listing-1",
            participacao: { usuario_id: "owner-1", data_saida: null },
        });
        repository.decideInterest.mockResolvedValue({
            status: "ACEITO",
            negotiationId: "negotiation-1",
        });

        await expect(
            service.updateInterest(
                "listing-1",
                "interest-1",
                { status: "ACEITO" } as never,
                "owner-1"
            )
        ).resolves.toEqual({
            id: "interest-1",
            anuncioId: "listing-1",
            status: "ACEITO",
            negotiationId: "negotiation-1",
        });
        expect(repository.decideInterest).toHaveBeenCalledWith("listing-1", "interest-1", "ACEITO");
    });

    it("does not return a negotiation to a user outside its two participants", async () => {
        repository.findNegotiationForAccess.mockResolvedValue({
            interesse_anuncio: {
                usuario: { id: "seeker-1" },
                anuncio_quarto: { participacao: { usuario_id: "owner-1" } },
            },
        });

        await expect(
            service.getNegotiationMessages("negotiation-1", "other-user", { limit: 30 })
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.listNegotiationMessages).not.toHaveBeenCalled();
    });

    it("rejects empty negotiation messages before any database access", async () => {
        await expect(
            service.sendNegotiationMessage("negotiation-1", "   ", "seeker-1")
        ).rejects.toThrow("A mensagem não pode estar vazia.");
        expect(repository.findNegotiationForAccess).not.toHaveBeenCalled();
    });

    it("allows a negotiation participant to read messages without exposing hidden listing contact details", async () => {
        repository.findNegotiationForAccess.mockResolvedValue(negotiationRecord);
        repository.listNegotiationMessages.mockResolvedValue({
            data: [
                {
                    id: "message-1",
                    usuario: { id: "owner-1", nome: "Owner", foto_url: null },
                    conteudo: "Vamos conversar.",
                    enviada_em: new Date("2026-11-09T12:00:00.000Z"),
                },
            ],
            hasMore: true,
            nextCursor: "message-1",
        });

        const query = { before: "previous-message", limit: 20 };
        const result = await service.getNegotiationMessages("negotiation-1", "seeker-1", query);

        expect(result.anuncio.contato).toBeNull();
        expect(result).toMatchObject({ hasMore: true, nextCursor: "message-1" });
        expect(repository.listNegotiationMessages).toHaveBeenCalledWith(
            "negotiation-1",
            query.before,
            query.limit
        );
        expect(result.mensagens).toEqual([
            {
                id: "message-1",
                autorId: "owner-1",
                autorNome: "Owner",
                autorFotoUrl: null,
                conteudo: "Vamos conversar.",
                enviadaEm: "2026-11-09T12:00:00.000Z",
            },
        ]);
    });

    it("offers a pending invitation response only to the invited negotiation participant", async () => {
        const expiration = new Date(Date.now() + 60_000);
        repository.findNegotiationForAccess.mockResolvedValue({
            ...negotiationRecord,
            convite_casa: [
                {
                    id: "invite-1",
                    status: "PENDENTE",
                    expira_em: expiration,
                    usuario_convidado_id: "seeker-1",
                },
            ],
        });
        repository.listNegotiationMessages.mockResolvedValue({
            data: [],
            hasMore: false,
            nextCursor: null,
        });
        await expect(
            service.getNegotiationMessages("negotiation-1", "seeker-1", { limit: 30 })
        ).resolves.toMatchObject({
            convite: { id: "invite-1", status: "PENDENTE", podeResponder: true },
        });
        await expect(
            service.getNegotiationMessages("negotiation-1", "owner-1", { limit: 30 })
        ).resolves.toMatchObject({ podeConvidar: false, convite: { podeResponder: false } });
    });

    it.each([
        ["seeker-1", "owner-1"],
        ["owner-1", "seeker-1"],
    ])("lets participant %s send a message to %s", async (senderId, recipientId) => {
        repository.findNegotiationForAccess.mockResolvedValue(negotiationRecord);
        repository.createNegotiationMessage.mockResolvedValue({
            id: "message-2",
            usuario: { id: senderId, nome: "Participant", foto_url: null },
            conteudo: "Olá",
            enviada_em: new Date("2026-11-09T12:01:00.000Z"),
        });

        await service.sendNegotiationMessage("negotiation-1", " Olá ", senderId);

        expect(repository.createNegotiationMessage).toHaveBeenCalledWith(
            "negotiation-1",
            senderId,
            recipientId,
            "house-1",
            "Olá"
        );
    });

    it("blocks the interested person from sending the house invitation", async () => {
        repository.findNegotiationForAccess.mockResolvedValue(negotiationRecord);

        await expect(
            service.sendNegotiationInvitation("negotiation-1", "seeker-1")
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(residenceAccess.requireManager).not.toHaveBeenCalled();
        expect(repository.createNegotiationInvitation).not.toHaveBeenCalled();
    });

    it("lets the advertiser invite the exact interested user for seven days", async () => {
        repository.findNegotiationForAccess.mockResolvedValue(negotiationRecord);
        residenceAccess.requireManager.mockResolvedValue({ memberId: "manager-member-1" });
        repository.createNegotiationInvitation.mockImplementation(
            async (_negotiationId, _userId, _memberId, expiresAt) => ({
                id: "invitation-1",
                status: "PENDENTE",
                expira_em: expiresAt,
            })
        );
        const before = Date.now();

        await service.sendNegotiationInvitation("negotiation-1", "owner-1");

        expect(repository.createNegotiationInvitation).toHaveBeenCalledWith(
            "negotiation-1",
            "seeker-1",
            "manager-member-1",
            expect.any(Date)
        );
        const expiry = repository.createNegotiationInvitation.mock.calls[0][3] as Date;
        expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000);
    });

    it("does not let a non-manager advertiser send an invitation", async () => {
        repository.findNegotiationForAccess.mockResolvedValue(negotiationRecord);
        residenceAccess.requireManager.mockRejectedValue(
            new ForbiddenException("Somente líderes e administradores podem fazer isso.")
        );

        await expect(
            service.sendNegotiationInvitation("negotiation-1", "owner-1")
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.createNegotiationInvitation).not.toHaveBeenCalled();
    });

    it("reports expired invitations without treating them as successful responses", async () => {
        repository.respondToNegotiationInvitation.mockResolvedValue({
            id: "invitation-1",
            status: "EXPIRADO",
            membershipId: null,
        });

        await expect(
            service.respondToNegotiationInvitation("invitation-1", "ACEITO", "seeker-1")
        ).rejects.toThrow("Este convite expirou.");
    });

    it.each(["ACEITO", "RECUSADO"])(
        "keeps participant access to the negotiation after an invitation is %s",
        async (invitationStatus) => {
            repository.findNegotiationForAccess.mockResolvedValue({
                ...negotiationRecord,
                convite_casa: [
                    {
                        id: "invitation-1",
                        status: invitationStatus,
                        expira_em: new Date(Date.now() + 60_000),
                        usuario_convidado_id: "seeker-1",
                    },
                ],
            });
            repository.listNegotiationMessages.mockResolvedValue({
                data: [],
                hasMore: false,
                nextCursor: null,
            });

            await expect(
                service.getNegotiationMessages("negotiation-1", "seeker-1", { limit: 30 })
            ).resolves.toMatchObject({ id: "negotiation-1", status: "ACEITO" });
        }
    );
});
