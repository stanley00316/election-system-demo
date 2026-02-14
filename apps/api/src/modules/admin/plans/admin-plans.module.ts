import { Module } from '@nestjs/common';
import { AdminPlansController } from './admin-plans.controller';
import { AdminPlansService } from './admin-plans.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';

@Module({
  imports: [
    PrismaModule,
    // OWASP A07: 透過 AdminAuthModule 匯入 Guards（含 TokenBlacklistService 依賴）
    AdminAuthModule,
  ],
  controllers: [AdminPlansController],
  providers: [AdminPlansService],
  exports: [AdminPlansService],
})
export class AdminPlansModule {}
