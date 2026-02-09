import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AdminPromotersService } from './admin-promoters.service';
import { SuperAdminGuard } from '../../admin-auth/guards/super-admin.guard';
import { PromoterFilterDto } from './dto/promoter-filter.dto';
import {
  CreatePromoterDto,
  UpdatePromoterDto,
  RewardConfigDto,
  TrialConfigDto,
} from './dto/create-promoter.dto';

@Controller('admin/promoters')
@UseGuards(SuperAdminGuard)
export class AdminPromotersController {
  constructor(private readonly service: AdminPromotersService) {}

  // ==================== 推廣者 CRUD ====================

  @Get()
  async getPromoters(@Query() filter: PromoterFilterDto) {
    return this.service.getPromoters({
      type: filter.type,
      status: filter.status,
      search: filter.search,
      startDate: filter.startDate,
      endDate: filter.endDate,
      page: filter.page ? parseInt(filter.page, 10) : 1,
      limit: filter.limit ? parseInt(filter.limit, 10) : 20,
    });
  }

  @Get('stats/overview')
  async getOverviewStats() {
    return this.service.getOverviewStats();
  }

  @Get('stats/funnel')
  async getFunnelStats() {
    return this.service.getFunnelStats();
  }

  @Get('stats/channels')
  async getChannelStats() {
    return this.service.getChannelStats();
  }

  @Get('stats/leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.service.getLeaderboard(limit ? parseInt(limit, 10) : 10);
  }

  @Get('pending')
  async getPendingPromoters() {
    return this.service.getPendingPromoters();
  }

  @Get('trial-invites')
  async getAllTrialInvites(
    @Query('status') status?: string,
    @Query('promoterId') promoterId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getAllTrialInvites({
      status: status as any,
      promoterId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('trial-invites/stats')
  async getTrialStats() {
    return this.service.getTrialStats();
  }

  @Get(':id')
  async getPromoter(@Param('id') id: string) {
    return this.service.getPromoter(id);
  }

  @Post()
  async createPromoter(@Body() dto: CreatePromoterDto, @Request() req: any) {
    return this.service.createPromoter(dto, req.admin.id);
  }

  @Put(':id')
  async updatePromoter(@Param('id') id: string, @Body() dto: UpdatePromoterDto) {
    return this.service.updatePromoter(id, dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approvePromoter(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { rewardConfig?: RewardConfigDto; trialConfig?: TrialConfigDto },
  ) {
    return this.service.approvePromoter(id, req.admin.id, body.rewardConfig, body.trialConfig);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectPromoter(@Param('id') id: string) {
    return this.service.rejectPromoter(id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendPromoter(@Param('id') id: string) {
    return this.service.suspendPromoter(id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activatePromoter(@Param('id') id: string) {
    return this.service.activatePromoter(id);
  }

  // ==================== 獎勵設定 ====================

  @Put(':id/reward-config')
  async updateRewardConfig(@Param('id') id: string, @Body() dto: RewardConfigDto) {
    return this.service.updateRewardConfig(id, dto);
  }

  // ==================== 試用設定 ====================

  @Put(':id/trial-config')
  async updateTrialConfig(@Param('id') id: string, @Body() dto: TrialConfigDto) {
    return this.service.updateTrialConfig(id, dto);
  }

  // ==================== 推廣者子資源 ====================

  @Get(':id/referrals')
  async getPromoterReferrals(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getPromoterReferrals(id, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id/trial-invites')
  async getPromoterTrialInvites(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getPromoterTrialInvites(id, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id/share-links')
  async getPromoterShareLinks(@Param('id') id: string) {
    return this.service.getPromoterShareLinks(id);
  }

  // ==================== 試用管理 ====================

  @Post('trial-invites/:trialId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelTrialInvite(@Param('trialId') trialId: string) {
    return this.service.cancelTrialInvite(trialId);
  }

  @Post('trial-invites/:trialId/extend')
  @HttpCode(HttpStatus.OK)
  async extendTrialInvite(
    @Param('trialId') trialId: string,
    @Body('extraDays') extraDays: number,
  ) {
    return this.service.extendTrialInvite(trialId, extraDays);
  }
}
