import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { HomeController } from "./home.controller.js";
import { HomeRepository } from "./home.repository.js";
import { HomeService } from "./home.service.js";

@Module({
    imports: [PrismaModule],
    controllers: [HomeController],
    providers: [HomeRepository, HomeService],
})
export class HomeModule {}
