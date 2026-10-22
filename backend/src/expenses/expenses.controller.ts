import {
    Body,
    BadRequestException,
    Controller,
    Delete,
    Get,
    Post,
    Put,
    Param,
    ParseUUIDPipe,
    UseGuards,
    Query,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { CreateExpenseDto } from "./dto/create-expense.dto.js";
import { UpdateExpenseDto } from "./dto/update-expense.dto.js";
import { ExpensesService } from "./expenses.service.js";

@Controller("expenses")
@UseGuards(JwtAuthGuard)
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) {}

    @Get("subgroups")
    findAvailableSubgroups(@CurrentUser() user: { id: string }) {
        return this.expensesService.findAvailableSubgroups(user.id);
    }

    @Get("homes")
    findAvailableHomes(@CurrentUser() user: { id: string }) {
        return this.expensesService.findAvailableHomes(user.id);
    }

    @Get()
    findAll(@CurrentUser() user: { id: string }, @Query("paymentStatus") paymentStatus?: string) {
        if (paymentStatus && paymentStatus !== "PENDING" && paymentStatus !== "PAID") {
            throw new BadRequestException("Filtre de pagamento inválido.");
        }
        return this.expensesService.findAll(
            user.id,
            paymentStatus as "PENDING" | "PAID" | undefined
        );
    }

    @Post()
    create(@Body() data: CreateExpenseDto, @CurrentUser() user: { id: string }) {
        return this.expensesService.create(data, user.id);
    }

    @Put(":id")
    update(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @Body() data: UpdateExpenseDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.expensesService.update(id, data, user.id);
    }

    @Delete(":id")
    remove(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.expensesService.remove(id, user.id);
    }
}
