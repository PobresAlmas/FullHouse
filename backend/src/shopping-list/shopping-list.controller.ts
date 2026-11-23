import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { CreateShoppingListItemDto } from "./dto/create-shopping-list-item.dto.js";
import { UpdateShoppingListItemDto } from "./dto/update-shopping-list-item.dto.js";
import { UpdateShoppingListStatusDto } from "./dto/update-shopping-list-status.dto.js";
import { ShoppingListService } from "./shopping-list.service.js";

@Controller("residences/:residenceId/shopping-list/items")
@UseGuards(JwtAuthGuard)
export class ShoppingListController {
    constructor(private readonly service: ShoppingListService) {}

    @Get()
    findItems(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.findItems(residenceId, user.id);
    }

    @Post()
    createItem(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() data: CreateShoppingListItemDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.createItem(residenceId, data, user.id);
    }

    @Patch(":itemId")
    updateItem(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("itemId", new ParseUUIDPipe({ version: "4" })) itemId: string,
        @Body() data: UpdateShoppingListItemDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.updateItem(residenceId, itemId, data, user.id);
    }

    @Patch(":itemId/status")
    updateStatus(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("itemId", new ParseUUIDPipe({ version: "4" })) itemId: string,
        @Body() data: UpdateShoppingListStatusDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.updateStatus(residenceId, itemId, data, user.id);
    }

    @Delete(":itemId")
    removeItem(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("itemId", new ParseUUIDPipe({ version: "4" })) itemId: string,
        @Query("version", ParseIntPipe) version: number,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.removeItem(residenceId, itemId, version, user.id);
    }
}

@Controller("shopping-list/personal/items")
@UseGuards(JwtAuthGuard)
export class PersonalShoppingListController {
    constructor(private readonly service: ShoppingListService) {}

    @Get()
    findItems(@CurrentUser() user: { id: string }) {
        return this.service.findPersonalItems(user.id);
    }

    @Post()
    createItem(@Body() data: CreateShoppingListItemDto, @CurrentUser() user: { id: string }) {
        return this.service.createPersonalItem(data, user.id);
    }

    @Patch(":itemId")
    updateItem(
        @Param("itemId", new ParseUUIDPipe({ version: "4" })) itemId: string,
        @Body() data: UpdateShoppingListItemDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.updatePersonalItem(itemId, data, user.id);
    }

    @Patch(":itemId/status")
    updateStatus(
        @Param("itemId", new ParseUUIDPipe({ version: "4" })) itemId: string,
        @Body() data: UpdateShoppingListStatusDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.updatePersonalStatus(itemId, data, user.id);
    }

    @Delete(":itemId")
    removeItem(
        @Param("itemId", new ParseUUIDPipe({ version: "4" })) itemId: string,
        @Query("version", ParseIntPipe) version: number,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.removePersonalItem(itemId, version, user.id);
    }
}
