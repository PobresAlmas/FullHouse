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
import { CreateHouseRuleDto } from "./dto/create-house-rule.dto.js";
import { HouseRulesService } from "./house-rules.service.js";

@Controller("residences/:residenceId/rules")
@UseGuards(JwtAuthGuard)
export class HouseRulesController {
    constructor(private readonly rules: HouseRulesService) {}

    @Get()
    findAll(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.rules.findAll(residenceId, user.id);
    }

    @Post()
    create(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Body() body: CreateHouseRuleDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.rules.create(residenceId, body, user.id);
    }

    @Patch(":ruleId")
    update(
        @Param("residenceId", new ParseUUIDPipe({ version: "4" })) residenceId: string,
        @Param("ruleId", new ParseUUIDPipe({ version: "4" })) ruleId: string,
        @Body() body: CreateHouseRuleDto,
        @CurrentUser() user: { id: string }
    ) {
        return this.rules.update(residenceId, ruleId, body, user.id);
    }
}
