import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { MapsModule } from '../maps/maps.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [CampaignsModule, MapsModule, CalendarModule],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
