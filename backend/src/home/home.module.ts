import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { HomeController } from "./home.controller.js";
import { HomeRepository } from "./home.repository.js";
import { HomeService } from "./home.service.js";
import { ResidencesModule } from "../residences/residences.module.js";

@Module({
    imports: [PrismaModule, ResidencesModule],
    controllers: [HomeController],
    providers: [HomeRepository, HomeService],
})
export class HomeModule {}
