import { Module } from '@nestjs/common';
import { PromotersController } from './promoters.controller';
import { PromotersService } from './promoters.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [PromotersController],
  providers: [PromotersService],
  exports: [PromotersService],
})
export class PromotersModule {}
