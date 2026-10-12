import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { CreatePantryItemDto } from "./dto/create-pantry-item.dto.js";
import { CreatePantryMovementDto } from "./dto/create-pantry-movement.dto.js";
import { UpdatePantryItemDto } from "./dto/update-pantry-item.dto.js";
import { PantryItemListQueryDto } from "./dto/pantry-item-list-query.dto.js";
import { PantryService } from "./pantry.service.js";

@Controller("residences/:residenceId/pantry")
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PantryController {
    constructor(private readonly pantryService: PantryService) {}

    @Get("members")
    findMembers(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.pantryService.findMembers(residenceId, user.id);
    }

    @Get("items")
    findItems(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Query() query: PantryItemListQueryDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.pantryService.findItems(residenceId, user.id, query.search);
    }

    @Post("items")
    createItem(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() data: CreatePantryItemDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.pantryService.createItem(residenceId, data, user.id);
    }

    @Patch("items/:itemId")
    updateItem(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("itemId", new ParseUUIDPipe({ version: "4" })) itemId: string,
        @Body() data: UpdatePantryItemDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.pantryService.updateItem(residenceId, itemId, data, user.id);
    }

    @Post("items/:itemId/movements")
    createMovement(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("itemId", new ParseUUIDPipe({ version: "4" })) itemId: string,
        @Body() data: CreatePantryMovementDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.pantryService.createMovement(residenceId, itemId, data, user.id);
    }

    @Delete("items/:itemId")
    removeItem(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("itemId", new ParseUUIDPipe({ version: "4" })) itemId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.pantryService.removeItem(residenceId, itemId, user.id);
    }
}
