import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EcpayProvider } from './providers/ecpay.provider';
import { NewebpayProvider } from './providers/newebpay.provider';
import { StripeProvider } from './providers/stripe.provider';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    EcpayProvider,
    NewebpayProvider,
    StripeProvider,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
