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
import { CreateTaskExchangeDto } from "./dto/create-task-exchange.dto.js";
import { RespondTaskExchangeDto } from "./dto/respond-task-exchange.dto.js";
import { TaskExchangeService } from "./task-exchange.service.js";

@Controller("residences/:residenceId/task-exchange-requests")
@UseGuards(JwtAuthGuard)
export class TaskExchangeController {
    constructor(private readonly exchangeService: TaskExchangeService) {}

    @Get()
    list(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.exchangeService.list(residenceId, user.id);
    }

    @Post()
    create(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() data: CreateTaskExchangeDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.exchangeService.create(residenceId, data, user.id);
    }

    @Patch(":requestId")
    respond(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("requestId", new ParseUUIDPipe({ version: "4" })) requestId: string,
        @Body() data: RespondTaskExchangeDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.exchangeService.respond(
            residenceId,
            requestId,
            data.status,
            data.targetTaskId,
            user.id
        );
    }
}
