import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { HomeService } from "./home.service.js";

@Controller("home")
@UseGuards(JwtAuthGuard)
export class HomeController {
    constructor(private readonly homeService: HomeService) {}

    @Get("personal")
    getPersonal(@CurrentUser() user: { id: string }) {
        return this.homeService.getPersonal(user.id);
    }
}
