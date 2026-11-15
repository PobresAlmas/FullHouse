import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { CreateMeetingDto } from "./dto/create-meeting.dto.js";
import { RespondMeetingDto } from "./dto/respond-meeting.dto.js";
import { MeetingsService } from "./meetings.service.js";

@Controller("residences/:residenceId/meetings")
@UseGuards(JwtAuthGuard)
export class MeetingsController {
    constructor(private readonly meetings: MeetingsService) {}

    @Get()
    findAll(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.meetings.findAll(residenceId, user.id);
    }

    @Post()
    create(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() body: CreateMeetingDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.meetings.create(residenceId, body, user.id);
    }

    @Patch(":meetingId/respond")
    respond(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("meetingId", new ParseUUIDPipe({ version: "4" })) meetingId: string,
        @Body() body: RespondMeetingDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.meetings.respond(residenceId, meetingId, body.response, user.id);
    }

    @Patch(":meetingId/reschedule")
    reschedule(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("meetingId", new ParseUUIDPipe({ version: "4" })) meetingId: string,
        @Body() body: CreateMeetingDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.meetings.reschedule(residenceId, meetingId, body, user.id);
    }

    @Patch(":meetingId/cancel")
    cancel(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("meetingId", new ParseUUIDPipe({ version: "4" })) meetingId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.meetings.cancel(residenceId, meetingId, user.id);
    }
}
