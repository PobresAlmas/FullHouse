import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsRepository } from "./notifications.repository.js";
import { NotificationsService } from "./notifications.service.js";

@Module({
    imports: [PrismaModule],
    controllers: [NotificationsController],
    providers: [NotificationsRepository, NotificationsService],
})
export class NotificationsModule {}
