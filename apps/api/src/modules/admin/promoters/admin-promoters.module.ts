import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AdminPromotersController } from './admin-promoters.controller';
import { AdminPromotersService } from './admin-promoters.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [AdminPromotersController],
  providers: [AdminPromotersService],
  exports: [AdminPromotersService],
})
export class AdminPromotersModule {}
