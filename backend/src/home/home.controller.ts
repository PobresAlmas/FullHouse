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
import { HomeService } from "./home.service.js";
import { CreateHouseNoticeDto } from "./dto/create-house-notice.dto.js";

@Controller("home")
@UseGuards(JwtAuthGuard)
export class HomeController {
    constructor(private readonly homeService: HomeService) {}

    @Get("personal")
    getPersonal(@CurrentUser() user: { id: string }) {
        return this.homeService.getPersonal(user.id);
    }

    @Get("residences/:residenceId/notices")
    getResidenceNotices(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.homeService.getResidenceNotices(residenceId, user.id);
    }

    @Post("residences/:residenceId/notices")
    createResidenceNotice(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() data: CreateHouseNoticeDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.homeService.createResidenceNotice(residenceId, user.id, data.conteudo);
    }

    @Patch("residences/:residenceId/notices/:noticeId")
    updateResidenceNotice(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("noticeId", new ParseUUIDPipe({ version: "4" })) noticeId: string,
        @Body() data: CreateHouseNoticeDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.homeService.updateResidenceNotice(
            residenceId,
            noticeId,
            user.id,
            data.conteudo
        );
    }

    @Delete("residences/:residenceId/notices/:noticeId")
    deleteResidenceNotice(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("noticeId", new ParseUUIDPipe({ version: "4" })) noticeId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.homeService.deleteResidenceNotice(residenceId, noticeId, user.id);
    }
}
