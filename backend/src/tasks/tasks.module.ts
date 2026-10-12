import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { TasksController } from "./tasks.controller.js";
import { TasksRepository } from "./tasks.repository.js";
import { TasksService } from "./tasks.service.js";

@Module({
    imports: [PrismaModule],
    controllers: [TasksController],
    providers: [TasksRepository, TasksService],
})
export class TasksModule {}
