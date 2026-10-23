import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ResidenceAccessService } from "./residence-access.service.js";
import { ResidencesController } from "./residences.controller.js";

@Module({
    imports: [PrismaModule],
    controllers: [ResidencesController],
    providers: [ResidenceAccessService],
    exports: [ResidenceAccessService],
})
export class ResidencesModule {}
