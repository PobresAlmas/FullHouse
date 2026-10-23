import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateResidenceDto } from "./dto/create-residence.dto.js";
import { ResidencesRepository } from "./residences.repository.js";
import { ResidencesService } from "./residences.service.js";

describe("residence creation", () => {
    it("trims the name and returns the created residence and leadership membership", async () => {
        const transaction = {
            casa: {
                create: vi.fn().mockResolvedValue({
                    id: "residence-1",
                    nome: "Casa do Vale",
                    cidade: null,
                    bairro: null,
                    status: "ATIVA",
                }),
            },
            participacao: {
                create: vi.fn().mockResolvedValue({ id: "member-1", papel: "LIDER" }),
            },
        };
        const prisma = {
            $transaction: vi.fn((work: (tx: typeof transaction) => unknown) => work(transaction)),
        };
        const repository = new ResidencesRepository(prisma as never);
        const service = new ResidencesService(repository);

        await expect(service.create({ name: " Casa do Vale " }, "user-1")).resolves.toEqual({
            id: "residence-1",
            name: "Casa do Vale",
            city: null,
            neighborhood: null,
            status: "ATIVA",
            membership: { id: "member-1", role: "LIDER" },
            creationEditPolicy: "TODOS",
        });
        expect(prisma.$transaction).toHaveBeenCalledOnce();
        expect(transaction.casa.create).toHaveBeenCalledWith({
            data: { nome: "Casa do Vale", criada_por_usuario_id: "user-1" },
            select: { id: true, nome: true, cidade: true, bairro: true, status: true },
        });
        expect(transaction.participacao.create).toHaveBeenCalledWith({
            data: { casa_id: "residence-1", usuario_id: "user-1", papel: "LIDER" },
            select: { id: true, papel: true },
        });
    });

    it("rolls back by propagating a failed membership insertion from the transaction", async () => {
        const failure = new Error("membership insert failed");
        const transaction = {
            casa: { create: vi.fn().mockResolvedValue({ id: "residence-1" }) },
            participacao: { create: vi.fn().mockRejectedValue(failure) },
        };
        const prisma = {
            $transaction: vi.fn(async (work: (tx: typeof transaction) => unknown) =>
                work(transaction)
            ),
        };
        const repository = new ResidencesRepository(prisma as never);

        await expect(repository.create("Casa", "user-1")).rejects.toBe(failure);
        expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it.each(["", "   ", "a".repeat(151)])("rejects invalid residence name %j", async (name) => {
        const dto = plainToInstance(CreateResidenceDto, { name });
        await expect(validate(dto)).resolves.not.toHaveLength(0);
    });

    it("accepts a trimmed name within the schema limit", async () => {
        const dto = plainToInstance(CreateResidenceDto, { name: `  ${"a".repeat(150)}  ` });
        await expect(validate(dto)).resolves.toHaveLength(0);
    });
});
