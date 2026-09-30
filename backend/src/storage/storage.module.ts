import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [StorageService],
  exports: [StorageService]
})
export class StorageModule {}
