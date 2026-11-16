import {
    Controller,
    Get,
    Patch,
    Post,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Req,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth-guard.js";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { UpdateProfileDto } from "./dto/update-profile.dto.js";

@Controller("users")
export class UsersController {
    constructor(private readonly userService: UsersService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll() {
        return this.userService.findAll();
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    getProfile(@CurrentUser() user: { id: string }) {
        return this.userService.getProfile(user.id);
    }

    @Patch("me")
    @UseGuards(JwtAuthGuard)
    updateProfile(@CurrentUser() user: { id: string }, @Body() data: UpdateProfileDto) {
        return this.userService.updateProfile(user.id, data);
    }

    @Post("me/avatar")
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor("photo", { storage: memoryStorage() }))
    uploadAvatar(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
                ],
            })
        )
        file: Express.Multer.File,
        @Req() req: { user: { id: string } }
    ) {
        return this.userService.updateAvatar(req.user.id, file);
    }
}
