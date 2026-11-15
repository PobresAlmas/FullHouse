import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Express } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { CreateRoomInterestDto } from "./dto/create-room-interest.dto.js";
import { CreateRoomListingDto } from "./dto/create-room-listing.dto.js";
import { MyRoomListingsQueryDto } from "./dto/my-room-listings-query.dto.js";
import { RoomListingQueryDto } from "./dto/room-listing-query.dto.js";
import { UpdateRoomInterestDto } from "./dto/update-room-interest.dto.js";
import { UpdateRoomListingDto } from "./dto/update-room-listing.dto.js";
import { RoomsService } from "./rooms.service.js";

@Controller("rooms/listings")
export class RoomsController {
    constructor(private readonly service: RoomsService) {}

    @Get()
    findMany(@Query() query: RoomListingQueryDto) {
        return this.service.findMany(query);
    }

    @Get("mine")
    @UseGuards(JwtAuthGuard)
    findMine(@CurrentUser() user: { id: string }, @Query() query: MyRoomListingsQueryDto) {
        return this.service.findMine(user.id, query.casaId);
    }

    @Get(":id")
    findById(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
        return this.service.findById(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() data: CreateRoomListingDto, @CurrentUser() user: { id: string }) {
        return this.service.create(data, user.id);
    }

    @Post("photos")
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })
    )
    uploadPhoto(
        @Query("casaId", new ParseUUIDPipe({ version: "4" })) casaId: string,
        @UploadedFile() file: Express.Multer.File | undefined,
        @CurrentUser() user: { id: string }
    ) {
        if (file && file.size > 8 * 1024 * 1024)
            throw new ConflictException("A imagem deve ter até 8 MB.");
        return this.service.uploadPhoto(casaId, file, user.id);
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    update(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @Body() data: UpdateRoomListingDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.update(id, data, user.id);
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @HttpCode(204)
    async remove(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @CurrentUser() user: { id: string }
    ) {
        await this.service.remove(id, user.id);
    }

    @Post(":id/interests")
    @UseGuards(JwtAuthGuard)
    createInterest(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @Body() data: CreateRoomInterestDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.createInterest(id, data, user.id);
    }

    @Get(":id/interests")
    @UseGuards(JwtAuthGuard)
    listInterests(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.listInterests(id, user.id);
    }

    @Patch(":id/interests/:interestId")
    @UseGuards(JwtAuthGuard)
    updateInterest(
        @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
        @Param("interestId", new ParseUUIDPipe({ version: "4" })) interestId: string,
        @Body() data: UpdateRoomInterestDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.service.updateInterest(id, interestId, data, user.id);
    }
}
