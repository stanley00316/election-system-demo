import { Module } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleController } from './google.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GoogleController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class CalendarModule {}
