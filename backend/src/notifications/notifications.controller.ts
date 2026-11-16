import { Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { NotificationsService } from "./notifications.service.js";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly service: NotificationsService) {}

    @Get()
    list(@CurrentUser() user: { id: string }) {
        return this.service.list(user.id);
    }

    @Patch(":id/read")
    markRead(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.markRead(id, user.id);
    }
}
