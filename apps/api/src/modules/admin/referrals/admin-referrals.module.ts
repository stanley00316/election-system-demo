import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminReferralsController } from './admin-referrals.controller';
import { AdminReferralsService } from './admin-referrals.service';
import { ReferralsModule } from '../../referrals/referrals.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';

@Module({
  imports: [
    PrismaModule,
    ReferralsModule,
    // OWASP A07: 透過 AdminAuthModule 匯入 Guards（含 TokenBlacklistService 依賴）
    AdminAuthModule,
    ConfigModule,
  ],
  controllers: [AdminReferralsController],
  providers: [AdminReferralsService],
  exports: [AdminReferralsService],
})
export class AdminReferralsModule {}
