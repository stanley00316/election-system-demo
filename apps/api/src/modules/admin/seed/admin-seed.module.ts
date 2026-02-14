import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminSeedController } from './admin-seed.controller';
import { AdminSeedService } from './admin-seed.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AdminSeedController],
  providers: [AdminSeedService],
})
export class AdminSeedModule {}
