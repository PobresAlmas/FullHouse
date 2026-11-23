import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeetingsRepository } from "../../../src/meetings/meetings.repository.js";
import { MeetingsService } from "../../../src/meetings/meetings.service.js";
import { ResidenceAccessService } from "../../../src/residences/residence-access.service.js";

describe("MeetingsService", () => {
    const homeId = "00000000-0000-4000-8000-000000000001";
    const userId = "00000000-0000-4000-8000-000000000002";
    const memberId = "00000000-0000-4000-8000-000000000003";
    const meetingId = "00000000-0000-4000-8000-000000000004";
    const meeting = {
        id: meetingId,
        titulo: "Reunião semanal",
        pauta: "Reunião semanal para organização da casa",
        data_hora: new Date(Date.now() + 86_400_000),
        status: "AGENDADA",
        criada_por_participacao_id: memberId,
        reagendada_de_id: null,
        participacao: { usuario: { nome: "Iago", apelido: null } },
        participante_reuniao: [
            {
                situacao: "PENDENTE",
                respondido_em: null,
                participacao: { id: memberId, usuario: { nome: "Iago", apelido: null } },
            },
        ],
    };
    let repository: Record<string, ReturnType<typeof vi.fn>>;
    let access: { requireMembership: ReturnType<typeof vi.fn> };
    let service: MeetingsService;

    beforeEach(() => {
        repository = {
            findAll: vi.fn().mockResolvedValue([meeting]),
            findOne: vi.fn().mockResolvedValue(meeting),
            create: vi.fn().mockResolvedValue(meeting),
            respond: vi.fn().mockResolvedValue(true),
            reschedule: vi.fn().mockResolvedValue({ ...meeting, reagendada_de_id: meetingId }),
            cancel: vi.fn().mockResolvedValue({ count: 1 }),
            deleteCancelled: vi.fn().mockResolvedValue({ count: 1 }),
        };
        access = { requireMembership: vi.fn().mockResolvedValue({ memberId }) };
        service = new MeetingsService(
            repository as unknown as MeetingsRepository,
            access as unknown as ResidenceAccessService
        );
    });

    it("creates a future meeting with the active member as organizer", async () => {
        const result = await service.create(
            homeId,
            {
                dateTime: new Date(Date.now() + 86_400_000).toISOString(),
                agenda: "Reunião semanal para organização da casa",
            },
            userId
        );
        expect(repository.create).toHaveBeenCalledWith(
            homeId,
            memberId,
            expect.any(Date),
            "Reunião semanal para organização da casa"
        );
        expect(result.organizerMemberId).toBe(memberId);
    });

    it("rejects past dates before creating any records", async () => {
        await expect(
            service.create(
                homeId,
                {
                    dateTime: "2020-01-01T00:00:00.000Z",
                    agenda: "Pauta",
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("rejects responses without an active invite", async () => {
        repository.respond.mockResolvedValue(false);
        await expect(service.respond(homeId, meetingId, "CONFIRMADO", userId)).rejects.toThrow(
            ForbiddenException
        );
    });

    it("retains organizer control over rescheduling and cancellation", async () => {
        repository.reschedule.mockResolvedValue(null);
        await expect(
            service.reschedule(
                homeId,
                meetingId,
                {
                    dateTime: new Date(Date.now() + 86_400_000).toISOString(),
                    agenda: "Nova pauta",
                },
                userId
            )
        ).rejects.toThrow(NotFoundException);
        repository.cancel.mockResolvedValue({ count: 0 });
        repository.findOne.mockResolvedValue({
            ...meeting,
            criada_por_participacao_id: "other-member",
        });
        await expect(service.cancel(homeId, meetingId, userId)).rejects.toThrow(ForbiddenException);
    });

    it("deletes a canceled meeting and rejects active meetings", async () => {
        await expect(service.removeCancelled(homeId, meetingId, userId)).resolves.toEqual({
            id: meetingId,
            deleted: true,
        });
        expect(repository.deleteCancelled).toHaveBeenCalledWith(homeId, meetingId, memberId);

        repository.deleteCancelled.mockResolvedValue({ count: 0 });
        repository.findOne.mockResolvedValue(meeting);
        await expect(service.removeCancelled(homeId, meetingId, userId)).rejects.toThrow(
            BadRequestException
        );
    });
});
