import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ResidencesModule } from "../residences/residences.module.js";
import { ShoppingListController } from "./shopping-list.controller.js";
import { ShoppingListRepository } from "./shopping-list.repository.js";
import { ShoppingListService } from "./shopping-list.service.js";

@Module({
    imports: [PrismaModule, ResidencesModule],
    controllers: [ShoppingListController],
    providers: [ShoppingListRepository, ShoppingListService],
})
export class ShoppingListModule {}
