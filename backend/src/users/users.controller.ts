import { Controller, Get, Post, UseGuards, UseInterceptors, UploadedFile, Req, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('users')
export class UsersController {
    constructor(
        private readonly userService: UsersService
    ) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Post("me/avatar")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("photo", { storage: memoryStorage() }))
  uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ })
        ]
      })
    ) file: Express.Multer.File,
    @Req() req: any
  ) {
    return this.userService.updateAvatar(req.user.id, file);
  }
}
