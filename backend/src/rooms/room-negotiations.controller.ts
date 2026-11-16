import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { CreateNegotiationMessageDto } from "./dto/create-negotiation-message.dto.js";
import { RoomNegotiationMessagesQueryDto } from "./dto/room-negotiation-messages-query.dto.js";
import { RespondRoomInvitationDto } from "./dto/respond-room-invitation.dto.js";
import { RoomsService } from "./rooms.service.js";

@Controller("rooms/negotiations")
@UseGuards(JwtAuthGuard)
export class RoomNegotiationsController {
    constructor(private readonly service: RoomsService) {}

    @Get("interests/mine")
    listMyInterests(@CurrentUser() user: { id: string }) {
        return this.service.listMyInterests(user.id);
    }

    @Get(":id/messages")
    getMessages(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @Query() query: RoomNegotiationMessagesQueryDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.getNegotiationMessages(id, user.id, query);
    }

    @Post(":id/messages")
    sendMessage(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @Body() data: CreateNegotiationMessageDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.sendNegotiationMessage(id, data.conteudo, user.id);
    }

    @Post(":id/invitations")
    sendInvitation(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.sendNegotiationInvitation(id, user.id);
    }

    @Patch("invitations/:invitationId")
    respondToInvitation(
        @Param("invitationId", new ParseUUIDPipe({ version: "4" })) invitationId: string,
        @Body() data: RespondRoomInvitationDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.respondToNegotiationInvitation(invitationId, data.status, user.id);
    }
}
