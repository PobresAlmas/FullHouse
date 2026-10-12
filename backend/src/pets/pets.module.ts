import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { PetsController } from "./pets.controller.js";
import { PetsRepository } from "./pets.repository.js";
import { PetsService } from "./pets.service.js";

@Module({
    imports: [PrismaModule],
    controllers: [PetsController],
    providers: [PetsRepository, PetsService],
})
export class PetsModule {}
