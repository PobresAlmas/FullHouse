import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { CreateTaskDto } from "./dto/create-task.dto.js";
import { UpdateTaskDto } from "./dto/update-task.dto.js";
import { TasksService } from "./tasks.service.js";

@Controller("tasks/personal")
@UseGuards(JwtAuthGuard)
export class PersonalTasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Get()
    findAll(@CurrentUser() user: { id: string }) {
        return this.tasksService.findPersonal(user.id);
    }

    @Post()
    create(@Body() data: CreateTaskDto, @CurrentUser() user: { id: string }) {
        return this.tasksService.createPersonal(data, user.id);
    }

    @Get(":taskId")
    findOne(
        @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.tasksService.findPersonalOne(taskId, user.id);
    }

    @Patch(":taskId")
    update(
        @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
        @Body() data: UpdateTaskDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.tasksService.updatePersonal(taskId, data, user.id);
    }

    @Patch(":taskId/complete")
    complete(
        @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.tasksService.completePersonal(taskId, user.id);
    }

    @Delete(":taskId")
    remove(
        @Param("taskId", new ParseUUIDPipe({ version: "4" })) taskId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.tasksService.removePersonal(taskId, user.id);
    }
}
