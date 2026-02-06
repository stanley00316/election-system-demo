import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AdminReferralsController } from './admin-referrals.controller';
import { AdminReferralsService } from './admin-referrals.service';
import { ReferralsModule } from '../../referrals/referrals.module';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ReferralsModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [AdminReferralsController],
  providers: [AdminReferralsService],
  exports: [AdminReferralsService],
})
export class AdminReferralsModule {}
