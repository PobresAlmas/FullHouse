import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ResidencesModule } from "../residences/residences.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { RoomsController } from "./rooms.controller.js";
import { RoomsRepository } from "./rooms.repository.js";
import { RoomsService } from "./rooms.service.js";

@Module({
    imports: [PrismaModule, ResidencesModule, StorageModule],
    controllers: [RoomsController],
    providers: [RoomsRepository, RoomsService],
})
export class RoomsModule {}
