import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { LineMessagingService } from './line-messaging.service';

@Module({
  providers: [NotificationsService, LineMessagingService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
