import {
    Body,
    BadRequestException,
    Controller,
    Delete,
    Get,
    Post,
    Patch,
    Put,
    Param,
    ParseUUIDPipe,
    UseGuards,
    UsePipes,
    ValidationPipe,
    Query,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { CreateExpenseDto, ExpenseScope } from "./dto/create-expense.dto.js";
import { UpdateExpenseDto } from "./dto/update-expense.dto.js";
import { CreateExpenseSubgroupDto } from "./dto/create-expense-subgroup.dto.js";
import { SetPersonalPaymentStatusDto } from "./dto/set-personal-payment-status.dto.js";
import { UpsertExpenseReminderDto } from "./dto/upsert-expense-reminder.dto.js";
import { ExpensesService } from "./expenses.service.js";

@Controller("expenses")
@UseGuards(JwtAuthGuard)
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) {}

    @Get("subgroups")
    findAvailableSubgroups(@CurrentUser() user: { id: string }) {
        return this.expensesService.findAvailableSubgroups(user.id);
    }

    @Get("subgroups/all")
    findAllSubgroups(@CurrentUser() user: { id: string }) {
        return this.expensesService.findAllSubgroups(user.id);
    }

    @Get("homes")
    findAvailableHomes(@CurrentUser() user: { id: string }) {
        return this.expensesService.findAvailableHomes(user.id);
    }

    @Get("homes/:homeId/members")
    findHomeMembers(
        @Param("homeId", new ParseUUIDPipe({ version: "4" })) homeId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.expensesService.findHomeMembers(homeId, user.id);
    }

    @Post("subgroups")
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    createSubgroup(@Body() data: CreateExpenseSubgroupDto, @CurrentUser() user: { id: string }) {
        return this.expensesService.createSubgroup(data, user.id);
    }

    @Put("subgroups/:id")
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    updateSubgroup(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @Body() data: CreateExpenseSubgroupDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.expensesService.updateSubgroup(id, data, user.id);
    }

    @Get()
    findAll(
        @CurrentUser() user: { id: string },
        @Query("paymentStatus") paymentStatus?: string,
        @Query("scope") scope = ExpenseScope.HOME
    ) {
        if (paymentStatus && paymentStatus !== "PENDING" && paymentStatus !== "PAID") {
            throw new BadRequestException("Filtre de pagamento inválido.");
        }
        if (scope !== ExpenseScope.HOME && scope !== ExpenseScope.PERSONAL) {
            throw new BadRequestException("Contexto financeiro inválido.");
        }
        return this.expensesService.findAll(
            user.id,
            paymentStatus as "PENDING" | "PAID" | undefined,
            scope
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

    @Patch(":id/personal-payment")
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    setPersonalPaymentStatus(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @Body() data: SetPersonalPaymentStatusDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.expensesService.setPersonalPaymentStatus(id, user.id, data.paid);
    }

    @Post(":id/reminder")
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    setExpenseReminder(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @Body() data: UpsertExpenseReminderDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.expensesService.setExpenseReminder(id, user.id, data);
    }

    @Delete(":id/reminder")
    deleteExpenseReminder(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.expensesService.deleteExpenseReminder(id, user.id);
    }

    @Post(":id/proofs")
    @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
    addProof(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
            })
        )
        file: Express.Multer.File,
        @CurrentUser() user: { id: string }
    ) {
        return this.expensesService.addExpenseProof(id, user.id, file);
    }

    @Delete(":id")
    remove(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.expensesService.remove(id, user.id);
    }
}
