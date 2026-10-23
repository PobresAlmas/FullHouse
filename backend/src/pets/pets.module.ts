import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { PetsController } from "./pets.controller.js";
import { PetsRepository } from "./pets.repository.js";
import { PetsService } from "./pets.service.js";
import { ResidencesModule } from "../residences/residences.module.js";

@Module({
    imports: [PrismaModule, ResidencesModule],
    controllers: [PetsController],
    providers: [PetsRepository, PetsService],
})
export class PetsModule {}
