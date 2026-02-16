import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SubscriptionsModule,
    ReferralsModule,
    NotificationsModule,
    PrismaModule,
  ],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
