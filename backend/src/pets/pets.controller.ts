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
    BadRequestException,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { CreatePetCareLogDto } from "./dto/create-pet-care-log.dto.js";
import { CreatePetDto } from "./dto/create-pet.dto.js";
import { PetCareLogQueryDto } from "./dto/pet-care-log-query.dto.js";
import { PetListQueryDto } from "./dto/pet-list-query.dto.js";
import { UpdatePetCareLogDto } from "./dto/update-pet-care-log.dto.js";
import { UpdatePetDto } from "./dto/update-pet.dto.js";
import { PetsService } from "./pets.service.js";

@Controller()
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PetsController {
    constructor(private readonly petsService: PetsService) {}

    @Get("residences")
    findResidences(@CurrentUser() user: { id: string }) {
        return this.petsService.findResidences(user.id);
    }

    @Get("residences/:residenceId/members")
    findResidenceMembers(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string },
    ) {
        return this.petsService.findResidenceMembers(residenceId, user.id);
    }

    @Get("residences/:residenceId/pets")
    findAll(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Query() query: PetListQueryDto,
        @CurrentUser() user: { id: string },
    ) {
        return this.petsService.findAll(residenceId, user.id, query.search);
    }

    @Post("residences/:residenceId/pets")
    create(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() data: CreatePetDto,
        @CurrentUser() user: { id: string },
    ) {
        return this.petsService.create(residenceId, data, user.id);
    }

    @Get("residences/:residenceId/pets/:petId")
    findOne(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("petId", new ParseUUIDPipe({ version: "4" })) petId: string,
        @CurrentUser() user: { id: string },
    ) {
        return this.petsService.findOne(residenceId, petId, user.id);
    }

    @Patch("residences/:residenceId/pets/:petId")
    update(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("petId", new ParseUUIDPipe({ version: "4" })) petId: string,
        @Body() data: UpdatePetDto,
        @CurrentUser() user: { id: string },
    ) {
        return this.petsService.update(residenceId, petId, data, user.id);
    }

    @Delete("residences/:residenceId/pets/:petId")
    remove(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("petId", new ParseUUIDPipe({ version: "4" })) petId: string,
        @CurrentUser() user: { id: string },
    ) {
        return this.petsService.remove(residenceId, petId, user.id);
    }

    @Get("pets/:petId/care-logs")
    findCareLogs(
        @Param("petId", new ParseUUIDPipe({ version: "4" })) petId: string,
        @Query() query: PetCareLogQueryDto,
        @CurrentUser() user: { id: string },
    ) {
        if (query.from && query.to && query.from > query.to) {
            throw new BadRequestException("A data inicial deve ser anterior ou igual à data final.");
        }
        return this.petsService.findCareLogs(petId, user.id, query);
    }

    @Post("pets/:petId/care-logs")
    createCareLog(
        @Param("petId", new ParseUUIDPipe({ version: "4" })) petId: string,
        @Body() data: CreatePetCareLogDto,
        @CurrentUser() user: { id: string },
    ) {
        return this.petsService.createCareLog(petId, data, user.id);
    }

    @Patch("pets/:petId/care-logs/:careLogId")
    updateCareLog(
        @Param("petId", new ParseUUIDPipe({ version: "4" })) petId: string,
        @Param("careLogId", new ParseUUIDPipe({ version: "4" })) careLogId: string,
        @Body() data: UpdatePetCareLogDto,
        @CurrentUser() user: { id: string },
    ) {
        return this.petsService.updateCareLog(petId, careLogId, data, user.id);
    }

    @Delete("pets/:petId/care-logs/:careLogId")
    removeCareLog(
        @Param("petId", new ParseUUIDPipe({ version: "4" })) petId: string,
        @Param("careLogId", new ParseUUIDPipe({ version: "4" })) careLogId: string,
        @CurrentUser() user: { id: string },
    ) {
        return this.petsService.removeCareLog(petId, careLogId, user.id);
    }
}
