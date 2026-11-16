import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ResidencesModule } from "../residences/residences.module.js";
import { HouseRulesController } from "./house-rules.controller.js";
import { HouseRulesRepository } from "./house-rules.repository.js";
import { HouseRulesService } from "./house-rules.service.js";

@Module({
    imports: [PrismaModule, ResidencesModule],
    controllers: [HouseRulesController],
    providers: [HouseRulesRepository, HouseRulesService],
})
export class HouseRulesModule {}
