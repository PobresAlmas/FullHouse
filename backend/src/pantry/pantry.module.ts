import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { PantryController } from "./pantry.controller.js";
import { PantryRepository } from "./pantry.repository.js";
import { PantryService } from "./pantry.service.js";

@Module({
    imports: [PrismaModule],
    controllers: [PantryController],
    providers: [PantryRepository, PantryService],
})
export class PantryModule {}
