import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoomsRepository } from "./rooms.repository.js";

describe("RoomsRepository room-interest retry rules", () => {
    const transaction = {
        $queryRaw: vi.fn(),
        interesse_anuncio: {
            findFirst: vi.fn(),
            update: vi.fn(),
            create: vi.fn(),
        },
        notificacao: { create: vi.fn() },
    };
    const prisma = {
        interesse_anuncio: { findFirst: vi.fn() },
        $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
            callback(transaction)
        ),
    };
    const repository = new RoomsRepository(prisma as never);

    beforeEach(() => {
        vi.clearAllMocks();
        transaction.$queryRaw.mockResolvedValue([
            { casa_id: "house-1", usuario_id: "author-1", titulo: "Quarto" },
        ]);
        transaction.interesse_anuncio.findFirst.mockResolvedValue(null);
        transaction.interesse_anuncio.update.mockResolvedValue({
            id: "interest-1",
            anuncio_id: "listing-1",
            status: "PENDENTE",
            mensagem: "Tenho interesse novamente.",
        });
        transaction.interesse_anuncio.create.mockResolvedValue({
            id: "interest-2",
            anuncio_id: "listing-1",
            status: "PENDENTE",
        });
    });

    it("treats accepted interests as existing and blocks duplicates before the transaction", async () => {
        prisma.interesse_anuncio.findFirst.mockResolvedValue({
            id: "accepted-1",
            status: "ACEITO",
        });

        await expect(repository.findInterest("listing-1", "user-1")).resolves.toMatchObject({
            status: "ACEITO",
        });
        expect(prisma.interesse_anuncio.findFirst).toHaveBeenCalledWith({
            where: {
                anuncio_id: "listing-1",
                usuario_id: "user-1",
                status: { in: ["PENDENTE", "ACEITO"] },
            },
        });
    });

    it("rejects a repeated active interest while holding the listing lock", async () => {
        transaction.interesse_anuncio.findFirst.mockResolvedValueOnce({
            id: "accepted-1",
            status: "ACEITO",
        });

        await expect(
            repository.createInterest("listing-1", "user-1", "Outra mensagem")
        ).rejects.toBeInstanceOf(ConflictException);
        expect(transaction.$queryRaw).toHaveBeenCalledOnce();
        expect(transaction.interesse_anuncio.create).not.toHaveBeenCalled();
        expect(transaction.interesse_anuncio.update).not.toHaveBeenCalled();
        expect(transaction.notificacao.create).not.toHaveBeenCalled();
    });

    it("reopens a declined interest instead of creating a duplicate row", async () => {
        transaction.interesse_anuncio.findFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: "interest-1", status: "RECUSADO" });

        await expect(
            repository.createInterest("listing-1", "user-1", " Tenho interesse novamente. ")
        ).resolves.toMatchObject({ id: "interest-1", status: "PENDENTE" });
        expect(transaction.interesse_anuncio.update).toHaveBeenCalledWith({
            where: { id: "interest-1" },
            data: { status: "PENDENTE", mensagem: "Tenho interesse novamente." },
        });
        expect(transaction.interesse_anuncio.create).not.toHaveBeenCalled();
        expect(transaction.notificacao.create).toHaveBeenCalledOnce();
    });

    it("creates an interest when the user has no prior interest", async () => {
        transaction.interesse_anuncio.findFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        await expect(
            repository.createInterest("listing-1", "user-1", "Tenho interesse.")
        ).resolves.toMatchObject({ id: "interest-2", status: "PENDENTE" });
        expect(transaction.interesse_anuncio.create).toHaveBeenCalledWith({
            data: {
                anuncio_id: "listing-1",
                usuario_id: "user-1",
                mensagem: "Tenho interesse.",
            },
        });
        expect(transaction.notificacao.create).toHaveBeenCalledExactlyOnceWith({
            data: {
                usuario_id: "author-1",
                casa_id: "house-1",
                tipo: "SISTEMA",
                titulo: "Novo interesse em um quarto",
                mensagem: "Alguém se interessou pelo anúncio “Quarto”.",
                entidade_tipo: "INTERESSE_QUARTO",
                entidade_id: "listing-1",
            },
        });
    });
});
