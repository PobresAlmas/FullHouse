import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomsRepository } from "./rooms.repository.js";

describe("RoomsRepository room-interest decisions", () => {
    const transaction = {
        $queryRaw: vi.fn(),
        interesse_anuncio: {
            findUniqueOrThrow: vi.fn(),
            update: vi.fn(),
        },
        negociacao_anuncio: { upsert: vi.fn() },
        notificacao: { create: vi.fn() },
        anuncio_quarto: { update: vi.fn() },
        usuario: { update: vi.fn() },
        convite_casa: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        participacao: {
            findFirst: vi.fn(),
            create: vi.fn(),
            findUniqueOrThrow: vi.fn(),
        },
    };
    const prisma = {
        $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
            callback(transaction)
        ),
    };
    const repository = new RoomsRepository(prisma as never);

    beforeEach(() => {
        vi.clearAllMocks();
        transaction.$queryRaw.mockResolvedValue([{ id: "interest-1" }]);
        transaction.interesse_anuncio.findUniqueOrThrow.mockResolvedValue({
            id: "interest-1",
            usuario_id: "seeker-1",
            anuncio_quarto: { casa_id: "house-1" },
        });
        transaction.interesse_anuncio.update.mockResolvedValue({});
        transaction.negociacao_anuncio.upsert.mockResolvedValue({ id: "negotiation-1" });
        transaction.notificacao.create.mockResolvedValue({});
        transaction.convite_casa.findFirst.mockResolvedValue(null);
        transaction.convite_casa.findUnique.mockResolvedValue({
            id: "invitation-1",
            casa_id: "house-1",
            negociacao_anuncio_id: "negotiation-1",
            usuario_convidado_id: "seeker-1",
            convidado_por_participacao_id: "manager-member-1",
            status: "PENDENTE",
            expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000),
            casa: { status: "ATIVA", excluido_em: null },
        });
        transaction.convite_casa.create.mockResolvedValue({
            id: "invitation-1",
            status: "PENDENTE",
            expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        transaction.convite_casa.update.mockResolvedValue({});
        transaction.convite_casa.updateMany.mockResolvedValue({ count: 0 });
        transaction.participacao.findFirst.mockResolvedValue(null);
        transaction.participacao.create.mockResolvedValue({ id: "membership-1" });
        transaction.participacao.findUniqueOrThrow.mockResolvedValue({ usuario_id: "owner-1" });
    });

    it("creates a single negotiation and acceptance notification in the decision transaction", async () => {
        await expect(
            repository.decideInterest("listing-1", "interest-1", "ACEITO")
        ).resolves.toEqual({ status: "ACEITO", negotiationId: "negotiation-1" });

        expect(transaction.negociacao_anuncio.upsert).toHaveBeenCalledOnce();
        expect(transaction.notificacao.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    usuario_id: "seeker-1",
                    casa_id: "house-1",
                    entidade_tipo: "NEGOCIACAO_QUARTO",
                    entidade_id: "negotiation-1",
                }),
            })
        );
    });

    it("declines an interest without creating a negotiation or notification", async () => {
        await expect(
            repository.decideInterest("listing-1", "interest-1", "RECUSADO")
        ).resolves.toEqual({ status: "RECUSADO", negotiationId: null });

        expect(transaction.negociacao_anuncio.upsert).not.toHaveBeenCalled();
        expect(transaction.notificacao.create).not.toHaveBeenCalled();
    });

    it("rejects a repeated decision after the first transaction consumes the pending interest", async () => {
        transaction.$queryRaw
            .mockResolvedValueOnce([{ id: "interest-1" }])
            .mockResolvedValueOnce([]);

        await repository.decideInterest("listing-1", "interest-1", "ACEITO");
        await expect(
            repository.decideInterest("listing-1", "interest-1", "ACEITO")
        ).rejects.toBeInstanceOf(NotFoundException);

        expect(transaction.negociacao_anuncio.upsert).toHaveBeenCalledOnce();
    });

    it("propagates notification failures so the database transaction can roll back acceptance", async () => {
        transaction.notificacao.create.mockRejectedValue(new Error("notification insert failed"));

        await expect(
            repository.decideInterest("listing-1", "interest-1", "ACEITO")
        ).rejects.toThrow("notification insert failed");
    });

    it("creates a seven-day invitation for the exact accepted-interest participant", async () => {
        transaction.$queryRaw.mockResolvedValue([{ casa_id: "house-1" }]);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await repository.createNegotiationInvitation(
            "negotiation-1",
            "seeker-1",
            "manager-member-1",
            expiresAt
        );

        expect(transaction.convite_casa.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    casa_id: "house-1",
                    negociacao_anuncio_id: "negotiation-1",
                    usuario_convidado_id: "seeker-1",
                    convidado_por_participacao_id: "manager-member-1",
                    expira_em: expiresAt,
                }),
            })
        );
        expect(transaction.notificacao.create).toHaveBeenCalled();
    });

    it("accepts a pending invite and creates an active member in one transaction", async () => {
        transaction.$queryRaw
            .mockResolvedValueOnce([{ id: "listing-1", status: "ABERTO" }])
            .mockResolvedValueOnce([{ id: "invitation-1" }])
            .mockResolvedValueOnce([]);

        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "ACEITO")
        ).resolves.toEqual({
            id: "invitation-1",
            status: "ACEITO",
            membershipId: "membership-1",
        });

        expect(transaction.participacao.create).toHaveBeenCalledWith({
            data: {
                casa_id: "house-1",
                usuario_id: "seeker-1",
                papel: "MORADOR",
                convite_id: "invitation-1",
            },
            select: { id: true },
        });
        expect(transaction.convite_casa.update).toHaveBeenCalledWith({
            where: { id: "invitation-1" },
            data: { status: "ACEITO" },
        });
        expect(transaction.usuario.update).toHaveBeenCalledWith({
            where: { id: "seeker-1" },
            data: { status_moradia: "MORANDO" },
        });
        expect(transaction.anuncio_quarto.update).toHaveBeenCalledWith({
            where: { id: "listing-1" },
            data: { status: "FECHADO" },
        });
    });

    it("rejects accepting a pending invite when the house is no longer active", async () => {
        transaction.convite_casa.findUnique.mockResolvedValueOnce({
            id: "invitation-1",
            usuario_convidado_id: "seeker-1",
            status: "PENDENTE",
            expira_em: new Date(Date.now() + 60_000),
            casa: { status: "INATIVA", excluido_em: null },
        });

        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "ACEITO")
        ).rejects.toThrow("A casa deste convite não está mais ativa.");
        expect(transaction.participacao.create).not.toHaveBeenCalled();
        expect(transaction.usuario.update).not.toHaveBeenCalled();
    });

    it("rejects accepting an invite to a second residence without changing the invite", async () => {
        transaction.$queryRaw
            .mockResolvedValueOnce([{ id: "listing-1", status: "ABERTO" }])
            .mockResolvedValueOnce([{ id: "invitation-1" }]);
        transaction.participacao.findFirst.mockResolvedValueOnce({
            id: "membership-existing",
            casa_id: "another-house",
        });

        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "ACEITO")
        ).rejects.toBeInstanceOf(ConflictException);
        expect(transaction.participacao.create).not.toHaveBeenCalled();
        expect(transaction.convite_casa.update).not.toHaveBeenCalled();
    });

    it("declines an invite without creating a membership", async () => {
        transaction.$queryRaw.mockResolvedValue([{ id: "invitation-1" }]);

        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "RECUSADO")
        ).resolves.toMatchObject({ status: "RECUSADO", membershipId: null });

        expect(transaction.participacao.create).not.toHaveBeenCalled();
        expect(transaction.convite_casa.update).toHaveBeenCalledWith({
            where: { id: "invitation-1" },
            data: { status: "RECUSADO" },
        });
    });

    it("rejects invitation responses from a different user without changing state", async () => {
        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "other-user", "ACEITO")
        ).rejects.toThrow("Somente a pessoa convidada pode responder.");
        expect(transaction.$queryRaw).not.toHaveBeenCalled();
        expect(transaction.participacao.create).not.toHaveBeenCalled();
    });

    it("expires a stale pending invite without creating membership", async () => {
        transaction.convite_casa.findUnique.mockResolvedValue({
            id: "invitation-1",
            casa_id: "house-1",
            negociacao_anuncio_id: "negotiation-1",
            usuario_convidado_id: "seeker-1",
            convidado_por_participacao_id: "manager-member-1",
            status: "PENDENTE",
            expira_em: new Date(Date.now() - 1),
        });
        transaction.$queryRaw.mockResolvedValue([{ id: "invitation-1" }]);

        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "ACEITO")
        ).resolves.toMatchObject({ status: "EXPIRADO", membershipId: null });
        expect(transaction.participacao.create).not.toHaveBeenCalled();
    });

    it("allows only one of two concurrent responses to activate membership", async () => {
        transaction.$queryRaw
            .mockResolvedValueOnce([{ id: "listing-1", status: "ABERTO" }])
            .mockResolvedValueOnce([{ id: "invitation-1" }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ id: "listing-1", status: "FECHADO" }]);

        await repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "ACEITO");
        await expect(
            repository.respondToNegotiationInvitation("invitation-1", "seeker-1", "ACEITO")
        ).rejects.toThrow("Esta vaga já foi preenchida ou fechada.");

        expect(transaction.participacao.create).toHaveBeenCalledOnce();
    });
});

describe("RoomsRepository", () => {
    let repository: RoomsRepository;
    let prisma: {
        anuncio_quarto: Record<string, ReturnType<typeof vi.fn>>;
        interesse_anuncio: Record<string, ReturnType<typeof vi.fn>>;
        $transaction: ReturnType<typeof vi.fn>;
    };
    let transaction: {
        $queryRaw: ReturnType<typeof vi.fn>;
        interesse_anuncio: Record<string, ReturnType<typeof vi.fn>>;
        notificacao: { create: ReturnType<typeof vi.fn> };
    };

    beforeEach(() => {
        transaction = {
            $queryRaw: vi
                .fn()
                .mockResolvedValue([
                    { casa_id: "house-1", usuario_id: "author-1", titulo: "Quarto" },
                ]),
            interesse_anuncio: {
                findFirst: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue({ id: "interest-1" }),
            },
            notificacao: { create: vi.fn().mockResolvedValue({}) },
        };
        prisma = {
            anuncio_quarto: {
                create: vi.fn(),
                findMany: vi.fn().mockResolvedValue([]),
                count: vi.fn().mockResolvedValue(0),
                findUnique: vi.fn(),
                update: vi.fn(),
            },
            interesse_anuncio: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
                updateMany: vi.fn(),
            },
            $transaction: vi.fn((operation) =>
                Array.isArray(operation) ? Promise.all(operation) : operation(transaction)
            ),
        };
        repository = new RoomsRepository(prisma as never);
    });

    it("normalizes and persists a listing with explicit defaults", async () => {
        const listing = {
            casaId: "home-1",
            titulo: " Quarto mobiliado ",
            descricao: "  Perto do campus  ",
            preco: 450,
            cidade: " Quixadá ",
            bairro: " Centro ",
            enderecoCompleto: " Rua A, 10 ",
            contato: " (88) 99999-0000 ",
            perfilConvivencia: "  Estudantes  ",
            fotos: ["https://cdn/fullhouse/room.png"],
        };
        prisma.anuncio_quarto.create.mockResolvedValue({ id: "listing-1" });

        await expect(repository.create(listing as never, "member-1")).resolves.toEqual({
            id: "listing-1",
        });
        expect(prisma.anuncio_quarto.create).toHaveBeenCalledWith({
            data: {
                casa_id: "home-1",
                criado_por_participacao_id: "member-1",
                titulo: "Quarto mobiliado",
                descricao: "Perto do campus",
                valor_mensal: 450,
                cidade: "Quixadá",
                bairro: "Centro",
                enderecoCompleto: "Rua A, 10",
                exibeEnderecoCompleto: false,
                contato: "(88) 99999-0000",
                exibeContato: false,
                perfilConvivencia: "Estudantes",
                tipoMoradia: "QUARTO_INDIVIDUAL",
                aceitaPets: false,
                fotos: ["https://cdn/fullhouse/room.png"],
            },
        });
    });

    it("builds paginated listing filters and returns the transaction result", async () => {
        prisma.anuncio_quarto.findMany.mockResolvedValue([{ id: "listing-1" }]);
        prisma.anuncio_quarto.count.mockResolvedValue(7);
        const query = {
            cidade: " Fortaleza ",
            bairro: " Aldeota ",
            precoMin: 300,
            precoMax: 900,
            status: "FECHADO",
            tipoMoradia: "KITNET",
            aceitaPets: true,
            page: 2,
            limit: 5,
        };

        await expect(repository.findMany(query as never)).resolves.toEqual({
            data: [{ id: "listing-1" }],
            total: 7,
        });
        expect(prisma.anuncio_quarto.findMany).toHaveBeenCalledWith({
            where: {
                status: "FECHADO",
                cidade: { contains: "Fortaleza", mode: "insensitive" },
                bairro: { contains: "Aldeota", mode: "insensitive" },
                valor_mensal: { gte: 300, lte: 900 },
                tipoMoradia: "KITNET",
                aceitaPets: true,
            },
            orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
            skip: 5,
            take: 5,
        });
        expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it("uses optional price and household filters only when supplied", async () => {
        await repository.findMany({ page: 1, limit: 10 } as never);
        expect(prisma.anuncio_quarto.findMany).toHaveBeenCalledWith({
            where: { status: "ABERTO" },
            orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
            skip: 0,
            take: 10,
        });

        await repository.findMany({ page: 3, limit: 8, precoMin: 200 } as never);
        expect(prisma.anuncio_quarto.findMany).toHaveBeenLastCalledWith(
            expect.objectContaining({
                where: { status: "ABERTO", valor_mensal: { gte: 200 } },
                skip: 16,
                take: 8,
            })
        );
    });

    it("looks up listings by ID and includes owner membership details for authorization", async () => {
        await repository.findById("listing-1");
        await repository.findForOwner("listing-1");

        expect(prisma.anuncio_quarto.findUnique).toHaveBeenNthCalledWith(1, {
            where: { id: "listing-1" },
        });
        expect(prisma.anuncio_quarto.findUnique).toHaveBeenNthCalledWith(2, {
            where: { id: "listing-1" },
            include: {
                participacao: { select: { usuario_id: true, data_saida: true } },
            },
        });
    });

    it("lists only the authenticated user's listings and applies the optional residence scope", async () => {
        await repository.findMine("user-1");
        expect(prisma.anuncio_quarto.findMany).toHaveBeenNthCalledWith(1, {
            where: { participacao: { usuario_id: "user-1" } },
            orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
        });

        await repository.findMine("user-1", "home-1");
        expect(prisma.anuncio_quarto.findMany).toHaveBeenNthCalledWith(2, {
            where: { participacao: { usuario_id: "user-1" }, casa_id: "home-1" },
            orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
        });
    });

    it("updates only supplied listing fields and normalizes blank optional values", async () => {
        const update = {
            titulo: " Novo título ",
            descricao: " ",
            preco: 525,
            cidade: " Fortaleza ",
            bairro: " ",
            enderecoCompleto: " ",
            exibeEnderecoCompleto: true,
            contato: " ",
            exibeContato: false,
            perfilConvivencia: "  Silencioso  ",
            tipoMoradia: "KITNET",
            aceitaPets: true,
            fotos: [],
            status: "FECHADO",
        };
        await repository.update("listing-1", update as never);

        expect(prisma.anuncio_quarto.update).toHaveBeenCalledWith({
            where: { id: "listing-1" },
            data: {
                titulo: "Novo título",
                descricao: null,
                valor_mensal: 525,
                cidade: "Fortaleza",
                bairro: null,
                enderecoCompleto: null,
                exibeEnderecoCompleto: true,
                contato: null,
                exibeContato: false,
                perfilConvivencia: "Silencioso",
                tipoMoradia: "KITNET",
                aceitaPets: true,
                fotos: [],
                status: "FECHADO",
            },
        });
    });

    it("closes a listing and looks up a pending interest", async () => {
        await repository.close("listing-1");
        await repository.findInterest("listing-1", "user-1");

        expect(prisma.anuncio_quarto.update).toHaveBeenCalledWith({
            where: { id: "listing-1" },
            data: { status: "FECHADO" },
        });
        expect(prisma.interesse_anuncio.findFirst).toHaveBeenCalledWith({
            where: {
                anuncio_id: "listing-1",
                usuario_id: "user-1",
                status: { in: ["PENDENTE", "ACEITO"] },
            },
        });
    });

    it("creates an interest only while the listing is open and no pending duplicate exists", async () => {
        await expect(repository.createInterest("listing-1", "user-1", "  Olá!  ")).resolves.toEqual(
            { id: "interest-1" }
        );
        expect(transaction.$queryRaw).toHaveBeenCalledOnce();
        expect(transaction.interesse_anuncio.create).toHaveBeenCalledWith({
            data: { anuncio_id: "listing-1", usuario_id: "user-1", mensagem: "Olá!" },
        });

        transaction.$queryRaw.mockResolvedValueOnce([]);
        await expect(repository.createInterest("closed-listing", "user-1")).rejects.toBeInstanceOf(
            NotFoundException
        );

        transaction.$queryRaw.mockResolvedValueOnce([
            { casa_id: "house-1", usuario_id: "author-1", titulo: "Quarto" },
        ]);
        transaction.interesse_anuncio.findFirst.mockResolvedValueOnce({ id: "existing" });
        await expect(repository.createInterest("listing-1", "user-1")).rejects.toBeInstanceOf(
            ConflictException
        );
    });

    it("lists interests with user and negotiation details", async () => {
        await repository.listInterests("listing-1");

        expect(prisma.interesse_anuncio.findMany).toHaveBeenCalledWith({
            where: { anuncio_id: "listing-1" },
            include: {
                usuario: { select: { id: true, nome: true, email: true, foto_url: true } },
                negociacao_anuncio: { select: { id: true } },
            },
            orderBy: { id: "desc" },
        });
    });
});
