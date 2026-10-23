import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ResidenceAccessService } from "./residence-access.service.js";
import { ResidencesController } from "./residences.controller.js";
import { ResidencesRepository } from "./residences.repository.js";
import { ResidencesService } from "./residences.service.js";

@Module({
    imports: [PrismaModule],
    controllers: [ResidencesController],
    providers: [ResidenceAccessService, ResidencesRepository, ResidencesService],
    exports: [ResidenceAccessService],
})
export class ResidencesModule {}
