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
import { ScheduleStatus, ScheduleItemStatus } from '@prisma/client';
import { SchedulesService } from './schedules.service';
import { GoogleCalendarService } from '../calendar/google-calendar.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { AddScheduleItemDto } from './dto/add-schedule-item.dto';

@ApiTags('schedules')
@Controller('schedules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly campaignsService: CampaignsService,
  ) {}

  @Post()
  @ApiOperation({ summary: '建立行程' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '取得行程列表' })
  async findAll(
    @Query('campaignId') campaignId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.schedulesService.findAll(campaignId, Number(page), Number(limit));
  }

  @Get('date/:date')
  @ApiOperation({ summary: '取得指定日期行程' })
  async findByDate(
    @Query('campaignId') campaignId: string,
    @Param('date') date: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.schedulesService.findByDate(campaignId, date);
  }

  @Get('suggestions')
  @ApiOperation({ summary: '取得拜訪建議' })
  async getSuggestions(
    @Query('campaignId') campaignId: string,
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    await this.campaignsService.checkCampaignAccess(campaignId, userId);
    return this.schedulesService.getSuggestions(
      campaignId,
      { lat: Number(lat), lng: Number(lng) },
      limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '取得行程詳情' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否有權存取該行程
    await this.schedulesService.checkScheduleAccess(id, userId);
    return this.schedulesService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新行程' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(id, userId, dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新行程狀態' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('status') status: ScheduleStatus,
  ) {
    // OWASP A01: 驗證使用者是否有權操作
    await this.schedulesService.checkScheduleAccess(id, userId);
    return this.schedulesService.updateStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除行程' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.schedulesService.delete(id, userId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: '新增行程項目' })
  async addItem(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddScheduleItemDto,
  ) {
    // OWASP A01: 驗證使用者是否有權操作
    await this.schedulesService.checkScheduleAccess(id, userId);
    return this.schedulesService.addItem(id, dto);
  }

  @Put(':id/items/:itemId/status')
  @ApiOperation({ summary: '更新行程項目狀態' })
  async updateItemStatus(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
    @Body('status') status: ScheduleItemStatus,
  ) {
    // OWASP A01: 驗證使用者是否有權操作
    await this.schedulesService.checkScheduleAccess(id, userId);
    return this.schedulesService.updateItemStatus(itemId, status);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: '刪除行程項目' })
  async removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否有權操作
    await this.schedulesService.checkScheduleAccess(id, userId);
    return this.schedulesService.removeItem(itemId);
  }

  @Put(':id/reorder')
  @ApiOperation({ summary: '重新排序行程項目' })
  async reorderItems(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('itemIds') itemIds: string[],
  ) {
    // OWASP A01: 驗證使用者是否有權操作
    await this.schedulesService.checkScheduleAccess(id, userId);
    return this.schedulesService.reorderItems(id, itemIds);
  }

  @Post(':id/optimize')
  @ApiOperation({ summary: '優化行程路徑' })
  async optimizeRoute(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('startLocation') startLocation: { lat: number; lng: number },
  ) {
    // OWASP A01: 驗證使用者是否有權操作
    await this.schedulesService.checkScheduleAccess(id, userId);
    return this.schedulesService.optimizeRoute(id, startLocation);
  }

  // ==================== Google Calendar 同步 ====================

  @Post(':id/sync')
  @ApiOperation({ summary: '同步行程到 Google Calendar' })
  async syncToGoogle(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    // OWASP A01: 驗證使用者是否有權操作
    await this.schedulesService.checkScheduleAccess(id, userId);
    await this.googleCalendarService.syncScheduleToGoogle(id, userId);
    return { success: true, message: '行程已同步到 Google Calendar' };
  }

  @Delete(':id/sync')
  @ApiOperation({ summary: '從 Google Calendar 刪除同步的行程' })
  async unsyncFromGoogle(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    // OWASP A01: 驗證使用者是否有權操作
    await this.schedulesService.checkScheduleAccess(id, userId);
    await this.googleCalendarService.deleteEventFromGoogle(id, userId);
    return { success: true, message: '已從 Google Calendar 移除' };
  }

  @Put(':id/sync-enabled')
  @ApiOperation({ summary: '切換行程同步狀態' })
  async toggleSyncEnabled(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('enabled') enabled: boolean,
  ) {
    // OWASP A01: 驗證使用者是否有權操作
    await this.schedulesService.checkScheduleAccess(id, userId);
    await this.googleCalendarService.toggleSync(id, userId, enabled);
    return { success: true, enabled };
  }
}
