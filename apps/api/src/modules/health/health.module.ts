import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [
    // OWASP A07: 透過 AdminAuthModule 匯入 Guards（含 TokenBlacklistService 依賴）
    AdminAuthModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
