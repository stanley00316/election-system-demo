import { Module } from '@nestjs/common';
import { AdminPaymentsController } from './admin-payments.controller';
import { AdminPaymentsService } from './admin-payments.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [AdminPaymentsController],
  providers: [AdminPaymentsService],
  exports: [AdminPaymentsService],
})
export class AdminPaymentsModule {}
