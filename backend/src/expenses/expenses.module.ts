import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ExpensesController } from "./expenses.controller.js";
import { ExpensesRepository } from "./expenses.repository.js";
import { ExpensesService } from "./expenses.service.js";

@Module({
    imports: [PrismaModule],
    controllers: [ExpensesController],
    providers: [ExpensesRepository, ExpensesService],
})
export class ExpensesModule {}
