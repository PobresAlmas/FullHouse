import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { UserRepository } from './users.repository.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { CommonModule } from '../common/common.module.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [
    PrismaModule,
    CryptoModule,
    CommonModule,
    StorageModule
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserRepository,
  ],
  exports: [UsersService]
})
export class UsersModule {}
