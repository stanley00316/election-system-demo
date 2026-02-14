import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminPromotersController } from './admin-promoters.controller';
import { AdminPromotersService } from './admin-promoters.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';

@Module({
  imports: [
    PrismaModule,
    // OWASP A07: 透過 AdminAuthModule 匯入 Guards（含 TokenBlacklistService 依賴）
    AdminAuthModule,
    ConfigModule,
  ],
  controllers: [AdminPromotersController],
  providers: [AdminPromotersService],
  exports: [AdminPromotersService],
})
export class AdminPromotersModule {}
