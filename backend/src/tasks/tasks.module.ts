import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { TasksController } from "./tasks.controller.js";
import { TasksRepository } from "./tasks.repository.js";
import { TasksService } from "./tasks.service.js";
import { PersonalTasksController } from "./personal-tasks.controller.js";
import { TaskExchangeController } from "./task-exchange.controller.js";
import { TaskExchangeService } from "./task-exchange.service.js";
import { ResidencesModule } from "../residences/residences.module.js";

@Module({
    imports: [PrismaModule, ResidencesModule],
    controllers: [TasksController, PersonalTasksController, TaskExchangeController],
    providers: [TasksRepository, TasksService, TaskExchangeService],
})
export class TasksModule {}
