import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendeeStatus } from '@prisma/client';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: '建立活動' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '查詢活動列表' })
  async findAll(
    @Query('campaignId') campaignId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.eventsService.findAll(campaignId, {
      type: type?.split(','),
      status: status?.split(','),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '取得活動詳情' })
  async findById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新活動' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除活動' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.eventsService.delete(id, userId);
  }

  @Get(':id/attendees')
  @ApiOperation({ summary: '取得活動參加者' })
  async getAttendees(@Param('id') id: string) {
    return this.eventsService.getAttendees(id);
  }

  @Post(':id/attendees')
  @ApiOperation({ summary: '新增參加者' })
  async addAttendee(
    @Param('id') id: string,
    @Body('voterId') voterId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.eventsService.addAttendee(id, voterId, userId);
  }

  @Put(':id/attendees/:voterId/status')
  @ApiOperation({ summary: '更新參加者狀態' })
  async updateAttendeeStatus(
    @Param('id') id: string,
    @Param('voterId') voterId: string,
    @Body('status') status: AttendeeStatus,
  ) {
    return this.eventsService.updateAttendeeStatus(id, voterId, status);
  }

  @Delete(':id/attendees/:voterId')
  @ApiOperation({ summary: '移除參加者' })
  async removeAttendee(
    @Param('id') id: string,
    @Param('voterId') voterId: string,
  ) {
    return this.eventsService.removeAttendee(id, voterId);
  }

  @Post(':id/check-in')
  @ApiOperation({ summary: '簽到' })
  async checkIn(
    @Param('id') id: string,
    @Body('voterId') voterId: string,
  ) {
    return this.eventsService.checkIn(id, voterId);
  }
}
