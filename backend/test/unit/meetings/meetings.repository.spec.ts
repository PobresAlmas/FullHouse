import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeetingsRepository } from "../../../src/meetings/meetings.repository.js";
import { PrismaService } from "../../../src/prisma/prisma.service.js";

describe("MeetingsRepository", () => {
    const homeId = "00000000-0000-4000-8000-000000000001";
    const memberId = "00000000-0000-4000-8000-000000000002";
    const meetingId = "00000000-0000-4000-8000-000000000003";
    let prisma: {
        reuniao: {
            findMany: ReturnType<typeof vi.fn>;
            findFirst: ReturnType<typeof vi.fn>;
            updateMany: ReturnType<typeof vi.fn>;
            deleteMany: ReturnType<typeof vi.fn>;
        };
        $transaction: ReturnType<typeof vi.fn>;
    };
    let tx: {
        participacao: { findMany: ReturnType<typeof vi.fn> };
        reuniao: {
            create: ReturnType<typeof vi.fn>;
            findFirst: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
        };
        participante_reuniao: { updateMany: ReturnType<typeof vi.fn> };
        notificacao: { createMany: ReturnType<typeof vi.fn> };
    };
    let repository: MeetingsRepository;

    beforeEach(() => {
        tx = {
            participacao: {
                findMany: vi.fn().mockResolvedValue([
                    { id: memberId, usuario_id: "organizer-user" },
                    { id: "member-2", usuario_id: "resident-user" },
                ]),
            },
            reuniao: {
                create: vi.fn().mockResolvedValue({ id: meetingId }),
                findFirst: vi.fn().mockResolvedValue({ id: meetingId }),
                update: vi.fn().mockResolvedValue({}),
            },
            participante_reuniao: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
            notificacao: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
        };
        prisma = {
            reuniao: {
                findMany: vi.fn().mockResolvedValue([]),
                findFirst: vi.fn().mockResolvedValue({ id: meetingId }),
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
                deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
            $transaction: vi.fn((callback: (client: unknown) => unknown) => callback(tx)),
        };
        repository = new MeetingsRepository(prisma as PrismaService);
    });

    it("creates a meeting and pending invitations for every active member in one transaction", async () => {
        const date = new Date("2027-01-01T10:00:00Z");
        await repository.create(homeId, memberId, date, "Organizar a casa");
        expect(prisma.$transaction).toHaveBeenCalledOnce();
        expect(tx.reuniao.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    casa_id: homeId,
                    criada_por_participacao_id: memberId,
                    data_hora: date,
                    titulo: "Organizar a casa",
                    pauta: "Organizar a casa",
                    participante_reuniao: {
                        create: [{ participacao_id: memberId }, { participacao_id: "member-2" }],
                    },
                }),
            })
        );
        expect(tx.notificacao.createMany).toHaveBeenCalledWith({
            data: [
                expect.objectContaining({
                    usuario_id: "resident-user",
                    casa_id: homeId,
                    entidade_id: meetingId,
                }),
            ],
        });
    });

    it("passes invitation creation failures through the transaction for rollback", async () => {
        tx.reuniao.create.mockRejectedValue(new Error("write failed"));
        await expect(repository.create(homeId, memberId, new Date(), "Pauta")).rejects.toThrow(
            "write failed"
        );
        expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it("responds only through an active invitation for the same residence", async () => {
        await repository.respond(homeId, meetingId, memberId, "CONFIRMADO");
        expect(tx.participante_reuniao.updateMany).toHaveBeenCalledWith({
            where: {
                reuniao_id: meetingId,
                participacao_id: memberId,
                participacao: { casa_id: homeId, data_saida: null },
            },
            data: { situacao: "CONFIRMADO", respondido_em: expect.any(Date) },
        });
    });

    it("retains the original meeting and links a rescheduled replacement with fresh invitations", async () => {
        const date = new Date("2027-02-01T10:00:00Z");
        await repository.reschedule(homeId, meetingId, memberId, date, "Nova pauta");
        expect(tx.reuniao.update).toHaveBeenCalledWith({
            where: { id: meetingId },
            data: { status: "REAGENDADA" },
        });
        expect(tx.reuniao.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    reagendada_de_id: meetingId,
                    data_hora: date,
                    participante_reuniao: {
                        create: [{ participacao_id: memberId }, { participacao_id: "member-2" }],
                    },
                }),
            })
        );
        expect(tx.notificacao.createMany).toHaveBeenCalledWith({
            data: [
                expect.objectContaining({ usuario_id: "resident-user", entidade_id: meetingId }),
            ],
        });
    });

    it("scopes cancellation to the meeting organizer", async () => {
        await repository.cancel(homeId, meetingId, memberId);
        expect(prisma.reuniao.updateMany).toHaveBeenCalledWith({
            where: {
                id: meetingId,
                casa_id: homeId,
                criada_por_participacao_id: memberId,
                status: "AGENDADA",
            },
            data: { status: "CANCELADA" },
        });
    });

    it("deletes only canceled meetings organized by the active member", async () => {
        await repository.deleteCancelled(homeId, meetingId, memberId);
        expect(prisma.reuniao.deleteMany).toHaveBeenCalledWith({
            where: {
                id: meetingId,
                casa_id: homeId,
                criada_por_participacao_id: memberId,
                status: "CANCELADA",
            },
        });
    });
});
