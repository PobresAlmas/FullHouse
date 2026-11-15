import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ResidencesModule } from "../residences/residences.module.js";
import { MeetingsController } from "./meetings.controller.js";
import { MeetingsRepository } from "./meetings.repository.js";
import { MeetingsService } from "./meetings.service.js";

@Module({
    imports: [PrismaModule, ResidencesModule],
    controllers: [MeetingsController],
    providers: [MeetingsRepository, MeetingsService],
})
export class MeetingsModule {}
