import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class ChatRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getOrCreateResidenceConversation(residenceId: string) {
        const existing = await this.prisma.conversa.findFirst({
            where: { casa_id: residenceId, tipo: "CASA" },
        });
        if (existing) return existing;
        try {
            return await this.prisma.conversa.create({
                data: { casa_id: residenceId, tipo: "CASA", titulo: "Chat da casa" },
            });
        } catch (error) {
            if ((error as { code?: string }).code !== "P2002") throw error;
            return this.prisma.conversa.findFirstOrThrow({
                where: { casa_id: residenceId, tipo: "CASA" },
            });
        }
    }

    async findMessages(conversationId: string, afterId?: string) {
        const cursor = afterId
            ? await this.prisma.mensagem.findFirst({
                  where: { id: afterId, conversa_id: conversationId },
                  select: { id: true, enviada_em: true },
              })
            : null;
        return this.prisma.mensagem.findMany({
            where: {
                conversa_id: conversationId,
                excluido_em: null,
                ...(afterId
                    ? cursor
                        ? {
                              OR: [
                                  { enviada_em: { gt: cursor.enviada_em } },
                                  { enviada_em: cursor.enviada_em, id: { gt: cursor.id } },
                              ],
                          }
                        : { id: { in: [] } }
                    : {}),
            },
            include: {
                participacao: {
                    select: { id: true, usuario: { select: { nome: true, apelido: true } } },
                },
            },
            orderBy: [{ enviada_em: "asc" }, { id: "asc" }],
            take: 500,
        });
    }

    createMessage(conversationId: string, memberId: string, content: string) {
        return this.prisma.mensagem.create({
            data: {
                conversa_id: conversationId,
                autor_participacao_id: memberId,
                conteudo: content,
            },
            include: {
                participacao: {
                    select: { id: true, usuario: { select: { nome: true, apelido: true } } },
                },
            },
        });
    }
}
