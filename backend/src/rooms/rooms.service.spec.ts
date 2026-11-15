import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomsService } from "./rooms.service.js";

describe("RoomsService", () => {
    const repository = {
        create: vi.fn(),
        findMany: vi.fn(),
        findById: vi.fn(),
        findMine: vi.fn(),
        findForOwner: vi.fn(),
        update: vi.fn(),
        close: vi.fn(),
        findInterest: vi.fn(),
        createInterest: vi.fn(),
        listInterests: vi.fn(),
        updateInterest: vi.fn(),
    };
    const residenceAccess = { requireMembership: vi.fn() };
    const storage = { upload: vi.fn() };
    const service = new RoomsService(
        repository as never,
        residenceAccess as never,
        storage as never
    );

    beforeEach(() => {
        vi.resetAllMocks();
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
        residenceAccess.requireMembership.mockResolvedValue({ memberId: "member-1" });
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

    it("does not expose a closed listing through public detail", async () => {
        repository.findById.mockResolvedValue({ id: "listing-1", status: "FECHADO" });
        await expect(service.findById("listing-1")).rejects.toBeInstanceOf(NotFoundException);
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
});
