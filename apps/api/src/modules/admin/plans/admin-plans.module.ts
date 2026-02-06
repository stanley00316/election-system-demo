import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminPlansController } from './admin-plans.controller';
import { AdminPlansService } from './admin-plans.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SuperAdminGuard } from '../../admin-auth/guards/super-admin.guard';
import { AdminGuard } from '../../admin-auth/guards/admin.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AdminPlansController],
  providers: [AdminPlansService, SuperAdminGuard, AdminGuard],
  exports: [AdminPlansService],
})
export class AdminPlansModule {}
