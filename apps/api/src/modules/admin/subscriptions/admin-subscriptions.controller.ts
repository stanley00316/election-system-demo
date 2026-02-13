import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import {
  AdminSubscriptionFilterDto,
  UpdateSubscriptionPlanDto,
  ExtendTrialDto,
  CancelSubscriptionDto,
} from './dto/subscription-filter.dto';
import { AdminGuard } from '../../admin-auth/guards/admin.guard';
import { CurrentAdmin } from '../../admin-auth/decorators/current-admin.decorator';
import { AdminAuthService } from '../../admin-auth/admin-auth.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('admin/subscriptions')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminSubscriptionsController {
  constructor(
    private readonly adminSubscriptionsService: AdminSubscriptionsService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * 取得訂閱列表
   */
  @Get()
  async getSubscriptions(@Query() filter: AdminSubscriptionFilterDto) {
    return this.adminSubscriptionsService.getSubscriptions(filter);
  }

  /**
   * 取得訂閱統計
   */
  @Get('stats')
  async getSubscriptionStats() {
    return this.adminSubscriptionsService.getSubscriptionStats();
  }

  /**
   * 匯出訂閱列表（CSV）
   */
  @Get('export')
  async exportSubscriptions(
    @Query() filter: AdminSubscriptionFilterDto,
    @Res() res: Response,
  ) {
    const data = await this.adminSubscriptionsService.exportSubscriptions(filter);

    const csvRows = [
      data.headers.join(','),
      ...data.rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="subscriptions_${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(csvContent);
  }

  /**
   * 取得所有方案
   */
  @Get('plans')
  async getPlans() {
    return this.adminSubscriptionsService.getPlans();
  }

  /**
   * 取得單一訂閱詳情
   */
  @Get(':id')
  async getSubscriptionById(@Param('id') id: string) {
    return this.adminSubscriptionsService.getSubscriptionById(id);
  }

  /**
   * 變更訂閱方案
   */
  @Put(':id/plan')
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.adminSubscriptionsService.updatePlan(id, dto.planId);

    // 記錄操作
    await this.adminAuthService.logAction(
      admin.id,
      'SUBSCRIPTION_UPDATE_PLAN',
      'SUBSCRIPTION',
      id,
      { newPlanId: dto.planId },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  /**
   * 延長試用期
   */
  @Put(':id/extend-trial')
  async extendTrial(
    @Param('id') id: string,
    @Body() dto: ExtendTrialDto,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.adminSubscriptionsService.extendTrial(id, dto.days);

    // 記錄操作
    await this.adminAuthService.logAction(
      admin.id,
      'SUBSCRIPTION_EXTEND_TRIAL',
      'SUBSCRIPTION',
      id,
      { days: dto.days },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }

  /**
   * 取消訂閱
   */
  @Put(':id/cancel')
  async cancelSubscription(
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
    @CurrentAdmin() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.adminSubscriptionsService.cancelSubscription(
      id,
      dto.reason,
    );

    // 記錄操作
    await this.adminAuthService.logAction(
      admin.id,
      'SUBSCRIPTION_CANCEL',
      'SUBSCRIPTION',
      id,
      { reason: dto.reason },
      req.ip,
      req.headers['user-agent'],
    );

    return result;
  }
}
