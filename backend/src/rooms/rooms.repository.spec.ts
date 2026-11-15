import { ConflictException, NotFoundException } from "@nestjs/common";
import { RoomsRepository } from "./rooms.repository.js";

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
    };

    beforeEach(() => {
        transaction = {
            $queryRaw: vi.fn().mockResolvedValue([{ id: "listing-1" }]),
            interesse_anuncio: {
                findFirst: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue({ id: "interest-1" }),
            },
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
            where: { anuncio_id: "listing-1", usuario_id: "user-1", status: "PENDENTE" },
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

        transaction.$queryRaw.mockResolvedValueOnce([{ id: "listing-1" }]);
        transaction.interesse_anuncio.findFirst.mockResolvedValueOnce({ id: "existing" });
        await expect(repository.createInterest("listing-1", "user-1")).rejects.toBeInstanceOf(
            ConflictException
        );
    });

    it("lists interests with user details and updates only pending interests", async () => {
        await repository.listInterests("listing-1");
        await repository.updateInterest("listing-1", "interest-1", "ACEITO" as never);

        expect(prisma.interesse_anuncio.findMany).toHaveBeenCalledWith({
            where: { anuncio_id: "listing-1" },
            include: {
                usuario: { select: { id: true, nome: true, email: true, foto_url: true } },
            },
            orderBy: { id: "desc" },
        });
        expect(prisma.interesse_anuncio.updateMany).toHaveBeenCalledWith({
            where: { id: "interest-1", anuncio_id: "listing-1", status: "PENDENTE" },
            data: { status: "ACEITO" },
        });
    });
});
