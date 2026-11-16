import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { ResidenceAccessService } from "../residences/residence-access.service.js";
import { CreateMeetingDto } from "./dto/create-meeting.dto.js";
import { MeetingsRepository } from "./meetings.repository.js";
import { MeetingResponse } from "./dto/respond-meeting.dto.js";

type MeetingRecord = Prisma.reuniaoGetPayload<{
    include: {
        participacao: { select: { id: true; usuario: { select: { nome: true; apelido: true } } } };
        participante_reuniao: {
            include: {
                participacao: {
                    select: { id: true; usuario: { select: { nome: true; apelido: true } } };
                };
            };
        };
    };
}>;

@Injectable()
export class MeetingsService {
    constructor(
        private readonly repository: MeetingsRepository,
        private readonly residenceAccess: ResidenceAccessService
    ) {}

    async findAll(residenceId: string, userId: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        return (await this.repository.findAll(residenceId)).map((meeting) =>
            this.mapMeeting(meeting)
        );
    }

    async create(residenceId: string, data: CreateMeetingDto, userId: string) {
        const member = await this.residenceAccess.requireMembership(residenceId, userId);
        const dateTime = this.futureDate(data.dateTime);
        return this.mapMeeting(
            await this.repository.create(residenceId, member.memberId, dateTime, data.agenda)
        );
    }

    async respond(
        residenceId: string,
        meetingId: string,
        response: MeetingResponse,
        userId: string
    ) {
        const member = await this.residenceAccess.requireMembership(residenceId, userId);
        const updated = await this.repository.respond(
            residenceId,
            meetingId,
            member.memberId,
            response
        );
        if (!updated) {
            const meeting = await this.repository.findOne(residenceId, meetingId);
            if (!meeting) throw new NotFoundException("A reunião não está disponível.");
            throw new ForbiddenException("Você não tem um convite ativo para esta reunião.");
        }
        const meeting = await this.repository.findOne(residenceId, meetingId);
        if (!meeting) throw new NotFoundException("A reunião não está disponível.");
        return this.mapMeeting(meeting);
    }

    async reschedule(
        residenceId: string,
        meetingId: string,
        data: CreateMeetingDto,
        userId: string
    ) {
        const member = await this.residenceAccess.requireMembership(residenceId, userId);
        const replacement = await this.repository.reschedule(
            residenceId,
            meetingId,
            member.memberId,
            this.futureDate(data.dateTime),
            data.agenda
        );
        if (!replacement) {
            const existing = await this.repository.findOne(residenceId, meetingId);
            if (existing && existing.criada_por_participacao_id !== member.memberId) {
                throw new ForbiddenException("Somente quem organizou pode alterar esta reunião.");
            }
            throw new NotFoundException("A reunião não está disponível para reagendamento.");
        }
        return this.mapMeeting(replacement);
    }

    async cancel(residenceId: string, meetingId: string, userId: string) {
        const member = await this.residenceAccess.requireMembership(residenceId, userId);
        const result = await this.repository.cancel(residenceId, meetingId, member.memberId);
        if (!result.count) {
            const existing = await this.repository.findOne(residenceId, meetingId);
            if (existing && existing.criada_por_participacao_id !== member.memberId) {
                throw new ForbiddenException("Somente quem organizou pode cancelar esta reunião.");
            }
            throw new NotFoundException("A reunião não está disponível para cancelamento.");
        }
        const meeting = await this.repository.findOne(residenceId, meetingId);
        return meeting ? this.mapMeeting(meeting) : null;
    }

    private futureDate(value: string) {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
            throw new BadRequestException("A reunião deve ser marcada para uma data futura.");
        }
        return date;
    }

    private mapMeeting(meeting: MeetingRecord) {
        return {
            id: meeting.id,
            title: meeting.titulo,
            agenda: meeting.pauta,
            dateTime: meeting.data_hora,
            status: meeting.status,
            organizer: meeting.participacao.usuario.apelido || meeting.participacao.usuario.nome,
            organizerMemberId: meeting.criada_por_participacao_id,
            rescheduledFromId: meeting.reagendada_de_id,
            participants: meeting.participante_reuniao.map((invite) => ({
                memberId: invite.participacao.id,
                name: invite.participacao.usuario.apelido || invite.participacao.usuario.nome,
                response: invite.situacao,
                respondedAt: invite.respondido_em,
            })),
        };
    }
}
