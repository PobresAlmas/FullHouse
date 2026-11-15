import { BadRequestException, Injectable } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { ResidenceAccessService } from "../residences/residence-access.service.js";
import { ChatRepository } from "./chat.repository.js";

@Injectable()
export class ChatService {
    private readonly streams = new Map<string, Subject<ChatMessage>>();

    constructor(
        private readonly repository: ChatRepository,
        private readonly residenceAccess: ResidenceAccessService
    ) {}

    async getConversation(residenceId: string, userId: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        const conversation = await this.repository.getOrCreateResidenceConversation(residenceId);
        const messages = await this.repository.findMessages(conversation.id);
        return {
            id: conversation.id,
            residenceId,
            messages: messages.map((message) => this.mapMessage(message)),
        };
    }

    async getMessages(residenceId: string, userId: string, afterId?: string) {
        await this.residenceAccess.requireMembership(residenceId, userId);
        const conversation = await this.repository.getOrCreateResidenceConversation(residenceId);
        const messages = await this.repository.findMessages(conversation.id, afterId);
        return messages.map((message) => this.mapMessage(message));
    }

    async send(residenceId: string, userId: string, content: string) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const normalized = content.trim();
        if (!normalized) throw new BadRequestException("Escreva uma mensagem antes de enviar.");
        const conversation = await this.repository.getOrCreateResidenceConversation(residenceId);
        const message = await this.repository.createMessage(
            conversation.id,
            membership.memberId,
            normalized
        );
        this.streams.get(conversation.id)?.next(this.mapMessage(message));
        return this.mapMessage(message);
    }

    async stream(residenceId: string, userId: string) {
        const membership = await this.residenceAccess.requireMembership(residenceId, userId);
        const conversation = await this.repository.getOrCreateResidenceConversation(residenceId);
        let subject = this.streams.get(conversation.id);
        if (!subject || subject.closed) {
            subject = new Subject<ChatMessage>();
            this.streams.set(conversation.id, subject);
        }
        return {
            memberId: membership.memberId,
            messages$: new Observable<ChatMessage>((subscriber) => {
                const subscription = subject.subscribe(subscriber);
                return () => {
                    subscription.unsubscribe();
                    if (subject.observers.length === 0) this.streams.delete(conversation.id);
                };
            }),
        };
    }

    async isActiveMember(residenceId: string, memberId: string) {
        return Boolean(await this.residenceAccess.requireActiveMember(residenceId, memberId));
    }

    private mapMessage(message: {
        id: string;
        conteudo: string;
        enviada_em: Date;
        participacao: { id: string; usuario: { nome: string; apelido: string | null } };
    }) {
        return {
            id: message.id,
            content: message.conteudo,
            sentAt: message.enviada_em,
            author: {
                memberId: message.participacao.id,
                name: message.participacao.usuario.apelido || message.participacao.usuario.nome,
            },
        };
    }
}

export type ChatMessage = {
    id: string;
    content: string;
    sentAt: Date;
    author: { memberId: string; name: string };
};
