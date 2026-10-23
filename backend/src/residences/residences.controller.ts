import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { UpdateResidencePermissionsDto } from "./dto/update-residence-permissions.dto.js";
import { ResidenceAccessService } from "./residence-access.service.js";
import { CreateResidenceDto } from "./dto/create-residence.dto.js";
import { ResidencesService } from "./residences.service.js";

@Controller("residences")
@UseGuards(JwtAuthGuard)
export class ResidencesController {
    constructor(
        private readonly residenceAccessService: ResidenceAccessService,
        private readonly residencesService: ResidencesService
    ) {}

    @Post()
    create(@Body() data: CreateResidenceDto, @CurrentUser() user: { id: string }) {
        return this.residencesService.create(data, user.id);
    }

    @Get()
    list(@CurrentUser() user: { id: string }) {
        return this.residenceAccessService.listForUser(user.id);
    }

    @Get(":residenceId/settings/permissions")
    getPermissions(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.residenceAccessService.getPermissionSettings(residenceId, user.id);
    }

    @Patch(":residenceId/settings/permissions")
    updatePermissions(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() data: UpdateResidencePermissionsDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.residenceAccessService.updatePermissionSettings(
            residenceId,
            user.id,
            data.creationEditPolicy
        );
    }
}
