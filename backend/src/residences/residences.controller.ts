import {
    Body,
    Controller,
    Delete,
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
import { UpdateResidenceDto } from "./dto/update-residence.dto.js";
import { UpdateResidencePreferencesDto } from "./dto/update-residence-preferences.dto.js";
import { UpdateMemberAccessDto } from "./dto/update-member-access.dto.js";

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

    @Patch(":residenceId")
    update(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() data: UpdateResidenceDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.residenceAccessService.updateResidenceName(residenceId, user.id, data.name);
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

    @Get(":residenceId/settings/preferences")
    getPreferences(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.residenceAccessService.getPreferences(residenceId, user.id);
    }

    @Patch(":residenceId/settings/preferences")
    updatePreferences(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() data: UpdateResidencePreferencesDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.residenceAccessService.updatePreferences(residenceId, user.id, data);
    }

    @Get(":residenceId/settings/members")
    getSettingsMembers(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.residenceAccessService.listSettingsMembers(residenceId, user.id);
    }

    @Patch(":residenceId/settings/members/:memberId/access")
    updateMemberAccess(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("memberId", new ParseUUIDPipe({ version: "4" })) memberId: string,
        @Body() data: UpdateMemberAccessDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.residenceAccessService.updateMemberAccess(residenceId, memberId, user.id, data);
    }

    @Delete(":residenceId/members/:memberId")
    removeMember(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("memberId", new ParseUUIDPipe({ version: "4" })) memberId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.residenceAccessService.removeMember(residenceId, memberId, user.id);
    }
}
