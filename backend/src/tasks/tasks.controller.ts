import {
    Body,
    Controller,
    Delete,
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
import { CreateTaskDto } from "./dto/create-task.dto.js";
import { TaskListQueryDto } from "./dto/task-list-query.dto.js";
import { UpdateTaskDto } from "./dto/update-task.dto.js";
import { TasksService } from "./tasks.service.js";

@Controller("residences/:residenceId/tasks")
@UseGuards(JwtAuthGuard)
export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Get("members")
    findMembers(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.tasksService.findMembers(residenceId, user.id);
    }

    @Get()
    findAll(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Query() query: TaskListQueryDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.tasksService.findAll(residenceId, user.id, query);
    }

    @Post()
    create(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() data: CreateTaskDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.tasksService.create(residenceId, data, user.id);
    }

    @Get(":taskId")
    findOne(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.tasksService.findOne(residenceId, taskId, user.id);
    }

    @Patch(":taskId")
    update(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
        @Body() data: UpdateTaskDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.tasksService.update(residenceId, taskId, data, user.id);
    }

    @Patch(":taskId/complete")
    complete(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.tasksService.complete(residenceId, taskId, user.id);
    }

    @Delete(":taskId")
    remove(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.tasksService.remove(residenceId, taskId, user.id);
    }
}
