import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AdminDataRetentionController } from './admin-data-retention.controller';
import { AdminDataRetentionService } from './admin-data-retention.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';

@Module({
  imports: [
    PrismaModule,
    SubscriptionsModule,
    AdminAuthModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [AdminDataRetentionController],
  providers: [AdminDataRetentionService],
  exports: [AdminDataRetentionService],
})
export class AdminDataRetentionModule {}
