import {
    Controller,
    Get,
    Sse,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
    UseGuards,
} from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import { from, interval, map, startWith, switchMap } from "rxjs";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { NotificationsService } from "./notifications.service.js";
import { NotificationsQueryDto } from "./dto/notifications-query.dto.js";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly service: NotificationsService) {}

    @Get()
    list(@CurrentUser() user: { id: string }, @Query() query: NotificationsQueryDto) {
        return this.service.list(user.id, query.limit, query.cursor, query.unreadOnly);
    }

    @Sse("stream")
    stream(@CurrentUser() user: { id: string }) {
        return interval(5_000).pipe(
            startWith(0),
            switchMap(() => from(this.service.list(user.id, 20))),
            map((data) => ({ data } satisfies MessageEvent))
        );
    }

    @Patch(":id/read")
    markRead(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.markRead(id, user.id);
    }
}
