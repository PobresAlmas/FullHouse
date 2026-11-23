import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

const meetingInclude = {
    participacao: { select: { id: true, usuario: { select: { nome: true, apelido: true } } } },
    participante_reuniao: {
        include: {
            participacao: {
                select: { id: true, usuario: { select: { nome: true, apelido: true } } },
            },
        },
    },
} as const;

@Injectable()
export class MeetingsRepository {
    constructor(private readonly prisma: PrismaService) {}

    findAll(residenceId: string) {
        return this.prisma.reuniao.findMany({
            where: { casa_id: residenceId },
            include: meetingInclude,
            orderBy: [{ data_hora: "asc" }, { id: "asc" }],
        });
    }

    findOne(residenceId: string, meetingId: string) {
        return this.prisma.reuniao.findFirst({
            where: { id: meetingId, casa_id: residenceId },
            include: meetingInclude,
        });
    }

    async create(residenceId: string, memberId: string, dateTime: Date, agenda: string) {
        return this.prisma.$transaction(async (tx) => {
            const members = await tx.participacao.findMany({
                where: { casa_id: residenceId, data_saida: null },
                select: { id: true, usuario_id: true },
            });
            const meeting = await tx.reuniao.create({
                data: {
                    casa_id: residenceId,
                    titulo: agenda.slice(0, 150),
                    pauta: agenda,
                    data_hora: dateTime,
                    criada_por_participacao_id: memberId,
                    participante_reuniao: {
                        create: members.map(({ id }) => ({ participacao_id: id })),
                    },
                },
                include: meetingInclude,
            });
            const recipients = members.filter(({ id }) => id !== memberId);
            if (recipients.length) {
                await tx.notificacao.createMany({
                    data: recipients.map(({ usuario_id }) => ({
                        usuario_id,
                        casa_id: residenceId,
                        tipo: "REUNIAO",
                        titulo: "Nova reunião marcada",
                        mensagem: `Uma nova reunião foi marcada: “${agenda}”. Confira os detalhes na tela de reuniões.`,
                        entidade_tipo: "REUNIAO",
                        entidade_id: meeting.id,
                    })),
                });
            }
            return meeting;
        });
    }

    respond(
        residenceId: string,
        meetingId: string,
        memberId: string,
        response: "CONFIRMADO" | "RECUSADO"
    ) {
        return this.prisma.$transaction(async (tx) => {
            const meeting = await tx.reuniao.findFirst({
                where: { id: meetingId, casa_id: residenceId, status: "AGENDADA" },
                select: { id: true },
            });
            if (!meeting) return false;
            const updated = await tx.participante_reuniao.updateMany({
                where: {
                    reuniao_id: meetingId,
                    participacao_id: memberId,
                    participacao: { casa_id: residenceId, data_saida: null },
                },
                data: { situacao: response, respondido_em: new Date() },
            });
            return updated.count > 0;
        });
    }

    async reschedule(
        residenceId: string,
        meetingId: string,
        memberId: string,
        dateTime: Date,
        agenda: string
    ) {
        return this.prisma.$transaction(async (tx) => {
            const original = await tx.reuniao.findFirst({
                where: {
                    id: meetingId,
                    casa_id: residenceId,
                    criada_por_participacao_id: memberId,
                    status: "AGENDADA",
                },
                select: { id: true },
            });
            if (!original) return null;
            await tx.reuniao.update({ where: { id: meetingId }, data: { status: "REAGENDADA" } });
            const members = await tx.participacao.findMany({
                where: { casa_id: residenceId, data_saida: null },
                select: { id: true, usuario_id: true },
            });
            const meeting = await tx.reuniao.create({
                data: {
                    casa_id: residenceId,
                    titulo: agenda.slice(0, 150),
                    pauta: agenda,
                    data_hora: dateTime,
                    criada_por_participacao_id: memberId,
                    reagendada_de_id: meetingId,
                    participante_reuniao: {
                        create: members.map(({ id }) => ({ participacao_id: id })),
                    },
                },
                include: meetingInclude,
            });
            const recipients = members.filter(({ id }) => id !== memberId);
            if (recipients.length) {
                await tx.notificacao.createMany({
                    data: recipients.map(({ usuario_id }) => ({
                        usuario_id,
                        casa_id: residenceId,
                        tipo: "REUNIAO",
                        titulo: "Reunião reagendada",
                        mensagem: `A reunião foi reagendada: “${agenda}”. Confira os detalhes na tela de reuniões.`,
                        entidade_tipo: "REUNIAO",
                        entidade_id: meeting.id,
                    })),
                });
            }
            return meeting;
        });
    }

    cancel(residenceId: string, meetingId: string, memberId: string) {
        return this.prisma.reuniao.updateMany({
            where: {
                id: meetingId,
                casa_id: residenceId,
                criada_por_participacao_id: memberId,
                status: "AGENDADA",
            },
            data: { status: "CANCELADA" },
        });
    }
}
