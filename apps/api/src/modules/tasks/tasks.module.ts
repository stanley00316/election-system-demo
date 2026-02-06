import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [ScheduleModule.forRoot(), SubscriptionsModule, ReferralsModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
