import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ResidencesModule } from "../residences/residences.module.js";
import { ChatController } from "./chat.controller.js";
import { ChatRepository } from "./chat.repository.js";
import { ChatService } from "./chat.service.js";

@Module({
    imports: [PrismaModule, ResidencesModule],
    controllers: [ChatController],
    providers: [ChatRepository, ChatService],
})
export class ChatModule {}
