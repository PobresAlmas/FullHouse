import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    Sse,
    UseGuards,
} from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import { Observable, Subject, interval, filter, take, switchMap, takeUntil, mergeMap } from "rxjs";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { SendMessageDto } from "./dto/send-message.dto.js";
import { ChatMessagesQueryDto } from "./dto/chat-messages-query.dto.js";
import { ChatService } from "./chat.service.js";
import type { ChatMessage } from "./chat.service.js";

type ChatSseEvent = { id: string; type: "message"; data: ChatMessage };

@Controller("residences/:residenceId/chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chat: ChatService) {}

    @Get()
    conversation(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.chat.getConversation(residenceId, user.id);
    }

    @Get("messages")
    messages(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string },
        @Query() query: ChatMessagesQueryDto
    ) {
        return this.chat.getMessages(residenceId, user.id, query.afterId);
    }

    @Post("messages")
    send(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() body: SendMessageDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.chat.send(residenceId, user.id, body.content);
    }

    @Sse("stream")
    async stream(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        const { memberId, messages$ } = await this.chat.stream(residenceId, user.id);
        return new Observable<MessageEvent>((subscriber) => {
            const revoked = new Subject<void>();
            const membershipCheck = interval(15_000)
                .pipe(
                    switchMap(() => this.chat.isActiveMember(residenceId, memberId)),
                    filter((active) => !active),
                    take(1)
                )
                .subscribe({
                    next: () => revoked.next(),
                    error: () => revoked.next(),
                });
            const liveMessages = messages$
                .pipe(
                    mergeMap(async (data) => {
                        const active = await this.chat.isActiveMember(residenceId, memberId);
                        if (!active) {
                            revoked.next();
                            return null;
                        }
                        return { id: data.id, type: "message", data } satisfies ChatSseEvent;
                    }),
                    filter((event): event is ChatSseEvent => event !== null),
                    takeUntil(revoked)
                )
                .subscribe(subscriber);
            return () => {
                membershipCheck.unsubscribe();
                liveMessages.unsubscribe();
                revoked.complete();
            };
        });
    }
}
