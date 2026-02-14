import { Module } from '@nestjs/common';
import { AdminSeedController } from './admin-seed.controller';
import { AdminSeedService } from './admin-seed.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [AdminSeedController],
  providers: [AdminSeedService],
})
export class AdminSeedModule {}
